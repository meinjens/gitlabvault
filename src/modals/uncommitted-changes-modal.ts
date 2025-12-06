import { Modal, App, Setting } from 'obsidian';

export type UncommittedChangesAction = 'create-mr' | 'commit-push' | 'discard' | 'cancel';

export class UncommittedChangesModal extends Modal {
	onSubmit: (action: UncommittedChangesAction) => void;

	constructor(app: App, onSubmit: (action: UncommittedChangesAction) => void) {
		super(app);
		this.onSubmit = onSubmit;
	}

	onOpen() {
		const { contentEl } = this;

		contentEl.createEl('h2', { text: 'Ungespeicherte Änderungen' });
		contentEl.createEl('p', {
			text: 'Du hast ungespeicherte Änderungen. Was möchtest du damit tun?'
		});

		// Create MR button
		new Setting(contentEl)
			.setName('Neuen Merge Request erstellen')
			.setDesc('Erstellt einen neuen Branch und Merge Request für deine Änderungen')
			.addButton((btn) =>
				btn
					.setButtonText('Neuen MR erstellen')
					.setCta()
					.onClick(() => {
						this.close();
						this.onSubmit('create-mr');
					})
			);

		// Commit & Push button
		new Setting(contentEl)
			.setName('Committen & Pushen')
			.setDesc('Speichert die Änderungen im aktuellen Branch und lädt sie zu GitLab hoch')
			.addButton((btn) =>
				btn
					.setButtonText('Committen & Pushen')
					.setCta()
					.onClick(() => {
						this.close();
						this.onSubmit('commit-push');
					})
			);

		// Discard button
		new Setting(contentEl)
			.setName('Verwerfen')
			.setDesc('Verwirft alle ungespeicherten Änderungen (kann nicht rückgängig gemacht werden)')
			.addButton((btn) =>
				btn
					.setButtonText('Verwerfen')
					.setWarning()
					.onClick(() => {
						this.close();
						this.onSubmit('discard');
					})
			);

		// Cancel button
		new Setting(contentEl)
			.addButton((btn) =>
				btn
					.setButtonText('Abbrechen')
					.onClick(() => {
						this.close();
						this.onSubmit('cancel');
					})
			);
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}
