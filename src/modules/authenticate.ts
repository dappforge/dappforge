import * as vscode from 'vscode';
import { SERVER_PORT } from '../constants';
import polka from "polka";
import { API_BASE_URL, TokenManager } from './TokenManager';

let app: any = null;
export const authenticate = async (fn?: () => void) => {
    if (app) { (app as any).server.close(); }

    const apiBaseUrl = TokenManager.getToken(API_BASE_URL);
    app = polka();

    app.get(`/auth/:id/:accessToken/:refreshToken`, async (req: any, res: any) => {
        const { id, accessToken, refreshToken } = req.params;
        if (!accessToken || !refreshToken) {
            res.end(`<h1>Failed to authenticate, something went wrong</h1>`);
            return;
        }
        TokenManager.setTokens(id, accessToken, refreshToken);
        if (fn) { fn(); }
  
        res.end(`<h1>dAppForge authentication was successful, you can close this now</h1>`);
  
        (app as any).server.close();
        app = null;
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