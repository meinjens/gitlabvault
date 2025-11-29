import { Gitlab } from '@gitbeaker/rest';
import { MergeRequest, MergeRequestDetails, MergeRequestCommit } from './types';
import { Notice } from 'obsidian';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export class GitLabClient {
	private api: InstanceType<typeof Gitlab> | null = null;
	private projectId: string;

	constructor(url: string, token: string, projectId: string) {
		this.projectId = projectId;

		if (!url || !token) {
			return;
		}

		try {
			this.api = new Gitlab({
				host: url,
				token: token,
			});
		} catch (error) {
			console.error('Failed to initialize GitLab client:', error);
			new Notice('GitLab Client Initialisierung fehlgeschlagen');
		}
	}

	isConfigured(): boolean {
		return this.api !== null && this.projectId !== '';
	}

	async getMergeRequests(state: 'opened' | 'closed' | 'merged' | 'all' = 'opened'): Promise<MergeRequest[]> {
		if (!this.api) {
			throw new Error('GitLab Client nicht konfiguriert');
		}

		try {
			const options: any = {
				projectId: this.projectId,
				scope: 'all',
			};

			if (state !== 'all') {
				options.state = state;
			}

			const mrs = await this.api.MergeRequests.all(options);

			return mrs as any as MergeRequest[];
		} catch (error) {
			console.error('Failed to fetch merge requests:', error);
			new Notice('Fehler beim Laden der Merge Requests');
			return [];
		}
	}

	async getMergeRequest(iid: number): Promise<MergeRequest | null> {
		if (!this.api) {
			throw new Error('GitLab Client nicht konfiguriert');
		}

		try {
			const mr = await this.api.MergeRequests.show(this.projectId, iid);
			return mr as any as MergeRequest;
		} catch (error) {
			console.error('Failed to fetch merge request:', error);
			new Notice('Fehler beim Laden des Merge Request');
			return null;
		}
	}

	async searchMergeRequests(query: string): Promise<MergeRequest[]> {
		if (!this.api) {
			throw new Error('GitLab Client nicht konfiguriert');
		}

		try {
			const mrs = await this.api.MergeRequests.all({
				projectId: this.projectId,
				search: query,
				scope: 'all',
			} as any);

			return mrs as any as MergeRequest[];
		} catch (error) {
			console.error('Failed to search merge requests:', error);
			new Notice('Fehler bei der Suche');
			return [];
		}
	}

	async mergeMergeRequest(
		iid: number,
		mergeCommitMessage?: string,
		squash?: boolean
	): Promise<boolean> {
		if (!this.api) {
			throw new Error('GitLab Client nicht konfiguriert');
		}

		try {
			const options: any = {
				projectId: this.projectId,
				mergeRequestIid: iid,
			};

			if (mergeCommitMessage) {
				options.mergeCommitMessage = mergeCommitMessage;
			}

			if (squash !== undefined) {
				options.squash = squash;
			}

			await this.api.MergeRequests.accept(
				this.projectId,
				iid,
				options
			);

			new Notice(`Merge Request !${iid} erfolgreich gemergt`);
			return true;
		} catch (error) {
			console.error('Failed to merge request:', error);
			new Notice(`Fehler beim Mergen des Merge Request: ${error.message}`);
			return false;
		}
	}

	async getMergeRequestDetails(iid: number): Promise<MergeRequestDetails | null> {
		if (!this.api) {
			throw new Error('GitLab Client nicht konfiguriert');
		}

		try {
			const mr = await this.api.MergeRequests.show(this.projectId, iid);

			const [commits, approvals] = await Promise.all([
				this.api.Commits.all(this.projectId, {
					refName: (mr as any).source_branch,
					perPage: 100
				}),
				this.api.MergeRequestApprovals.showApprovalState(this.projectId, iid).catch(() => null)
			]);

			const details: MergeRequestDetails = {
				...(mr as any as MergeRequest),
				commits: commits as any as MergeRequestCommit[],
			};

			if (approvals) {
				details.approvals = {
					approved: (approvals as any).approved || false,
					approved_by: (approvals as any).approved_by || [],
					approvals_required: (approvals as any).approvals_required || 0,
					approvals_left: (approvals as any).approvals_left || 0,
				};
			}

			return details;
		} catch (error) {
			console.error('Failed to fetch merge request details:', error);
			new Notice('Fehler beim Laden der Merge Request Details');
			return null;
		}
	}

	async checkoutMergeRequest(mr: MergeRequest, workspacePath: string): Promise<boolean> {
		try {
			const sourceBranch = mr.source_branch;

			new Notice(`Fetche Branch ${sourceBranch}...`);

			try {
				await execAsync(`git fetch origin ${sourceBranch}:${sourceBranch}`, {
					cwd: workspacePath
				});
			} catch {
				await execAsync(`git fetch origin ${sourceBranch}`, {
					cwd: workspacePath
				});
			}

			new Notice(`Checke Branch ${sourceBranch} aus...`);
			await execAsync(`git checkout ${sourceBranch}`, {
				cwd: workspacePath
			});

			new Notice(`Branch ${sourceBranch} erfolgreich ausgecheckt`);
			return true;
		} catch (error) {
			console.error('Failed to checkout branch:', error);
			new Notice(`Fehler beim Auschecken des Branch: ${error.message}`);
			return false;
		}
	}

	async createMergeRequest(
		sourceBranch: string,
		targetBranch: string,
		title: string,
		description: string
	): Promise<MergeRequest | null> {
		if (!this.api) {
			throw new Error('GitLab Client nicht konfiguriert');
		}

		try {
			const mr = await this.api.MergeRequests.create(
				this.projectId,
				sourceBranch,
				targetBranch,
				title,
				{
					description: description || undefined,
				}
			);

			new Notice(`Merge Request !${(mr as any).iid} erfolgreich erstellt`);
			return mr as any as MergeRequest;
		} catch (error) {
			console.error('Failed to create merge request:', error);
			new Notice(`Fehler beim Erstellen des Merge Request: ${error.message}`);
			return null;
		}
	}

	async createBranchAndCheckout(
		branchName: string,
		workspacePath: string
	): Promise<boolean> {
		try {
			new Notice(`Erstelle Branch ${branchName}...`);

			// Create and checkout new branch
			await execAsync(`git checkout -b ${branchName}`, {
				cwd: workspacePath
			});

			// Push to remote and set upstream
			new Notice(`Pushe Branch ${branchName} zum Remote...`);
			await execAsync(`git push -u origin ${branchName}`, {
				cwd: workspacePath
			});

			new Notice(`Branch ${branchName} erfolgreich erstellt, ausgecheckt und gepusht`);
			return true;
		} catch (error) {
			console.error('Failed to create branch:', error);
			new Notice(`Fehler beim Erstellen des Branch: ${error.message}`);
			return false;
		}
	}

	async createCommitAndPush(
		message: string,
		workspacePath: string
	): Promise<boolean> {
		try {
			new Notice('Erstelle Commit...');

			// Stage all changes
			await execAsync('git add .', {
				cwd: workspacePath
			});

			// Create commit
			await execAsync(`git commit -m "${message.replace(/"/g, '\\"')}"`, {
				cwd: workspacePath
			});

			// Push to remote
			new Notice('Pushe Commit zum Remote...');
			await execAsync('git push', {
				cwd: workspacePath
			});

			new Notice('Commit erfolgreich erstellt und gepusht');
			return true;
		} catch (error) {
			console.error('Failed to create commit:', error);
			new Notice(`Fehler beim Erstellen des Commits: ${error.message}`);
			return false;
		}
	}
}
