import { Command, Notice } from 'obsidian';
import type GitLabPlugin from '../main';

export function createGitPullCommand(plugin: GitLabPlugin): Command {
	return {
		id: 'git-pull',
		name: 'Git: Pull',
		callback: async () => {
			try {
				await plugin.gitManager.pull();
				plugin.statusBar.update();
			} catch (error) {
				console.error('Git pull failed:', error);
				new Notice('Pull fehlgeschlagen: ' + (error instanceof Error ? error.message : String(error)));
			}
		}
	};
}
