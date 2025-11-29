import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GitLabClient } from './gitlab-client';

// Mock @gitbeaker/rest
vi.mock('@gitbeaker/rest', () => {
	return {
		Gitlab: class MockGitlab {
			MergeRequests = {
				all: vi.fn(),
				show: vi.fn(),
			};
			constructor(_config: Record<string, unknown>) {}
		},
	};
});

describe('GitLabClient', () => {
	let client: GitLabClient;

	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('Initialization', () => {
		it('should initialize with valid credentials', () => {
			client = new GitLabClient('https://gitlab.com', 'test-token', '123');
			expect(client.isConfigured()).toBe(true);
		});

		it('should not configure without URL', () => {
			client = new GitLabClient('', 'test-token', '123');
			expect(client.isConfigured()).toBe(false);
		});

		it('should not configure without token', () => {
			client = new GitLabClient('https://gitlab.com', '', '123');
			expect(client.isConfigured()).toBe(false);
		});

		it('should not configure without project ID', () => {
			client = new GitLabClient('https://gitlab.com', 'test-token', '');
			expect(client.isConfigured()).toBe(false);
		});
	});

	describe('searchMergeRequests', () => {
		it('should throw error when client not configured', async () => {
			client = new GitLabClient('', '', '');
			await expect(client.searchMergeRequests('test')).rejects.toThrow('GitLab Client nicht konfiguriert');
		});
	});
});
