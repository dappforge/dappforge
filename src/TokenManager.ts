import * as vscode from "vscode";

export const ACCESS_TOKEN_KEY = "dappforgeaccesstoken";
export const REFRESH_TOKEN_KEY = "dappforgerefreshtoken";

export class TokenManager {
  static globalState: vscode.Memento;

  static setToken(key: string, token: string) {
    return this.globalState.update(key, token);
  }

  static getToken(key: string): string | undefined {
    return this.globalState.get(key);
  }
}