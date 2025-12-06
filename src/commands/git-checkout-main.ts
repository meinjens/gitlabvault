import { Command, Notice } from 'obsidian';
import type GitLabPlugin from '../main';

export function createGitCheckoutMainCommand(plugin: GitLabPlugin): Command {
	return {
		id: 'git-checkout-main',
		name: 'Git: Checkout Main',
		callback: async () => {
			try {
				const isRepo = await plugin.gitManager.isRepository();
				if (!isRepo) {
					new Notice('Kein Git Repository gefunden');
					return;
				}

				await plugin.handleBranchSwitch('main');
			} catch (error) {
				console.error('Git checkout main failed:', error);
				new Notice('Fehler beim Wechsel zum main Branch: ' + (error instanceof Error ? error.message : String(error)));
			}
		}
	};
}
