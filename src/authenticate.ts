import * as vscode from 'vscode';
import { getApiBaseUrl } from './constants';

export const authenticate = async (environment: string) => {
    const apiBaseUrl = getApiBaseUrl(environment);
    console.log(`Authenticate environment: ${environment} url: ${apiBaseUrl}`);
    vscode.commands.executeCommand("vscode.open", vscode.Uri.parse(apiBaseUrl + "/auth/github"));
};