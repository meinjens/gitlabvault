import { vi } from 'vitest';

export class Notice {
	constructor(message: string) {
		// Mock implementation
	}
}

export class Plugin {
	app: any;
	manifest: any;

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
	constructor(app: any, plugin: any) {}
	display() {}
}

export class ItemView {
	constructor(leaf: any) {}
	getViewType() { return ''; }
	getDisplayText() { return ''; }
	getIcon() { return ''; }
	async onOpen() {}
	async onClose() {}
}

export class Modal {
	constructor(app: any) {}
	open() {}
	close() {}
	onOpen() {}
	onClose() {}
}

export class Setting {
	constructor(containerEl: any) {}
	setName = vi.fn().mockReturnThis();
	setDesc = vi.fn().mockReturnThis();
	addText = vi.fn().mockReturnThis();
	addToggle = vi.fn().mockReturnThis();
	addDropdown = vi.fn().mockReturnThis();
}

export class TextComponent {
	inputEl: any = {
		style: {},
		placeholder: '',
		addEventListener: vi.fn(),
		focus: vi.fn(),
	};
	setPlaceholder = vi.fn().mockReturnThis();
	setValue = vi.fn().mockReturnThis();
	onChange = vi.fn().mockReturnThis();
}

export class DropdownComponent {
	addOption = vi.fn().mockReturnThis();
	setValue = vi.fn().mockReturnThis();
	onChange = vi.fn().mockReturnThis();
}

export function addIcon(name: string, svg: string) {}
