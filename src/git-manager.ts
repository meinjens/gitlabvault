import simpleGit, { SimpleGit, StatusResult } from 'simple-git';
import { Notice } from 'obsidian';
import { GitStatus } from './types';

export class GitManager {
	private git: SimpleGit;
	private vaultPath: string;

	constructor(vaultPath: string) {
		this.vaultPath = vaultPath;
		this.git = simpleGit(vaultPath);
	}

	async isRepository(): Promise<boolean> {
		try {
			await this.git.status();
			return true;
		} catch (error) {
			return false;
		}
	}

	async init(): Promise<void> {
		try {
			await this.git.init();
			new Notice('Git Repository initialisiert');
		} catch (error) {
			console.error('Failed to initialize git repository:', error);
			new Notice('Fehler beim Initialisieren des Git Repository');
			throw error;
		}
	}

	async getStatus(): Promise<GitStatus> {
		try {
			const status: StatusResult = await this.git.status();
			const branch = await this.git.revparse(['--abbrev-ref', 'HEAD']);

			return {
				branch: branch.trim(),
				tracking: status.tracking || null,
				modified: status.modified.length,
				created: status.created.length + status.not_added.length,
				deleted: status.deleted.length,
				ahead: status.ahead,
				behind: status.behind,
				isClean: status.isClean(),
			};
		} catch (error) {
			console.error('Failed to get git status:', error);
			throw error;
		}
	}

	async commit(message: string): Promise<void> {
		try {
			await this.git.add('.');
			await this.git.commit(message);
			new Notice('Änderungen committed');
		} catch (error) {
			console.error('Failed to commit:', error);
			new Notice('Fehler beim Committen');
			throw error;
		}
	}

	async push(): Promise<void> {
		try {
			await this.git.push();
			new Notice('Änderungen gepusht');
		} catch (error) {
			console.error('Failed to push:', error);
			new Notice('Fehler beim Pushen');
			throw error;
		}
	}

	async pull(): Promise<void> {
		try {
			await this.git.pull();
			new Notice('Änderungen gepullt');
		} catch (error) {
			console.error('Failed to pull:', error);
			new Notice('Fehler beim Pullen');
			throw error;
		}
	}

	async getBranches(): Promise<string[]> {
		try {
			const branches = await this.git.branch();
			return branches.all;
		} catch (error) {
			console.error('Failed to get branches:', error);
			return [];
		}
	}

	async getCurrentBranch(): Promise<string> {
		try {
			const branch = await this.git.revparse(['--abbrev-ref', 'HEAD']);
			return branch.trim();
		} catch (error) {
			console.error('Failed to get current branch:', error);
			return 'unknown';
		}
	}

	async createBranch(branchName: string): Promise<void> {
		try {
			await this.git.checkoutLocalBranch(branchName);
			new Notice(`Branch '${branchName}' erstellt`);
		} catch (error) {
			console.error('Failed to create branch:', error);
			new Notice('Fehler beim Erstellen des Branches');
			throw error;
		}
	}

	async switchBranch(branchName: string): Promise<void> {
		try {
			await this.git.checkout(branchName);
			new Notice(`Zu Branch '${branchName}' gewechselt`);
		} catch (error) {
			console.error('Failed to switch branch:', error);
			new Notice('Fehler beim Wechseln des Branches');
			throw error;
		}
	}

	async deleteBranch(branchName: string): Promise<void> {
		try {
			await this.git.deleteLocalBranch(branchName);
			new Notice(`Branch '${branchName}' gelöscht`);
		} catch (error) {
			console.error('Failed to delete branch:', error);
			new Notice('Fehler beim Löschen des Branches');
			throw error;
		}
	}
}
