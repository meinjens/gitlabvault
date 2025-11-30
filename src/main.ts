import { Plugin, WorkspaceLeaf, addIcon, FileSystemAdapter, Notice } from 'obsidian';
import { GitLabSettingTab, GitLabPluginSettings, DEFAULT_SETTINGS } from './settings';
import { GitLabClient } from './gitlab-client';
import { GitManager } from './git-manager';
import { MergeRequestView, VIEW_TYPE_MERGE_REQUESTS } from './views/merge-request-view';
import { GitStatusBar } from './ui/status-bar';
import { CommitMessageModal } from './modals/commit-message-modal';
import { BranchNameModal } from './modals/branch-name-modal';
import { BranchSelectorModal } from './modals/branch-selector-modal';

const GITLAB_ICON = `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path fill="currentColor" d="M23.955 13.587l-1.342-4.135-2.664-8.189a.455.455 0 0 0-.867 0L16.418 9.45H7.582L4.918 1.263a.455.455 0 0 0-.867 0L1.387 9.452.045 13.587a.924.924 0 0 0 .331 1.023L12 23.054l11.624-8.443a.924.924 0 0 0 .331-1.024"/></svg>`;

export default class GitLabPlugin extends Plugin {
	settings: GitLabPluginSettings;
	gitlabClient: GitLabClient;
	gitManager: GitManager;
	statusBar: GitStatusBar;

	async onload() {
		await this.loadSettings();

		addIcon('gitlab', GITLAB_ICON);

		this.initializeClients();

		this.registerView(
			VIEW_TYPE_MERGE_REQUESTS,
			(leaf) => new MergeRequestView(leaf, this)
		);

		this.addRibbonIcon('gitlab', 'GitLab Merge Requests', () => {
			this.activateMergeRequestView();
		});

		this.statusBar = new GitStatusBar(this.addStatusBarItem(), this.gitManager);

		// Update status bar immediately and register interval for periodic updates
		this.statusBar.update();
		this.registerInterval(
			window.setInterval(() => this.statusBar.update(), 10000)
		);

		this.registerCommands();

		this.addSettingTab(new GitLabSettingTab(this.app, this));
	}

	onunload() {
		// Cleanup is handled automatically by registerInterval
	}

	initializeClients() {
		this.gitlabClient = new GitLabClient(
			this.settings.gitlabUrl,
			this.settings.personalAccessToken,
			this.settings.projectId
		);

		if (!(this.app.vault.adapter instanceof FileSystemAdapter)) {
			new Notice('GitLabVault requires a file system vault');
			return;
		}

		const vaultPath = this.app.vault.adapter.getBasePath();
		this.gitManager = new GitManager(vaultPath);
	}

	reinitializeClients() {
		this.initializeClients();
		if (this.statusBar) {
			this.statusBar.updateGitManager(this.gitManager);
		}
	}

	registerCommands() {
		this.addCommand({
			id: 'show-merge-requests',
			name: 'Show Merge Requests',
			callback: () => {
				this.activateMergeRequestView();
			}
		});

		this.addCommand({
			id: 'git-commit',
			name: 'Git: Commit',
			callback: async () => {
				const message = await this.promptForCommitMessage();
				if (message) {
					await this.gitManager.commit(message);
					this.statusBar.update();
				}
			}
		});

		this.addCommand({
			id: 'git-push',
			name: 'Git: Push',
			callback: async () => {
				await this.gitManager.push();
				this.statusBar.update();
			}
		});

		this.addCommand({
			id: 'git-pull',
			name: 'Git: Pull',
			callback: async () => {
				await this.gitManager.pull();
				this.statusBar.update();
			}
		});

		this.addCommand({
			id: 'git-switch-branch',
			name: 'Git: Switch Branch',
			callback: async () => {
				const branches = await this.gitManager.getBranches();
				const currentBranch = await this.gitManager.getCurrentBranch();

				const branchSelector = await this.app.vault.adapter.read('.git/HEAD')
					.then(() => {
						return this.showBranchSelector(branches, currentBranch);
					})
					.catch(() => {
						return null;
					});

				if (branchSelector) {
					await this.gitManager.switchBranch(branchSelector);
					this.statusBar.update();
				}
			}
		});

		this.addCommand({
			id: 'git-create-branch',
			name: 'Git: Create Branch',
			callback: async () => {
				const branchName = await this.promptForBranchName();
				if (branchName) {
					await this.gitManager.createBranch(branchName);
					this.statusBar.update();
				}
			}
		});
	}

	async activateMergeRequestView() {
		const { workspace } = this.app;

		let leaf: WorkspaceLeaf | null = null;
		const leaves = workspace.getLeavesOfType(VIEW_TYPE_MERGE_REQUESTS);

		if (leaves.length > 0) {
			leaf = leaves[0];
		} else {
			leaf = workspace.getRightLeaf(false);
			if (leaf) {
				await leaf.setViewState({
					type: VIEW_TYPE_MERGE_REQUESTS,
					active: true,
				});
			}
		}

		if (leaf) {
			workspace.revealLeaf(leaf);
		}
	}

	async promptForCommitMessage(): Promise<string | null> {
		return new Promise((resolve) => {
			const modal = new CommitMessageModal(this.app, (message) => {
				resolve(message);
			});
			modal.open();
		});
	}

	async promptForBranchName(): Promise<string | null> {
		return new Promise((resolve) => {
			const modal = new BranchNameModal(this.app, (name) => {
				resolve(name);
			});
			modal.open();
		});
	}

	async showBranchSelector(branches: string[], currentBranch: string): Promise<string | null> {
		return new Promise((resolve) => {
			const modal = new BranchSelectorModal(this.app, branches, currentBranch, (branch) => {
				resolve(branch);
			});
			modal.open();
		});
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}
