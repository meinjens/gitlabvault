import { Command, Notice } from 'obsidian';
import type GitLabPlugin from '../main';

export function createGitCreateBranchCommand(plugin: GitLabPlugin): Command {
	return {
		id: 'git-create-branch',
		name: 'Git: Create Branch',
		callback: async () => {
			try {
				const branchName = await plugin.promptForBranchName();
				if (branchName) {
					await plugin.gitManager.createBranch(branchName);
					plugin.statusBar.update();
				}
			} catch (error) {
				console.error('Git create branch failed:', error);
				new Notice('Branch-Erstellung fehlgeschlagen: ' + (error instanceof Error ? error.message : String(error)));
			}
		}
	};
}
