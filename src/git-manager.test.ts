import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GitManager } from './git-manager';

// Mock simple-git
const mockGit = {
	status: vi.fn(),
	init: vi.fn(),
	add: vi.fn(),
	commit: vi.fn(),
	push: vi.fn(),
	pull: vi.fn(),
	branch: vi.fn(),
	revparse: vi.fn(),
	checkoutLocalBranch: vi.fn(),
	checkout: vi.fn(),
	deleteLocalBranch: vi.fn(),
};

vi.mock('simple-git', () => ({
	default: vi.fn(() => mockGit),
}));

describe('GitManager', () => {
	let gitManager: GitManager;
	const testPath = '/test/vault';

	beforeEach(() => {
		vi.clearAllMocks();
		gitManager = new GitManager(testPath);
	});

	describe('Initialization', () => {
		it('should initialize with vault path', () => {
			expect(gitManager).toBeDefined();
		});
	});

	describe('isRepository', () => {
		it('should return true if git repository exists', async () => {
			mockGit.status.mockResolvedValue({} as any);

			const result = await gitManager.isRepository();
			expect(result).toBe(true);
		});

		it('should return false if git repository does not exist', async () => {
			mockGit.status.mockRejectedValue(new Error('Not a git repository'));

			const result = await gitManager.isRepository();
			expect(result).toBe(false);
		});
	});

	describe('getStatus', () => {
		it('should return git status', async () => {
			const mockStatus = {
				modified: ['file1.ts'],
				created: ['file2.ts'],
				deleted: [],
				not_added: [],
				tracking: 'origin/main',
				ahead: 1,
				behind: 0,
				isClean: () => false,
			};

			mockGit.status.mockResolvedValue(mockStatus as any);
			mockGit.revparse.mockResolvedValue('main\n' as any);

			const result = await gitManager.getStatus();

			expect(result.branch).toBe('main');
			expect(result.modified).toBe(1);
			expect(result.created).toBe(1);
			expect(result.ahead).toBe(1);
			expect(result.isClean).toBe(false);
		});
	});

	describe('getBranches', () => {
		it('should return list of branches', async () => {
			mockGit.branch.mockResolvedValue({
				all: ['main', 'feature/test', 'origin/main'],
				branches: {},
				current: 'main',
				detached: false,
			} as any);

			const result = await gitManager.getBranches();
			expect(result).toContain('main');
			expect(result).toContain('feature/test');
		});

		it('should return empty array on error', async () => {
			mockGit.branch.mockRejectedValue(new Error('Error'));

			const result = await gitManager.getBranches();
			expect(result).toEqual([]);
		});
	});

	describe('getCurrentBranch', () => {
		it('should return current branch name', async () => {
			mockGit.revparse.mockResolvedValue('feature/test\n' as any);

			const result = await gitManager.getCurrentBranch();
			expect(result).toBe('feature/test');
		});

		it('should return "unknown" on error', async () => {
			mockGit.revparse.mockRejectedValue(new Error('Error'));

			const result = await gitManager.getCurrentBranch();
			expect(result).toBe('unknown');
		});
	});

	describe('commit', () => {
		it('should stage all files and commit', async () => {
			mockGit.add.mockResolvedValue(undefined as any);
			mockGit.commit.mockResolvedValue({} as any);

			await gitManager.commit('test commit');

			expect(mockGit.add).toHaveBeenCalledWith('.');
			expect(mockGit.commit).toHaveBeenCalledWith('test commit');
		});
	});

	describe('createBranch', () => {
		it('should create a new branch', async () => {
			mockGit.checkoutLocalBranch.mockResolvedValue(undefined as any);

			await gitManager.createBranch('feature/new');

			expect(mockGit.checkoutLocalBranch).toHaveBeenCalledWith('feature/new');
		});
	});

	describe('switchBranch', () => {
		it('should switch to existing branch', async () => {
			mockGit.checkout.mockResolvedValue(undefined as any);

			await gitManager.switchBranch('main');

			expect(mockGit.checkout).toHaveBeenCalledWith('main');
		});
	});
});
