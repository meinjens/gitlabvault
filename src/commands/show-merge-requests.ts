import { Command } from 'obsidian';
import type GitLabPlugin from '../main';

export function createShowMergeRequestsCommand(plugin: GitLabPlugin): Command {
	return {
		id: 'show-merge-requests',
		name: 'Show Merge Requests',
		callback: () => {
			plugin.activateMergeRequestView();
		}
	};
}
