import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
	test: {
		globals: true,
		environment: 'node',
		coverage: {
			provider: 'v8',
			reporter: ['text', 'html', 'lcov'],
			exclude: [
				'node_modules/',
				'main.js',
				'**/*.config.*',
				'**/dist/**',
				'**/*.test.ts',
			],
		},
		setupFiles: ['./src/test-setup.ts'],
	},
	resolve: {
		alias: {
			obsidian: path.resolve(__dirname, './src/__mocks__/obsidian.ts'),
		},
	},
});
