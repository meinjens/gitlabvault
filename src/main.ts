import { Plugin, WorkspaceLeaf, addIcon, FileSystemAdapter, Notice } from 'obsidian';
import { GitLabSettingTab, GitLabPluginSettings, DEFAULT_SETTINGS } from './settings';
import { GitLabClient } from './gitlab-client';
import { GitManager } from './git-manager';
import { MergeRequestView, VIEW_TYPE_MERGE_REQUESTS } from './views/merge-request-view';
import { GitStatusBar } from './ui/status-bar';
import { GitignoreStatusBar } from './ui/gitignore-status-bar';
import { CommitMessageModal } from './modals/commit-message-modal';
import { BranchNameModal } from './modals/branch-name-modal';
import { BranchSelectorModal } from './modals/branch-selector-modal';
import { UncommittedChangesModal, UncommittedChangesAction } from './modals/uncommitted-changes-modal';
import { CreateMergeRequestModal } from './modals/create-merge-request-modal';
import { registerAllCommands } from './commands';

const GITLAB_ICON = `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path fill="currentColor" d="M23.955 13.587l-1.342-4.135-2.664-8.189a.455.455 0 0 0-.867 0L16.418 9.45H7.582L4.918 1.263a.455.455 0 0 0-.867 0L1.387 9.452.045 13.587a.924.924 0 0 0 .331 1.023L12 23.054l11.624-8.443a.924.924 0 0 0 .331-1.024"/></svg>`;

export default class GitLabPlugin extends Plugin {
	settings: GitLabPluginSettings;
	gitlabClient: GitLabClient;
	gitManager: GitManager;
	statusBar: GitStatusBar;
	gitignoreStatusBar: GitignoreStatusBar;

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
		this.gitignoreStatusBar = new GitignoreStatusBar(
			this.addStatusBarItem(),
			this.gitManager,
			async () => {
				await this.fixGitignore();
			}
		);

		// Update status bars immediately and register interval for periodic updates
		this.statusBar.update();
		this.gitignoreStatusBar.update();
		this.registerInterval(
			window.setInterval(() => {
				this.statusBar.update();
				this.gitignoreStatusBar.update();
			}, 10000)
		);

		registerAllCommands(this);

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
		if (this.gitignoreStatusBar) {
			this.gitignoreStatusBar.updateGitManager(this.gitManager);
		}
	}

	async fixGitignore() {
		try {
			await this.gitManager.ensureGitignore();
			this.gitignoreStatusBar.update();
			this.statusBar.update();
		} catch (error) {
			console.error('Failed to fix .gitignore:', error);
			new Notice('Fehler beim Reparieren der .gitignore');
		}
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

	async promptForUncommittedChangesAction(): Promise<UncommittedChangesAction> {
		return new Promise((resolve) => {
			const modal = new UncommittedChangesModal(this.app, (action) => {
				resolve(action);
			});
			modal.open();
		});
	}

	async promptForMergeRequestDetails(): Promise<{ title: string; description: string; branchName: string; targetBranch: string } | null> {
		return new Promise((resolve) => {
			const modal = new CreateMergeRequestModal(this.app, this, (title: string, description: string, branchName: string, targetBranch: string) => {
				if (title && branchName && targetBranch) {
					resolve({ title, description, branchName, targetBranch });
				} else {
					resolve(null);
				}
			});
			modal.open();
		});
	}

	async handleBranchSwitch(targetBranch: string): Promise<boolean> {
		try {
			// Ensure .gitignore is correct (workspace.json and data.json excluded)
			await this.gitManager.ensureGitignore();

			// Check for uncommitted changes
			const hasChanges = await this.gitManager.hasUncommittedChanges();

			if (!hasChanges) {
				// No changes, switch directly
				await this.gitManager.switchBranch(targetBranch);
				this.statusBar.update();
				return true;
			}

			// Ask user what to do with uncommitted changes
			const action = await this.promptForUncommittedChangesAction();

			if (action === 'cancel') {
				return false;
			}

			if (action === 'discard') {
				await this.gitManager.discardChanges();
				await this.gitManager.switchBranch(targetBranch);
				this.statusBar.update();
				return true;
			}

			if (action === 'commit-push') {
				const message = await this.promptForCommitMessage();
				if (!message) {
					new Notice('Branch-Wechsel abgebrochen');
					return false;
				}
				await this.gitManager.commitAndPush(message);
				await this.gitManager.switchBranch(targetBranch);
				this.statusBar.update();
				return true;
			}

			if (action === 'create-mr') {
				const mrDetails = await this.promptForMergeRequestDetails();
				if (!mrDetails) {
					new Notice('Branch-Wechsel abgebrochen');
					return false;
				}

				const vaultPath = (this.app.vault.adapter as FileSystemAdapter).getBasePath();
				const commitMessage = mrDetails.title;

				await this.gitlabClient.createMergeRequestFromUncommittedChanges(
					mrDetails.branchName,
					mrDetails.title,
					mrDetails.description,
					commitMessage,
					mrDetails.targetBranch,
					vaultPath
				);

				// After creating MR, switch to target branch
				await this.gitManager.switchBranch(targetBranch);
				this.statusBar.update();

				// Refresh MR view if open
				const leaves = this.app.workspace.getLeavesOfType(VIEW_TYPE_MERGE_REQUESTS);
				if (leaves.length > 0) {
					const view = leaves[0].view as MergeRequestView;
					await view.loadAndRenderMergeRequests();
				}

				return true;
			}

			return false;
		} catch (error) {
			console.error('Failed to handle branch switch:', error);
			new Notice('Fehler beim Branch-Wechsel');
			return false;
		}
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}
