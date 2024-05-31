// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { HelloWorldPanel } from './HelloWorldPanel';
import { SidebarProvider } from './SidebarProvider';

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
	const config = vscode.workspace.getConfiguration('dAppForge');
	const environment = config.get<string>('environment', 'dev');
	console.log(`Current environment: ${environment}`);

	const sidebarProvider = new SidebarProvider(context.extensionUri, environment);

	const item = vscode.window.createStatusBarItem(
		vscode.StatusBarAlignment.Right
	  );
	  item.text = "$(beaker) Add Todo";
	  //item.command = "vstodo.addTodo";
	  item.show();
	
	context.subscriptions.push(
		vscode.window.registerWebviewViewProvider("dappforge-sidebar", sidebarProvider)
	);

	context.subscriptions.push(
		vscode.commands.registerCommand("dappforge.refresh", async () => {
		  // HelloWorldPanel.kill();
		  // HelloWorldPanel.createOrShow(context.extensionUri);
		  await vscode.commands.executeCommand("workbench.action.closeSidebar");
		  await vscode.commands.executeCommand(
			"workbench.view.extension.dappforge-sidebar-view"
		  );
		})
	  );
		
	context.subscriptions.push(
		vscode.commands.registerCommand("dappforge.helloWorld", () => {
		  //vscode.window.showInformationMessage(
			//"token value is: " + TokenManager.getToken()
		  //);
		  HelloWorldPanel.createOrShow(context.extensionUri);
		})
	  );
	
}

// This method is called when your extension is deactivated
export function deactivate() {}
