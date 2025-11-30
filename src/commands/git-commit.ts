import { Command, Notice } from 'obsidian';
import type GitLabPlugin from '../main';

export function createGitCommitCommand(plugin: GitLabPlugin): Command {
	return {
		id: 'git-commit',
		name: 'Git: Commit',
		callback: async () => {
			try {
				const message = await plugin.promptForCommitMessage();
				if (message) {
					await plugin.gitManager.commit(message);
					plugin.statusBar.update();
				}
			} catch (error) {
				console.error('Git commit failed:', error);
				new Notice('Commit fehlgeschlagen: ' + (error instanceof Error ? error.message : String(error)));
			}
		}
	};
}
