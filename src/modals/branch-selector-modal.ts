import { Modal, App } from 'obsidian';

export class BranchSelectorModal extends Modal {
	branches: string[];
	currentBranch: string;
	onSubmit: (result: string | null) => void;

	constructor(app: App, branches: string[], currentBranch: string, onSubmit: (result: string | null) => void) {
		super(app);
		this.branches = branches;
		this.currentBranch = currentBranch;
		this.onSubmit = onSubmit;
	}

	onOpen() {
		const { contentEl } = this;

		contentEl.createEl('h2', { text: 'Select Branch' });

		this.branches.forEach(branch => {
			const div = contentEl.createDiv({ cls: 'branch-item' });
			if (branch === this.currentBranch) {
				div.createSpan({ text: '* ' });
			}
			const link = div.createEl('a', { text: branch });
			link.addEventListener('click', () => {
				this.close();
				this.onSubmit(branch);
			});
		});
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}
