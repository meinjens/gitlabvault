import { ItemView, WorkspaceLeaf, DropdownComponent, FileSystemAdapter, Notice } from 'obsidian';
import GitLabPlugin from '../main';
import { MergeRequest, MergeRequestDetails } from '../types';
import { CreateMergeRequestModal } from '../modals/create-merge-request-modal';

export const VIEW_TYPE_MERGE_REQUESTS = 'gitlab-merge-requests-view';

type ViewMode = 'list' | 'detail';

export class MergeRequestView extends ItemView {
	plugin: GitLabPlugin;
	mergeRequests: MergeRequest[] = [];
	currentState: 'opened' | 'closed' | 'merged' | 'all' = 'opened';
	selectedMR: MergeRequestDetails | null = null;
	viewMode: ViewMode = 'list';
	private container: HTMLElement;
	private commitMessageInput: HTMLTextAreaElement;

	constructor(leaf: WorkspaceLeaf, plugin: GitLabPlugin) {
		super(leaf);
		this.plugin = plugin;
	}

	getViewType(): string {
		return VIEW_TYPE_MERGE_REQUESTS;
	}

	getDisplayText(): string {
		return 'GitLab Merge Requests';
	}

	getIcon(): string {
		return 'gitlab';
	}

	async onOpen() {
		this.container = this.containerEl.children[1] as HTMLElement;
		this.container.empty();
		this.container.addClass('gitlab-merge-requests-view');

		if (!this.plugin.gitlabClient.isConfigured()) {
			this.container.createDiv({
				text: 'Bitte konfiguriere die GitLab Einstellungen',
				cls: 'gitlab-warning'
			});
			return;
		}

		this.render();
	}

	render() {
		this.container.empty();

		if (this.viewMode === 'list') {
			this.renderListView();
		} else {
			this.renderDetailView();
		}
	}

	async renderListView() {
		// Git Commands Toolbar
		const toolbar = this.container.createDiv({ cls: 'gitlab-git-toolbar' });

		const commitBtn = toolbar.createEl('button', { cls: 'gitlab-toolbar-button' });
		commitBtn.setAttribute('aria-label', 'Commit');
		commitBtn.setAttribute('title', 'Commit');
		commitBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>';
		commitBtn.addEventListener('click', async () => {
			await this.handleGitCommit();
		});

		const pushBtn = toolbar.createEl('button', { cls: 'gitlab-toolbar-button' });
		pushBtn.setAttribute('aria-label', 'Push');
		pushBtn.setAttribute('title', 'Push');
		pushBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>';
		pushBtn.addEventListener('click', async () => {
			await this.handleGitPush();
		});

		const pullBtn = toolbar.createEl('button', { cls: 'gitlab-toolbar-button' });
		pullBtn.setAttribute('aria-label', 'Pull');
		pullBtn.setAttribute('title', 'Pull');
		pullBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>';
		pullBtn.addEventListener('click', async () => {
			await this.handleGitPull();
		});

		const switchBranchBtn = toolbar.createEl('button', { cls: 'gitlab-toolbar-button' });
		switchBranchBtn.setAttribute('aria-label', 'Branch wechseln');
		switchBranchBtn.setAttribute('title', 'Branch wechseln');
		switchBranchBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="6" y1="3" x2="6" y2="15"></line><circle cx="18" cy="6" r="3"></circle><circle cx="6" cy="18" r="3"></circle><path d="M18 9a9 9 0 0 1-9 9"></path></svg>';
		switchBranchBtn.addEventListener('click', async () => {
			await this.handleSwitchBranch();
		});

		const createBranchBtn = toolbar.createEl('button', { cls: 'gitlab-toolbar-button' });
		createBranchBtn.setAttribute('aria-label', 'Branch erstellen');
		createBranchBtn.setAttribute('title', 'Branch erstellen');
		createBranchBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="6" y1="3" x2="6" y2="15"></line><circle cx="18" cy="6" r="3"></circle><circle cx="6" cy="18" r="3"></circle><path d="M18 9a9 9 0 0 1-9 9"></path><line x1="18" y1="3" x2="18" y2="9"></line></svg>';
		createBranchBtn.addEventListener('click', async () => {
			await this.handleCreateBranch();
		});

		const checkoutMainBtn = toolbar.createEl('button', { cls: 'gitlab-toolbar-button' });
		checkoutMainBtn.setAttribute('aria-label', 'Main Branch auschecken');
		checkoutMainBtn.setAttribute('title', 'Main Branch auschecken');
		checkoutMainBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>';
		checkoutMainBtn.addEventListener('click', async () => {
			await this.handleCheckoutMain();
		});

		// Separator
		this.container.createDiv({ cls: 'gitlab-toolbar-separator' });

		// Header
		const header = this.container.createDiv({ cls: 'gitlab-mr-header' });
		const headerTop = header.createDiv({ cls: 'gitlab-mr-header-top' });
		headerTop.createEl('h2', { text: 'Merge Requests' });

		const createButton = headerTop.createEl('button', {
			text: '+ Neuer Merge Request',
			cls: 'gitlab-create-mr-button'
		});
		createButton.addEventListener('click', () => {
			this.openCreateMRModal();
		});

		const controls = this.container.createDiv({ cls: 'gitlab-mr-controls' });

		const filterContainer = controls.createDiv({ cls: 'gitlab-mr-filter' });
		filterContainer.createSpan({ text: 'Status: ' });

		const dropdown = new DropdownComponent(filterContainer);
		dropdown
			.addOption('opened', 'Offen')
			.addOption('merged', 'Gemergt')
			.addOption('closed', 'Geschlossen')
			.addOption('all', 'Alle')
			.setValue(this.currentState)
			.onChange(async (value) => {
				if (value === 'opened' || value === 'closed' || value === 'merged' || value === 'all') {
					this.currentState = value;
				}
				await this.loadAndRenderMergeRequests();
			});

		const refreshButton = controls.createEl('button', { text: 'Aktualisieren' });
		refreshButton.addEventListener('click', async () => {
			await this.loadAndRenderMergeRequests();
		});

		const mrListContainer = this.container.createDiv({ cls: 'gitlab-mr-list' });

		if (this.mergeRequests.length === 0) {
			await this.loadAndRenderMergeRequests();
		} else {
			this.renderMergeRequests(mrListContainer);
		}
	}

