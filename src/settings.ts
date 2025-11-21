import { App, PluginSettingTab, Setting } from 'obsidian';
import GitLabPlugin from './main';

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

	constructor(app: App, plugin: GitLabPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		containerEl.createEl('h2', { text: 'GitLabVault Einstellungen' });

		new Setting(containerEl)
			.setName('GitLab URL')
			.setDesc('Die URL deiner GitLab Instanz (z.B. https://gitlab.com)')
			.addText(text => text
				.setPlaceholder('https://gitlab.com')
				.setValue(this.plugin.settings.gitlabUrl)
				.onChange(async (value) => {
					this.plugin.settings.gitlabUrl = value;
					await this.plugin.saveSettings();
					this.plugin.reinitializeClients();
				}));

		new Setting(containerEl)
			.setName('Personal Access Token')
			.setDesc('Dein GitLab Personal Access Token (mit api und read_repository Scope)')
			.addText(text => {
				text.setPlaceholder('glpat-...')
					.setValue(this.plugin.settings.personalAccessToken)
					.onChange(async (value) => {
						this.plugin.settings.personalAccessToken = value;
						await this.plugin.saveSettings();
						this.plugin.reinitializeClients();
					});
				text.inputEl.type = 'password';
			});

		new Setting(containerEl)
			.setName('Project ID')
			.setDesc('Die ID oder der Pfad des GitLab Projekts (z.B. "username/project" oder "12345")')
			.addText(text => text
				.setPlaceholder('username/project')
				.setValue(this.plugin.settings.projectId)
				.onChange(async (value) => {
					this.plugin.settings.projectId = value;
					await this.plugin.saveSettings();
					this.plugin.reinitializeClients();
				}));

		containerEl.createEl('h3', { text: 'Git Einstellungen' });

		containerEl.createEl('p', {
			text: 'Das Plugin verwendet das Git Repository in deinem Vault Verzeichnis. ' +
				'Stelle sicher, dass du bereits ein Git Repository initialisiert hast.'
		});
	}
}
