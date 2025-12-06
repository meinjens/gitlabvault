import { GitManager } from '../git-manager';

export class GitignoreStatusBar {
	private statusBarItem: HTMLElement;
	private gitManager: GitManager;
	private onFixClick: () => void;

	constructor(statusBarItem: HTMLElement, gitManager: GitManager, onFixClick: () => void) {
		this.statusBarItem = statusBarItem;
		this.gitManager = gitManager;
		this.onFixClick = onFixClick;

		// Make it clickable
		this.statusBarItem.addClass('mod-clickable');
		this.statusBarItem.addEventListener('click', () => {
			this.onFixClick();
		});
	}

	updateGitManager(gitManager: GitManager) {
		this.gitManager = gitManager;
		this.update();
	}

	async update() {
		try {
			const isRepo = await this.gitManager.isRepository();
			if (!isRepo) {
				this.statusBarItem.setText('');
				this.statusBarItem.style.display = 'none';
				return;
			}

			const gitignoreStatus = await this.gitManager.checkGitignore();
			this.render(gitignoreStatus);
		} catch (error) {
			console.error('Failed to update gitignore status:', error);
			this.statusBarItem.setText('');
			this.statusBarItem.style.display = 'none';
		}
	}

	render(gitignoreStatus: { exists: boolean; hasWorkspaceJson: boolean; hasDataJson: boolean }) {
		const needsFix = !gitignoreStatus.exists || !gitignoreStatus.hasWorkspaceJson || !gitignoreStatus.hasDataJson;

		if (needsFix) {
			// Show red warning icon
			this.statusBarItem.setText('⚠ .gitignore');
			this.statusBarItem.style.color = '#ff6b6b';
			this.statusBarItem.style.display = '';

			const issues = [];
			if (!gitignoreStatus.exists) {
				issues.push('.gitignore fehlt');
			} else {
				if (!gitignoreStatus.hasWorkspaceJson) {
					issues.push('workspace.json nicht ausgeschlossen');
				}
				if (!gitignoreStatus.hasDataJson) {
					issues.push('data.json nicht ausgeschlossen');
				}
			}

			this.statusBarItem.title = `⚠ .gitignore Warnung\n\n${issues.join('\n')}\n\nKlicke um zu reparieren`;
		} else {
			// Show green checkmark icon
			this.statusBarItem.setText('✓ .gitignore');
			this.statusBarItem.style.color = '#4ade80';
			this.statusBarItem.style.display = '';
			this.statusBarItem.title = '.gitignore korrekt konfiguriert\n\nworkspace.json und data.json sind ausgeschlossen';
		}
	}
}
