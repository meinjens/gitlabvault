import { vi } from 'vitest';

export class Notice {
	constructor(_message: string) {
		// Mock implementation
	}
}

export class Plugin {
	app: Record<string, unknown>;
	manifest: Record<string, unknown>;

	addRibbonIcon = vi.fn();
	addStatusBarItem = vi.fn(() => ({
		setText: vi.fn(),
		addClass: vi.fn(),
		title: '',
	}));
	addCommand = vi.fn();
	registerView = vi.fn();
	loadData = vi.fn();
	saveData = vi.fn();
}

export class PluginSettingTab {
	constructor(_app: Record<string, unknown>, _plugin: Record<string, unknown>) {}
	display() {}
}

export class ItemView {
	constructor(_leaf: Record<string, unknown>) {}
	getViewType() { return ''; }
	getDisplayText() { return ''; }
	getIcon() { return ''; }
	async onOpen() {}
	async onClose() {}
}

export class Modal {
	constructor(_app: Record<string, unknown>) {}
	open() {}
	close() {}
	onOpen() {}
	onClose() {}
}

export class Setting {
	constructor(_containerEl: HTMLElement) {}
	setName = vi.fn().mockReturnThis();
	setDesc = vi.fn().mockReturnThis();
	addText = vi.fn().mockReturnThis();
	addToggle = vi.fn().mockReturnThis();
	addDropdown = vi.fn().mockReturnThis();
}

export class TextComponent {
	inputEl: HTMLInputElement = {
		style: {},
		placeholder: '',
		addEventListener: vi.fn(),
		focus: vi.fn(),
	} as unknown as HTMLInputElement;
	setPlaceholder = vi.fn().mockReturnThis();
	setValue = vi.fn().mockReturnThis();
	onChange = vi.fn().mockReturnThis();
}

export class DropdownComponent {
	addOption = vi.fn().mockReturnThis();
	setValue = vi.fn().mockReturnThis();
	onChange = vi.fn().mockReturnThis();
}

export function addIcon(_name: string, _svg: string) {}