	async loadAndRenderMergeRequests() {
		const mrListContainer = this.container.querySelector('.gitlab-mr-list') as HTMLElement;
		if (!mrListContainer) return;

		mrListContainer.empty();
		mrListContainer.createDiv({ text: 'Lade Merge Requests...', cls: 'gitlab-loading' });

		try {
			this.mergeRequests = await this.plugin.gitlabClient.getMergeRequests(this.currentState);
			this.renderMergeRequests(mrListContainer);
		} catch (error) {
			console.error('Error loading merge requests:', error);
			mrListContainer.empty();
			mrListContainer.createDiv({
				text: 'Fehler beim Laden der Merge Requests',
				cls: 'gitlab-error'
			});
		}
	}

	renderMergeRequests(mrListContainer: HTMLElement) {
		mrListContainer.empty();

		if (this.mergeRequests.length === 0) {
			mrListContainer.createDiv({
				text: 'Keine Merge Requests gefunden',
				cls: 'gitlab-empty'
			});
			return;
		}

		this.mergeRequests.forEach(mr => {
			const mrItem = mrListContainer.createDiv({ cls: 'gitlab-mr-item' });

			mrItem.addEventListener('click', async (e) => {
				if ((e.target as HTMLElement).tagName !== 'A') {
					await this.showMergeRequestDetails(mr.iid);
				}
			});

			const header = mrItem.createDiv({ cls: 'gitlab-mr-item-header' });

			const title = header.createEl('a', {
				text: `!${mr.iid} ${mr.title}`,
				cls: 'gitlab-mr-title',
			});
			title.href = mr.web_url;
			title.target = '_blank';

			const meta = mrItem.createDiv({ cls: 'gitlab-mr-meta' });

			meta.createSpan({
				text: this.getStateText(mr.state),
				cls: `gitlab-mr-state gitlab-mr-state-${mr.state}`
			});

			meta.createSpan({
				text: ` von ${mr.author.name}`,
				cls: 'gitlab-mr-author'
			});

			const branches = mrItem.createDiv({ cls: 'gitlab-mr-branches' });
			branches.createSpan({ text: `${mr.source_branch} → ${mr.target_branch}` });

			if (mr.labels && mr.labels.length > 0) {
				const labels = mrItem.createDiv({ cls: 'gitlab-mr-labels' });
				mr.labels.forEach(label => {
					labels.createSpan({ text: label, cls: 'gitlab-label' });
				});
			}

			const dates = mrItem.createDiv({ cls: 'gitlab-mr-dates' });
			dates.createSpan({
				text: `Erstellt: ${this.formatDate(mr.created_at)}`,
				cls: 'gitlab-mr-date'
			});

			if (mr.merged_at) {
				dates.createSpan({
					text: ` | Gemergt: ${this.formatDate(mr.merged_at)}`,
					cls: 'gitlab-mr-date'
				});
			}
		});
	}

