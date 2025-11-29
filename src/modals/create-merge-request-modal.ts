import { App, Modal, Setting } from 'obsidian';
import GitLabPlugin from '../main';

export class CreateMergeRequestModal extends Modal {
	plugin: GitLabPlugin;
	title: string = '';
	description: string = '';
	branchName: string = '';
	targetBranch: string = 'main';
	branchInput: HTMLInputElement | null = null;
	onSubmit: (title: string, description: string, branchName: string, targetBranch: string) => void;

	constructor(app: App, plugin: GitLabPlugin, onSubmit: (title: string, description: string, branchName: string, targetBranch: string) => void) {
		super(app);
		this.plugin = plugin;
		this.onSubmit = onSubmit;
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.empty();

		contentEl.createEl('h2', { text: 'Neuen Merge Request erstellen' });

		new Setting(contentEl)
			.setName('Titel')
			.setDesc('Titel des Merge Request')
			.addText(text => text
				.setPlaceholder('z.B. Fix authentication bug')
				.setValue(this.title)
				.onChange(async (value) => {
					this.title = value;
					// Auto-generate branch name from title
					if (!this.branchName || this.branchName === this.slugify(this.title)) {
						this.branchName = this.slugify(value);
						this.updateBranchNameInput();
					}
				})
			);

		new Setting(contentEl)
			.setName('Beschreibung')
			.setDesc('Beschreibung des Merge Request (optional)')
			.addTextArea(text => {
				text
					.setPlaceholder('Detaillierte Beschreibung...')
					.setValue(this.description)
					.onChange(async (value) => {
						this.description = value;
					});
				text.inputEl.rows = 6;
				text.inputEl.style.width = '100%';
				return text;
			});

		const branchSetting = new Setting(contentEl)
			.setName('Branch-Name')
			.setDesc('Name des neuen Branches');

		branchSetting.addText(text => {
			this.branchInput = text.inputEl;
			text
				.setPlaceholder('feature/my-branch')
				.setValue(this.branchName)
				.onChange(async (value) => {
					this.branchName = value;
				});
			return text;
		});

		new Setting(contentEl)
			.setName('Target Branch')
			.setDesc('Branch in den gemergt werden soll')
			.addText(text => text
				.setPlaceholder('main')
				.setValue(this.targetBranch)
				.onChange(async (value) => {
					this.targetBranch = value;
				})
			);

		new Setting(contentEl)
			.addButton(btn => btn
				.setButtonText('Abbrechen')
				.onClick(() => {
					this.close();
				})
			)
			.addButton(btn => btn
				.setButtonText('Merge Request erstellen')
				.setCta()
				.onClick(async () => {
					if (!this.title) {
						// Show error
						return;
					}
					if (!this.branchName) {
						this.branchName = this.slugify(this.title);
					}
					this.onSubmit(this.title, this.description, this.branchName, this.targetBranch);
					this.close();
				})
			);
	}

	private updateBranchNameInput() {
		if (this.branchInput) {
			this.branchInput.value = this.branchName;
		}
	}

	private slugify(text: string): string {
		return text
			.toLowerCase()
			.trim()
			.replace(/[^\w\s-]/g, '')
			.replace(/[\s_-]+/g, '-')
			.replace(/^-+|-+$/g, '');
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}
