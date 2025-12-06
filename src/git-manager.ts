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
		} catch {
			return false;
		}
	}

	async init(): Promise<void> {
		try {
			await this.git.init();
			new Notice('Git Repository initialisiert');
		} catch (error: unknown) {
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

	async hasUncommittedChanges(): Promise<boolean> {
		try {
			const status: StatusResult = await this.git.status();
			return !status.isClean();
		} catch (error) {
			console.error('Failed to check for uncommitted changes:', error);
			return false;
		}
	}

	async commitAndPush(message: string): Promise<void> {
		try {
			await this.git.add('.');
			await this.git.commit(message);
			await this.git.push();
			new Notice('Änderungen committed und gepusht');
		} catch (error) {
			console.error('Failed to commit and push:', error);
			new Notice('Fehler beim Committen und Pushen');
			throw error;
		}
	}

	async discardChanges(): Promise<void> {
		try {
			await this.git.reset(['--hard']);
			await this.git.clean('f', ['-d']);
			new Notice('Änderungen verworfen');
		} catch (error) {
			console.error('Failed to discard changes:', error);
			new Notice('Fehler beim Verwerfen der Änderungen');
			throw error;
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

	async checkGitignore(): Promise<{ exists: boolean; hasWorkspaceJson: boolean }> {
		const fs = require('fs').promises;
		const path = require('path');
		const gitignorePath = path.join(this.vaultPath, '.gitignore');

		const validEntries = [
			'.obsidian/workspace.json',
			'.obsidian/workspace*.json',
			'.obsidian',
			'.obsidian/',
			'.obsidian/*'
		];

		try {
			const content = await fs.readFile(gitignorePath, 'utf-8');
			const lines = content.split('\n').map((line: string) => line.trim());
			const hasWorkspaceJson = lines.some((line: string) => validEntries.includes(line));

			return { exists: true, hasWorkspaceJson };
		} catch {
			return { exists: false, hasWorkspaceJson: false };
		}
	}

	async addToGitignore(entry: string): Promise<void> {
		const fs = require('fs').promises;
		const path = require('path');
		const gitignorePath = path.join(this.vaultPath, '.gitignore');

		try {
			let content = '';
			try {
				content = await fs.readFile(gitignorePath, 'utf-8');
			} catch {
				// .gitignore doesn't exist yet
			}

			if (!content.endsWith('\n') && content.length > 0) {
				content += '\n';
			}

			content += `\n# Obsidian workspace (persönliche Einstellungen)\n${entry}\n`;
			await fs.writeFile(gitignorePath, content, 'utf-8');
			new Notice('.gitignore aktualisiert');
		} catch (error) {
			console.error('Failed to update .gitignore:', error);
			new Notice('Fehler beim Aktualisieren der .gitignore');
			throw error;
		}
	}
}