	getStateText(state: string): string {
		switch (state) {
			case 'opened':
				return 'Offen';
			case 'merged':
				return 'Gemergt';
			case 'closed':
				return 'Geschlossen';
			default:
				return state;
		}
	}

	formatDate(dateString: string): string {
		const date = new Date(dateString);
		return date.toLocaleDateString('de-DE', {
			year: 'numeric',
			month: '2-digit',
			day: '2-digit',
			hour: '2-digit',
			minute: '2-digit'
		});
	}

	async showMergeRequestDetails(iid: number) {
		const details = await this.plugin.gitlabClient.getMergeRequestDetails(iid);
		if (details) {
			this.selectedMR = details;
			this.viewMode = 'detail';
			this.render();
		}
	}

	renderDetailView() {
		if (!this.selectedMR) {
			this.viewMode = 'list';
			this.render();
			return;
		}

		const header = this.container.createDiv({ cls: 'gitlab-mr-detail-header' });

		const backButton = header.createEl('button', {
			text: '← Zurück zur Liste',
			cls: 'gitlab-back-button'
		});
		backButton.addEventListener('click', () => {
			this.viewMode = 'list';
			this.selectedMR = null;
			this.render();
		});

		header.createEl('h2', { text: `!${this.selectedMR.iid} ${this.selectedMR.title}` });

		const content = this.container.createDiv({ cls: 'gitlab-mr-detail-content' });

		const metaSection = content.createDiv({ cls: 'gitlab-mr-detail-meta' });
		metaSection.createSpan({
			text: this.getStateText(this.selectedMR.state),
			cls: `gitlab-mr-state gitlab-mr-state-${this.selectedMR.state}`
		});
		metaSection.createSpan({
			text: ` von ${this.selectedMR.author.name}`,
			cls: 'gitlab-mr-author'
		});

		const branchSection = content.createDiv({ cls: 'gitlab-mr-detail-section' });
		branchSection.createEl('h3', { text: 'Branches' });
		const branchInfo = branchSection.createDiv({ cls: 'gitlab-mr-branches' });
		branchInfo.createSpan({ text: `${this.selectedMR.source_branch} → ${this.selectedMR.target_branch}` });

		if (this.selectedMR.state === 'opened') {
			const checkoutButton = branchSection.createEl('button', {
				text: 'Branch auschecken',
				cls: 'gitlab-action-button'
			});
			checkoutButton.addEventListener('click', async () => {
				await this.handleCheckout();
			});
		}

		if (this.selectedMR.description) {
			const descSection = content.createDiv({ cls: 'gitlab-mr-detail-section' });
			descSection.createEl('h3', { text: 'Beschreibung' });
			const descContent = descSection.createDiv({ cls: 'gitlab-mr-description' });
			// Safely render description by creating text nodes and line breaks
			const lines = this.selectedMR.description.split('\n');
			lines.forEach((line, index) => {
				descContent.createSpan({ text: line });
				if (index < lines.length - 1) {
					descContent.createEl('br');
				}
			});
		}

		if (this.selectedMR.commits && this.selectedMR.commits.length > 0) {
			const commitsSection = content.createDiv({ cls: 'gitlab-mr-detail-section' });
			commitsSection.createEl('h3', { text: `Commits (${this.selectedMR.commits.length})` });
			const commitsList = commitsSection.createDiv({ cls: 'gitlab-commits-list' });

			this.selectedMR.commits.forEach(commit => {
				const commitItem = commitsList.createDiv({ cls: 'gitlab-commit-item' });
				commitItem.createDiv({
					text: commit.title,
					cls: 'gitlab-commit-title'
				});
				const commitMeta = commitItem.createDiv({ cls: 'gitlab-commit-meta' });
				commitMeta.createSpan({
					text: `${commit.short_id} • ${commit.author_name} • ${this.formatDate(commit.created_at)}`,
					cls: 'gitlab-commit-info'
				});
			});
		}

		if (this.selectedMR.approvals) {
			const approvalsSection = content.createDiv({ cls: 'gitlab-mr-detail-section' });
			approvalsSection.createEl('h3', { text: 'Approvals' });

			const approvalStatus = approvalsSection.createDiv({ cls: 'gitlab-approval-status' });
			const statusText = this.selectedMR.approvals.approved
				? '✓ Approved'
				: `${this.selectedMR.approvals.approvals_left} Approval(s) benötigt`;
			approvalStatus.createSpan({
				text: statusText,
				cls: this.selectedMR.approvals.approved ? 'gitlab-approval-approved' : 'gitlab-approval-pending'
			});

			if (this.selectedMR.approvals.approved_by.length > 0) {
				const approversList = approvalsSection.createDiv({ cls: 'gitlab-approvers-list' });
				this.selectedMR.approvals.approved_by.forEach(approval => {
					approversList.createSpan({
						text: approval.user.name,
						cls: 'gitlab-approver'
					});
				});
			}
		}

		if (this.selectedMR.state === 'opened') {
			const commitSection = content.createDiv({ cls: 'gitlab-mr-detail-section gitlab-commit-section' });
			commitSection.createEl('h3', { text: 'Neuen Commit erstellen' });

			const inputContainer = commitSection.createDiv({ cls: 'gitlab-commit-input-container' });
			inputContainer.createEl('label', { text: 'Commit Message:' });

			this.commitMessageInput = inputContainer.createEl('textarea', {
				cls: 'gitlab-commit-message-input',
				placeholder: 'Commit-Message eingeben...',
			});
			this.commitMessageInput.rows = 3;

			const buttonContainer = commitSection.createDiv({ cls: 'gitlab-commit-button-container' });

			const commitButton = buttonContainer.createEl('button', {
				text: 'Commit erstellen und pushen',
				cls: 'gitlab-commit-button'
			});
			commitButton.addEventListener('click', async () => {
				await this.handleCommit();
			});
		}
	}

