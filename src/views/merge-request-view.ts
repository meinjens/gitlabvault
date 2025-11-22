import { ItemView, WorkspaceLeaf, DropdownComponent } from 'obsidian';
import GitLabPlugin from '../main';
import { MergeRequest } from '../types';

export const VIEW_TYPE_MERGE_REQUESTS = 'gitlab-merge-requests-view';

export class MergeRequestView extends ItemView {
	plugin: GitLabPlugin;
	mergeRequests: MergeRequest[] = [];
	currentState: 'opened' | 'closed' | 'merged' | 'all' = 'opened';

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
		const container = this.containerEl.children[1];
		container.empty();
		container.addClass('gitlab-merge-requests-view');

		const header = container.createDiv({ cls: 'gitlab-mr-header' });
		header.createEl('h2', { text: 'Merge Requests' });

		if (!this.plugin.gitlabClient.isConfigured()) {
			container.createDiv({
				text: 'Bitte konfiguriere die GitLab Einstellungen',
				cls: 'gitlab-warning'
			});
			return;
		}

		const controls = container.createDiv({ cls: 'gitlab-mr-controls' });

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
				this.currentState = value as any;
				await this.loadMergeRequests();
			});

		const refreshButton = controls.createEl('button', { text: 'Aktualisieren' });
		refreshButton.addEventListener('click', async () => {
			await this.loadMergeRequests();
		});

		this.mrListContainer = container.createDiv({ cls: 'gitlab-mr-list' });

		await this.loadMergeRequests();
	}

	private mrListContainer: HTMLElement;

	async loadMergeRequests() {
		if (!this.mrListContainer) return;

		this.mrListContainer.empty();
		this.mrListContainer.createDiv({ text: 'Lade Merge Requests...', cls: 'gitlab-loading' });

		try {
			this.mergeRequests = await this.plugin.gitlabClient.getMergeRequests(this.currentState);
			this.renderMergeRequests();
		} catch {
			this.mrListContainer.empty();
			this.mrListContainer.createDiv({
				text: 'Fehler beim Laden der Merge Requests',
				cls: 'gitlab-error'
			});
		}
	}

	renderMergeRequests() {
		this.mrListContainer.empty();

		if (this.mergeRequests.length === 0) {
			this.mrListContainer.createDiv({
				text: 'Keine Merge Requests gefunden',
				cls: 'gitlab-empty'
			});
			return;
		}

		this.mergeRequests.forEach(mr => {
			const mrItem = this.mrListContainer.createDiv({ cls: 'gitlab-mr-item' });

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

	async onClose() {
		// Cleanup
	}
}
