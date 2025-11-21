import { Gitlab } from '@gitbeaker/rest';
import { MergeRequest } from './types';
import { Notice } from 'obsidian';

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
}
