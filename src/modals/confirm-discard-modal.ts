import { Modal, App, Setting } from 'obsidian';

export class ConfirmDiscardModal extends Modal {
	onSubmit: (confirmed: boolean) => void;

	constructor(app: App, onSubmit: (confirmed: boolean) => void) {
		super(app);
		this.onSubmit = onSubmit;
	}

	onOpen() {
		const { contentEl } = this;

		contentEl.createEl('h2', { text: '⚠️ Warnung' });

		const warningContainer = contentEl.createDiv({ cls: 'gitlabvault-warning' });
		warningContainer.createEl('p', {
			text: 'Du bist dabei, ALLE ungespeicherten Änderungen unwiderruflich zu verwerfen.'
		});
		warningContainer.createEl('p', {
			text: 'Diese Aktion kann NICHT rückgängig gemacht werden!'
		});

		contentEl.createEl('p', {
			text: 'Bist du sicher, dass du fortfahren möchtest?'
		});

		// Confirm button
		new Setting(contentEl)
			.addButton((btn) =>
				btn
					.setButtonText('Änderungen verwerfen')
					.setWarning()
					.onClick(() => {
						this.close();
						this.onSubmit(true);
					})
			)
			.addButton((btn) =>
				btn
					.setButtonText('Abbrechen')
					.onClick(() => {
						this.close();
						this.onSubmit(false);
					})
			);
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}
