export interface GitLabSettings {
	gitlabUrl: string;
	personalAccessToken: string;
	projectId: string;
}

export interface MergeRequest {
	iid: number;
	title: string;
	description: string;
	state: string;
	author: {
		name: string;
		username: string;
		avatar_url: string;
	};
	source_branch: string;
	target_branch: string;
	created_at: string;
	updated_at: string;
	merged_at: string | null;
	web_url: string;
	labels: string[];
	assignees: Array<{
		name: string;
		username: string;
	}>;
}

export interface GitStatus {
	branch: string;
	tracking: string | null;
	modified: number;
	created: number;
	deleted: number;
	ahead: number;
	behind: number;
	isClean: boolean;
}
