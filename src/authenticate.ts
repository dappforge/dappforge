import * as vscode from 'vscode';
import { getApiBaseUrl, SERVER_PORT } from './constants';
import polka from "polka";
import { ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY, TokenManager } from './TokenManager';


export const authenticate = async (environment: string, fn?: () => void) => {
    const apiBaseUrl = getApiBaseUrl(environment);
    console.log(`Authenticate environment: ${environment} url: ${apiBaseUrl}`);
    vscode.commands.executeCommand("vscode.open", vscode.Uri.parse(apiBaseUrl + "/auth/github"));
    const app = polka();

    app.get(`/auth/:accessToken/:refreshToken`, async (req, res) => {
        const { accessToken, refreshToken } = req.params;
        if (!accessToken || !refreshToken) {
            res.end(`<h1>Failed to authenticate, something went wrong</h1>`);
            return;
        }
        await TokenManager.setToken(ACCESS_TOKEN_KEY, accessToken);
        await TokenManager.setToken(REFRESH_TOKEN_KEY, refreshToken);
        if (fn) { fn(); }
  
        res.end(`<h1>dAppForge authentication was successful, you can close this now</h1>`);
  
        (app as any).server.close();
    });
  
    app.listen(SERVER_PORT, (err: Error) => {
        if (err) {
            vscode.window.showErrorMessage(err.message);
        } else {
            vscode.commands.executeCommand(
                "vscode.open",
                vscode.Uri.parse(`${apiBaseUrl}/auth/github`)
            );
        }
    });
};