import { GitManager } from '../git-manager';
import { GitStatus } from '../types';

export class GitStatusBar {
	private statusBarItem: HTMLElement;
	private gitManager: GitManager;
	private interval: number | null = null;

	constructor(statusBarItem: HTMLElement, gitManager: GitManager) {
		this.statusBarItem = statusBarItem;
		this.gitManager = gitManager;
	}

	updateGitManager(gitManager: GitManager) {
		this.gitManager = gitManager;
		this.update();
	}

	start() {
		this.update();
		this.interval = window.setInterval(() => {
			this.update();
		}, 10000); // Update every 10 seconds
	}

	stop() {
		if (this.interval) {
			window.clearInterval(this.interval);
			this.interval = null;
		}
	}

	async update() {
		try {
			const isRepo = await this.gitManager.isRepository();
			if (!isRepo) {
				this.statusBarItem.setText('');
				return;
			}

			const status = await this.gitManager.getStatus();
			this.render(status);
		} catch (error) {
			console.error('Failed to update git status:', error);
			this.statusBarItem.setText('Git: Error');
		}
	}

	render(status: GitStatus) {
		const parts: string[] = [];

		parts.push(`⎇ ${status.branch}`);

		if (status.tracking) {
			if (status.ahead > 0 || status.behind > 0) {
				const sync = [];
				if (status.ahead > 0) sync.push(`↑${status.ahead}`);
				if (status.behind > 0) sync.push(`↓${status.behind}`);
				parts.push(sync.join(' '));
			}
		}

		if (!status.isClean) {
			const changes = [];
			if (status.modified > 0) changes.push(`~${status.modified}`);
			if (status.created > 0) changes.push(`+${status.created}`);
			if (status.deleted > 0) changes.push(`-${status.deleted}`);
			if (changes.length > 0) {
				parts.push(changes.join(' '));
			}
		}

		this.statusBarItem.setText(parts.join(' | '));
		this.statusBarItem.addClass('mod-clickable');
		this.statusBarItem.title = this.getTooltip(status);
	}

	getTooltip(status: GitStatus): string {
		const lines = [`Branch: ${status.branch}`];

		if (status.tracking) {
			lines.push(`Tracking: ${status.tracking}`);
			if (status.ahead > 0) {
				lines.push(`Ahead: ${status.ahead} commits`);
			}
			if (status.behind > 0) {
				lines.push(`Behind: ${status.behind} commits`);
			}
		}

		if (status.isClean) {
			lines.push('Working tree clean');
		} else {
			if (status.modified > 0) {
				lines.push(`Modified: ${status.modified}`);
			}
			if (status.created > 0) {
				lines.push(`Created: ${status.created}`);
			}
			if (status.deleted > 0) {
				lines.push(`Deleted: ${status.deleted}`);
			}
		}

		return lines.join('\n');
	}
}
