import { Command, Notice } from 'obsidian';
import type GitLabPlugin from '../main';

export function createGitPushCommand(plugin: GitLabPlugin): Command {
	return {
		id: 'git-push',
		name: 'Git: Push',
		callback: async () => {
			try {
				await plugin.gitManager.push();
				plugin.statusBar.update();
			} catch (error) {
				console.error('Git push failed:', error);
				new Notice('Push fehlgeschlagen: ' + (error instanceof Error ? error.message : String(error)));
			}
		}
	};
}
