import { App, PluginSettingTab, Setting } from 'obsidian';
import type GitLabPlugin from './main';

export interface GitLabPluginSettings {
	gitlabUrl: string;
	personalAccessToken: string;
	projectId: string;
}

export const DEFAULT_SETTINGS: GitLabPluginSettings = {
	gitlabUrl: 'https://gitlab.com',
	personalAccessToken: '',
	projectId: '',
};

export class GitLabSettingTab extends PluginSettingTab {
	plugin: GitLabPlugin;
	private saveTimeout: number | null = null;

	constructor(app: App, plugin: GitLabPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	private debouncedSaveAndReinit(callback?: () => void) {
		if (this.saveTimeout) {
			window.clearTimeout(this.saveTimeout);
		}
		this.saveTimeout = window.setTimeout(async () => {
			await this.plugin.saveSettings();
			this.plugin.reinitializeClients();
			if (callback) {
				callback();
			}
			this.saveTimeout = null;
		}, 500);
	}

	hide(): void {
		// Clear pending save timeout when tab is closed
		if (this.saveTimeout) {
			window.clearTimeout(this.saveTimeout);
			this.saveTimeout = null;
		}
		super.hide();
	}

	async display(): Promise<void> {
		const { containerEl } = this;

		containerEl.empty();

		containerEl.createEl('h2', { text: 'GitLabVault Einstellungen' });

		// Check .gitignore
		await this.checkGitignoreStatus(containerEl);

		new Setting(containerEl)
			.setName('GitLab URL')
			.setDesc('Die URL deiner GitLab Instanz (z.B. https://gitlab.com)')
			.addText(text => text
				.setPlaceholder('https://gitlab.com')
				.setValue(this.plugin.settings.gitlabUrl)
				.onChange((value) => {
					this.plugin.settings.gitlabUrl = value;
					this.debouncedSaveAndReinit();
				}));

		new Setting(containerEl)
			.setName('Personal Access Token')
			.setDesc('Dein GitLab Personal Access Token (mit api und read_repository Scope)')
			.addText(text => {
				text.setPlaceholder('glpat-...')
					.setValue(this.plugin.settings.personalAccessToken)
					.onChange((value) => {
						this.plugin.settings.personalAccessToken = value;
						this.debouncedSaveAndReinit();
					});
				text.inputEl.type = 'password';
			});

		new Setting(containerEl)
			.setName('Project ID')
			.setDesc('Die ID oder der Pfad des GitLab Projekts (z.B. "username/project" oder "12345")')
			.addText(text => text
				.setPlaceholder('username/project')
				.setValue(this.plugin.settings.projectId)
				.onChange((value) => {
					this.plugin.settings.projectId = value;
					this.debouncedSaveAndReinit();
				}));

		containerEl.createEl('h3', { text: 'Git Einstellungen' });

		containerEl.createEl('p', {
			text: 'Das Plugin verwendet das Git Repository in deinem Vault Verzeichnis. ' +
				'Stelle sicher, dass du bereits ein Git Repository initialisiert hast.'
		});
	}

	async checkGitignoreStatus(containerEl: HTMLElement): Promise<void> {
		if (!this.plugin.gitManager) {
			return;
		}

		const status = await this.plugin.gitManager.checkGitignore();

		if (!status.hasWorkspaceJson) {
			const warningDiv = containerEl.createDiv({ cls: 'gitlabvault-warning' });

			warningDiv.createEl('h3', {
				text: '⚠️ .gitignore Warnung',
				cls: 'gitlabvault-warning-title'
			});

			warningDiv.createEl('p', {
				text: 'Die Datei .obsidian/workspace.json sollte in der .gitignore stehen, ' +
					  'da sie persönliche Workspace-Einstellungen enthält und nicht ins Repository sollte.',
			});

			const buttonContainer = warningDiv.createDiv({ cls: 'gitlabvault-warning-actions' });

			const fixButton = buttonContainer.createEl('button', {
				text: '.gitignore automatisch aktualisieren',
				cls: 'mod-cta'
			});

			fixButton.addEventListener('click', async () => {
				try {
					await this.plugin.gitManager.addToGitignore('.obsidian/workspace.json');
					this.display(); // Refresh display
				} catch (error) {
					console.error('Failed to update .gitignore:', error);
				}
			});

			const ignoreButton = buttonContainer.createEl('button', {
				text: 'Später',
			});

			ignoreButton.addEventListener('click', () => {
				warningDiv.remove();
			});
		}
	}
}
