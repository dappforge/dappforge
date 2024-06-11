// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { SidebarProvider } from './providers/SidebarProvider';
import { authenticate } from './modules/authenticate';
import { API_BASE_URL, TokenManager, USER_ID_KEY } from './modules/TokenManager';
import { PromptProvider } from './providers/provider';
import { getApiBaseUrl, INLINE_COMPLETION_ACCEPTED_COMMAND } from './constants';

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	const config = vscode.workspace.getConfiguration('dAppForge');
	const environment = config.get<string>('environment', 'dev');
	console.log(`Environment: ${environment}`);
	
	TokenManager.globalState = context.globalState;
	TokenManager.setBasicAuthToken();
	if (!TokenManager.loggedIn()) {
		TokenManager.resetTokens();
	}
	TokenManager.setToken(API_BASE_URL, getApiBaseUrl(environment));

	// Create status bar
	let statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
	context.subscriptions.push(statusBarItem);
	statusBarItem.command = 'dappforge.toggle';
	statusBarItem.text = `$(chip) dAppForge`;
	statusBarItem.show();

	// Settings
	context.subscriptions.push(vscode.commands.registerCommand('dappforge.openSettings', () => {
		vscode.commands.executeCommand('workbench.action.openSettings', '@ext:dappforge.dappforge');
	}));

	// Create provider
	const provider = new PromptProvider(statusBarItem, context);
	context.subscriptions.push(vscode.languages.registerInlineCompletionItemProvider({ pattern: '**', }, provider));

	context.subscriptions.push(vscode.commands.registerCommand('dappforge.pause', () => {
		provider.paused = true;
	}));
	context.subscriptions.push(vscode.commands.registerCommand('dappforge.resume', () => {
		provider.paused = false;
	}));
	context.subscriptions.push(vscode.commands.registerCommand('dappforge.toggle', () => {
		provider.paused = !provider.paused;
	}));

	context.subscriptions.push(vscode.commands.registerCommand('dappforge.authorised', () => {
		provider.authorised = true;
	}));

	context.subscriptions.push(vscode.commands.registerCommand('dappforge.unauthorised', () => {
		provider.authorised = false;
	}));

	// Sidebar provider
	const sidebarProvider = new SidebarProvider(context.extensionUri);
	context.subscriptions.push(
		vscode.window.registerWebviewViewProvider("dappforge-sidebar", sidebarProvider)
	);
	context.subscriptions.push(
		vscode.commands.registerCommand("dappforge.authenticate", () => {
			try {
				authenticate();
			} catch (err) {
				console.log(err);
			}
		})
	);
	context.subscriptions.push(
		vscode.commands.registerCommand("dappforge.refresh", async () => {
		  	await vscode.commands.executeCommand("workbench.action.closeSidebar");
		  	await vscode.commands.executeCommand(
				"workbench.view.extension.dappforge-sidebar-view"
		  	);
		})
	);

	context.subscriptions.push(
		vscode.commands.registerCommand(INLINE_COMPLETION_ACCEPTED_COMMAND, () => {
			vscode.window.showInformationMessage('Inline completion accepted!');
			// Call webview to decrement token count
			sidebarProvider.postMessageToWebview({ type: "completion-accepted", value: 1 });
		})
	);
}

// This method is called when your extension is deactivated
export function deactivate() {}
