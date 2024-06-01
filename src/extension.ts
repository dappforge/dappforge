// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { SidebarProvider } from './SidebarProvider';
import { authenticate } from './modules/authenticate';
import { TokenManager, USER_ID_KEY } from './TokenManager';
import { PromptProvider } from './prompts/provider';
import { info, registerLogger } from './modules/log';

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	// Create logger
	registerLogger(vscode.window.createOutputChannel( 'dAppForge', { log: true }));
	info('dAppForge is activated.');

	const config = vscode.workspace.getConfiguration('dAppForge');
	const environment = config.get<string>('environment', 'dev');
	console.log(`Current environment: ${environment}`);
	
	TokenManager.globalState = context.globalState;
	TokenManager.setBasicAuthToken();
	if (!TokenManager.loggedIn()) {
		TokenManager.resetTokens();
	}
	console.log(`Current tokens: ${TokenManager.getTokensAsJsonString()}`);

	const sidebarProvider = new SidebarProvider(context.extensionUri, environment);

	//const item = vscode.window.createStatusBarItem(
	//		vscode.StatusBarAlignment.Right
	//  	);
	//item.text = "$(beaker) Add Todo";
	//item.command = "vstodo.addTodo";
	//item.show();
	
	context.subscriptions.push(
		vscode.window.registerWebviewViewProvider("dappforge-sidebar", sidebarProvider)
	);

	context.subscriptions.push(
		vscode.commands.registerCommand("dappforge.authenticate", () => {
			try {
				authenticate(environment);
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

	// Create status bar
	context.subscriptions.push(vscode.commands.registerCommand('dappforge.openSettings', () => {
		vscode.commands.executeCommand('workbench.action.openSettings', '@ext:dappforge.dappforge');
	}));

	let statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
	statusBarItem.command = 'dappforge.toggle';
	statusBarItem.text = `$(chip) dAppForge`;
	statusBarItem.show();
	context.subscriptions.push(statusBarItem);

	// Create provider
	const provider = new PromptProvider(statusBarItem, context);
	let disposable = vscode.languages.registerInlineCompletionItemProvider({ pattern: '**', }, provider);
	context.subscriptions.push(disposable);

	context.subscriptions.push(vscode.commands.registerCommand('dappforge.pause', () => {
		provider.paused = true;
	}));
	context.subscriptions.push(vscode.commands.registerCommand('dappforge.resume', () => {
		provider.paused = false;
	}));
	context.subscriptions.push(vscode.commands.registerCommand('dappforge.toggle', () => {
		provider.paused = !provider.paused;
	}));
	
}

// This method is called when your extension is deactivated
export function deactivate() {}
