import { Modal, App, TextComponent } from 'obsidian';

export class BranchNameModal extends Modal {
	result: string;
	onSubmit: (result: string) => void;

	constructor(app: App, onSubmit: (result: string) => void) {
		super(app);
		this.onSubmit = onSubmit;
	}

	onOpen() {
		const { contentEl } = this;

		contentEl.createEl('h2', { text: 'Branch Name' });

		const textComponent = new TextComponent(contentEl);
		textComponent.inputEl.style.width = '100%';
		textComponent.inputEl.placeholder = 'Enter branch name';
		textComponent.onChange((value) => {
			this.result = value;
		});

		textComponent.inputEl.addEventListener('keydown', (evt: KeyboardEvent) => {
			if (evt.key === 'Enter') {
				evt.preventDefault();
				this.close();
				this.onSubmit(this.result);
			}
		});

		setTimeout(() => textComponent.inputEl.focus(), 10);
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}