	async handleCheckout() {
		if (!this.selectedMR) return;

		const adapter = this.app.vault.adapter;
		if (!(adapter instanceof FileSystemAdapter)) {
			new Notice('This operation requires a file system vault');
			return;
		}

		try {
			// Ensure .gitignore is correct (workspace.json and data.json excluded)
			await this.plugin.gitManager.ensureGitignore();

			// Handle uncommitted changes
			const shouldContinue = await this.plugin.handleUncommittedChanges();

			if (!shouldContinue) {
				return;
			}

			// Now checkout the MR branch
			const workspacePath = adapter.getBasePath();
			await this.plugin.gitlabClient.checkoutMergeRequest(this.selectedMR, workspacePath);
			this.plugin.statusBar.update();
		} catch (error) {
			console.error('Failed to checkout MR:', error);
			new Notice('Fehler beim Checkout des MR: ' + (error instanceof Error ? error.message : String(error)));
		}
	}

	async handleCheckoutMain() {
		try {
			await this.plugin.handleBranchSwitch('main');
		} catch (error) {
			console.error('Failed to checkout main:', error);
			new Notice('Fehler beim Wechsel zum main Branch: ' + (error instanceof Error ? error.message : String(error)));
		}
	}

	async handleGitCommit() {
		try {
			const isRepo = await this.plugin.gitManager.isRepository();
			if (!isRepo) {
				new Notice('Kein Git Repository gefunden');
				return;
			}

			const message = await this.plugin.promptForCommitMessage();
			if (message) {
				await this.plugin.gitManager.commit(message);
				this.plugin.statusBar.update();
			}
		} catch (error) {
			console.error('Git commit failed:', error);
			new Notice('Commit fehlgeschlagen: ' + (error instanceof Error ? error.message : String(error)));
		}
	}

