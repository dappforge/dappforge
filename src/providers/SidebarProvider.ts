import * as vscode from "vscode";
import { authenticate } from "../modules/authenticate";
import { getNonce } from "../getNonce";
import { API_BASE_URL, TOKEN_COUNT, TokenManager } from "../modules/TokenManager";

export class SidebarProvider implements vscode.WebviewViewProvider {
  _view?: vscode.WebviewView;
  _doc?: vscode.TextDocument;

  constructor(private readonly _extensionUri: vscode.Uri) {}

  public postMessageToWebview(message: any) {
    // Post message to webview
    this._view?.webview.postMessage(message);
  }
  
  public resolveWebviewView(webviewView: vscode.WebviewView) {
    this._view = webviewView;

    webviewView.webview.options = {
      // Allow scripts in the webview
      enableScripts: true,

      localResourceRoots: [this._extensionUri],
    };

    webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

    webviewView.webview.onDidReceiveMessage(async (data) => {
      console.log(`---><><> onDidReceiveMessage ${JSON.stringify(data, undefined, 2)}`);
      switch (data.type) {
        case "logout": {
          TokenManager.resetTokens();
          vscode.commands.executeCommand('dappforge.unauthorised');
          break;
        }
        case "authenticate": {
          authenticate(() => {
            webviewView.webview.postMessage({
              type: "token",
              value: TokenManager.getTokensAsJsonString()
            });
          });
          break;
        }
        case "logged-in-out": {
          if (!data.value) {
            TokenManager.resetTokens();
            vscode.commands.executeCommand('dappforge.unauthorised');
          } else {
            TokenManager.setToken(TOKEN_COUNT, String(data.value.tokenCount));
            if (data.value.tokenCount <= 0) {
              vscode.commands.executeCommand('dappforge.unauthorised');
            } else {
              vscode.commands.executeCommand('dappforge.authorised');
            }
          }
          break;
        }
        case "get-token": {
          webviewView.webview.postMessage({
            type: "token",
            value: TokenManager.getTokensAsJsonString()
          });
          break;
        }
        case "onInfo": {
          if (!data.value) {
            return;
          }
          vscode.window.showInformationMessage(data.value);
          break;
        }
        case "onError": {
          if (!data.value) {
            return;
          }
          vscode.window.showErrorMessage(data.value);
          break;
        }
      }
    });
  }

  public revive(panel: vscode.WebviewView) {
    this._view = panel;
  }

  private _getHtmlForWebview(webview: vscode.Webview) {
    const styleResetUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, "media", "reset.css")
    );
    const styleVSCodeUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, "media", "vscode.css")
    );

    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, "out", "compiled/sidebar.js")
    );
    const styleMainUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, "out", "compiled/sidebar.css")
    );

    // Use a nonce to only allow a specific script to be run.
    const nonce = getNonce();

    return `<!DOCTYPE html>
			<html lang="en">
			<head>
				<meta charset="UTF-8">
				<!--
					Use a content security policy to only allow loading images from https or from our extension directory,
					and only allow scripts that have a specific nonce.
        -->
        <meta http-equiv="Content-Security-Policy" content="img-src https: data:; style-src 'unsafe-inline' ${
          webview.cspSource
        }; script-src 'nonce-${nonce}';">
				<meta name="viewport" content="width=device-width, initial-scale=1.0">
				<link href="${styleResetUri}" rel="stylesheet">
				<link href="${styleVSCodeUri}" rel="stylesheet">
        <link href="${styleMainUri}" rel="stylesheet">
        <script nonce="${nonce}">
          const tsvscode = acquireVsCodeApi();
          const apiBaseUrl = ${JSON.stringify(TokenManager.getToken(API_BASE_URL))}
        </script>
			</head>
      <body>
				<script nonce="${nonce}" src="${scriptUri}"></script>
			</body>
			</html>`;
  }
}
