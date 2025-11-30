import { Command, Notice } from 'obsidian';
import type GitLabPlugin from '../main';

export function createGitSwitchBranchCommand(plugin: GitLabPlugin): Command {
	return {
		id: 'git-switch-branch',
		name: 'Git: Switch Branch',
		callback: async () => {
			try {
				const branches = await plugin.gitManager.getBranches();
				const currentBranch = await plugin.gitManager.getCurrentBranch();

				const isRepo = await plugin.gitManager.isRepository();
				if (!isRepo) {
					new Notice('Kein Git Repository gefunden');
					return;
				}

				const branchSelector = await plugin.showBranchSelector(branches, currentBranch);

				if (branchSelector) {
					await plugin.gitManager.switchBranch(branchSelector);
					plugin.statusBar.update();
				}
			} catch (error) {
				console.error('Git switch branch failed:', error);
				new Notice('Branch-Wechsel fehlgeschlagen: ' + (error instanceof Error ? error.message : String(error)));
			}
		}
	};
}