	async handleGitPush() {
		try {
			const isRepo = await this.plugin.gitManager.isRepository();
			if (!isRepo) {
				new Notice('Kein Git Repository gefunden');
				return;
			}

			await this.plugin.gitManager.push();
			this.plugin.statusBar.update();
		} catch (error) {
			console.error('Git push failed:', error);
			new Notice('Push fehlgeschlagen: ' + (error instanceof Error ? error.message : String(error)));
		}
	}

	async handleGitPull() {
		try {
			const isRepo = await this.plugin.gitManager.isRepository();
			if (!isRepo) {
				new Notice('Kein Git Repository gefunden');
				return;
			}

			await this.plugin.gitManager.pull();
			this.plugin.statusBar.update();
		} catch (error) {
			console.error('Git pull failed:', error);
			new Notice('Pull fehlgeschlagen: ' + (error instanceof Error ? error.message : String(error)));
		}
	}

	async handleSwitchBranch() {
		try {
			const branches = await this.plugin.gitManager.getBranches();
			const currentBranch = await this.plugin.gitManager.getCurrentBranch();

			const isRepo = await this.plugin.gitManager.isRepository();
			if (!isRepo) {
				new Notice('Kein Git Repository gefunden');
				return;
			}

			const branchSelector = await this.plugin.showBranchSelector(branches, currentBranch);

			if (branchSelector) {
				await this.plugin.gitManager.switchBranch(branchSelector);
				this.plugin.statusBar.update();
			}
		} catch (error) {
			console.error('Git switch branch failed:', error);
			new Notice('Branch-Wechsel fehlgeschlagen: ' + (error instanceof Error ? error.message : String(error)));
		}
	}

	async handleCreateBranch() {
		try {
			const isRepo = await this.plugin.gitManager.isRepository();
			if (!isRepo) {
				new Notice('Kein Git Repository gefunden');
				return;
			}

			const branchName = await this.plugin.promptForBranchName();
			if (branchName) {
				await this.plugin.gitManager.createBranch(branchName);
				this.plugin.statusBar.update();
			}
		} catch (error) {
			console.error('Git create branch failed:', error);
			new Notice('Branch-Erstellung fehlgeschlagen: ' + (error instanceof Error ? error.message : String(error)));
		}
	}

	openCreateMRModal() {
		new CreateMergeRequestModal(
			this.app,
			this.plugin,
			async (title: string, description: string, branchName: string, targetBranch: string) => {
				await this.handleCreateMergeRequest(title, description, branchName, targetBranch);
			}
		).open();
	}

	async handleCreateMergeRequest(
		title: string,
		description: string,
		branchName: string,
		targetBranch: string
	) {
		const adapter = this.app.vault.adapter;
		if (!(adapter instanceof FileSystemAdapter)) {
			new Notice('This operation requires a file system vault');
			return;
		}

		const workspacePath = adapter.getBasePath();

		// 1. Create and checkout new branch
		const branchCreated = await this.plugin.gitlabClient.createBranchAndCheckout(
			branchName,
			workspacePath
		);

		if (!branchCreated) {
			return;
		}

		// 2. Create merge request in GitLab
		const mr = await this.plugin.gitlabClient.createMergeRequest(
			branchName,
			targetBranch,
			title,
			description
		);

		if (mr) {
			// Reload the list to show the new MR
			this.mergeRequests = [];
			this.render();
		}
	}

	async handleCommit() {
		if (!this.selectedMR) return;

		const commitMessage = this.commitMessageInput.value.trim();

		if (!commitMessage) {
			new Notice('Commit message is required');
			return;
		}

		const adapter = this.app.vault.adapter;
		if (!(adapter instanceof FileSystemAdapter)) {
			new Notice('This operation requires a file system vault');
			return;
		}

		const workspacePath = adapter.getBasePath();
		const success = await this.plugin.gitlabClient.createCommitAndPush(
			commitMessage,
			workspacePath
		);

		if (success) {
			// Clear the input
			this.commitMessageInput.value = '';

			// Reload MR details to show the new commit
			const details = await this.plugin.gitlabClient.getMergeRequestDetails(this.selectedMR.iid);
			if (details) {
				this.selectedMR = details;
				this.render();
			}
		}
	}

	async onClose() {
		// Cleanup DOM elements
		this.container.empty();
	}
}
