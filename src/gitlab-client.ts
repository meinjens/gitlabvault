import {
	Gitlab,
	type MergeRequestSchema,
	type CommitSchema,
	type AllMergeRequestsOptions,
	type AcceptMergeRequestOptions,
	type ApprovalStateSchema
} from '@gitbeaker/rest';
import { MergeRequest, MergeRequestDetails, MergeRequestCommit } from './types';
import { Notice } from 'obsidian';
import simpleGit from 'simple-git';

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
			const options: AllMergeRequestsOptions & { projectId: string | number; withLabelsDetails?: false } = {
				projectId: this.projectId,
				scope: 'all',
				withLabelsDetails: false,
			};

			if (state !== 'all') {
				options.state = state;
			}

			const mrs = await this.api.MergeRequests.all(options) as MergeRequestSchema[];

			return mrs as MergeRequest[];
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
			const mr = await this.api.MergeRequests.show(this.projectId, iid) as MergeRequestSchema;
			return mr as MergeRequest;
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
			const options: AllMergeRequestsOptions & { projectId: string | number; withLabelsDetails?: false } = {
				projectId: this.projectId,
				search: query,
				scope: 'all',
				withLabelsDetails: false,
			};
			const mrs = await this.api.MergeRequests.all(options) as MergeRequestSchema[];

			return mrs as MergeRequest[];
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
			const options: AcceptMergeRequestOptions = {};

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
			const mr = await this.api.MergeRequests.show(this.projectId, iid) as MergeRequestSchema;

			const [commits, approvals] = await Promise.all([
				this.api.Commits.all(this.projectId, {
					refName: mr.source_branch,
					perPage: 100
				}) as Promise<CommitSchema[]>,
				this.api.MergeRequestApprovals.showApprovalState(this.projectId, iid).catch(() => null)
			]);

			const details: MergeRequestDetails = {
				...(mr as MergeRequest),
				commits: commits as MergeRequestCommit[],
			};

			if (approvals) {
				const approvalState = approvals as ApprovalStateSchema;
				const approvedRules = approvalState.rules?.filter(r => r.approved) || [];
				details.approvals = {
					approved: approvedRules.length > 0,
					approved_by: [],
					approvals_required: approvalState.rules?.length || 0,
					approvals_left: approvalState.rules?.filter(r => !r.approved).length || 0,
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
			const git = simpleGit(workspacePath);
			const sourceBranch = mr.source_branch;

			new Notice(`Fetche Branch ${sourceBranch}...`);

			try {
				await git.fetch('origin', sourceBranch);
			} catch (error) {
				console.error('Failed to fetch branch:', error);
				new Notice(`Fehler beim Fetchen des Branch: ${error instanceof Error ? error.message : String(error)}`);
				return false;
			}

			new Notice(`Checke Branch ${sourceBranch} aus...`);
			await git.checkout(sourceBranch);

			new Notice(`Branch ${sourceBranch} erfolgreich ausgecheckt`);
			return true;
		} catch (error) {
			console.error('Failed to checkout branch:', error);
			new Notice(`Fehler beim Auschecken des Branch: ${error instanceof Error ? error.message : String(error)}`);
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

			const mergeRequest = mr as MergeRequestSchema;
			new Notice(`Merge Request !${mergeRequest.iid} erfolgreich erstellt`);
			return mergeRequest as MergeRequest;
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
			const git = simpleGit(workspacePath);

			new Notice(`Erstelle Branch ${branchName}...`);

			// Create and checkout new branch
			await git.checkoutLocalBranch(branchName);

			// Push to remote and set upstream
			new Notice(`Pushe Branch ${branchName} zum Remote...`);
			await git.push('origin', branchName, ['--set-upstream']);

			new Notice(`Branch ${branchName} erfolgreich erstellt, ausgecheckt und gepusht`);
			return true;
		} catch (error) {
			console.error('Failed to create branch:', error);
			new Notice(`Fehler beim Erstellen des Branch: ${error instanceof Error ? error.message : String(error)}`);
			return false;
		}
	}

	async createCommitAndPush(
		message: string,
		workspacePath: string
	): Promise<boolean> {
		try {
			const git = simpleGit(workspacePath);

			new Notice('Erstelle Commit...');

			// Stage all changes
			await git.add('.');

			// Create commit
			await git.commit(message);

			// Push to remote
			new Notice('Pushe Commit zum Remote...');
			await git.push();

			new Notice('Commit erfolgreich erstellt und gepusht');
			return true;
		} catch (error) {
			console.error('Failed to create commit:', error);
			new Notice(`Fehler beim Erstellen des Commits: ${error instanceof Error ? error.message : String(error)}`);
			return false;
		}
	}

	async createMergeRequestFromUncommittedChanges(
		branchName: string,
		title: string,
		description: string,
		commitMessage: string,
		targetBranch: string,
		workspacePath: string
	): Promise<MergeRequest | null> {
		try {
			const git = simpleGit(workspacePath);

			// Create and checkout new branch
			new Notice(`Erstelle Branch ${branchName}...`);
			await git.checkoutLocalBranch(branchName);

			// Stage all changes and commit
			new Notice('Erstelle Commit...');
			await git.add('.');
			await git.commit(commitMessage);

			// Push to remote and set upstream
			new Notice(`Pushe Branch ${branchName} zum Remote...`);
			await git.push('origin', branchName, ['--set-upstream']);

			// Create merge request
			new Notice('Erstelle Merge Request...');
			const mr = await this.createMergeRequest(branchName, targetBranch, title, description);

			if (mr) {
				new Notice(`Merge Request !${mr.iid} erfolgreich erstellt`);
			}

			return mr;
		} catch (error) {
			console.error('Failed to create merge request from uncommitted changes:', error);
			new Notice(`Fehler beim Erstellen des Merge Request: ${error instanceof Error ? error.message : String(error)}`);
			return null;
		}
	}
}
