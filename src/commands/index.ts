import type GitLabPlugin from '../main';
import { createShowMergeRequestsCommand } from './show-merge-requests';
import { createGitCommitCommand } from './git-commit';
import { createGitPushCommand } from './git-push';
import { createGitPullCommand } from './git-pull';
import { createGitSwitchBranchCommand } from './git-switch-branch';
import { createGitCreateBranchCommand } from './git-create-branch';
import { createGitCheckoutMainCommand } from './git-checkout-main';

export function registerAllCommands(plugin: GitLabPlugin): void {
	plugin.addCommand(createShowMergeRequestsCommand(plugin));
	plugin.addCommand(createGitCommitCommand(plugin));
	plugin.addCommand(createGitPushCommand(plugin));
	plugin.addCommand(createGitPullCommand(plugin));
	plugin.addCommand(createGitSwitchBranchCommand(plugin));
	plugin.addCommand(createGitCreateBranchCommand(plugin));
	plugin.addCommand(createGitCheckoutMainCommand(plugin));
}
