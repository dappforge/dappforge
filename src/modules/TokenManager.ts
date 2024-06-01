import * as vscode from "vscode";
import { getBasicAuthToken } from "../utils";

export const ACCESS_TOKEN_KEY = "dappforgeaccesstoken";
export const REFRESH_TOKEN_KEY = "dappforgerefreshtoken";
export const USER_ID_KEY = "dappforgeuserid";
export const BASIC_AUTH_TOKEN = "dappforgebasicauth";
export const TOKEN_COUNT = "dappforgetokencount";

export class TokenManager {
  static globalState: vscode.Memento;

  static setBasicAuthToken() {
    this.setToken(BASIC_AUTH_TOKEN, getBasicAuthToken());
  }

  static setToken(key: string, token: string) {
    return this.globalState.update(key, token);
  }

  static getToken(key: string): string | undefined {
    return this.globalState.get(key);
  }

  static getTokensAsJsonString(): string {
    return JSON.stringify({
        basicAuthToken: TokenManager.getToken(BASIC_AUTH_TOKEN),
        userId: TokenManager.getToken(USER_ID_KEY), 
        accessToken: TokenManager.getToken(ACCESS_TOKEN_KEY), 
        refreshToken: TokenManager.getToken(REFRESH_TOKEN_KEY)});
  }

  static setTokens(id: string, accessToken: string, refreshToken: string) {
    this.setToken(USER_ID_KEY, id);
    this.setToken(ACCESS_TOKEN_KEY, accessToken);
    this.setToken(REFRESH_TOKEN_KEY, refreshToken);
  }

  static resetTokens() {
    this.setToken(USER_ID_KEY, "");
    this.setToken(ACCESS_TOKEN_KEY, "");
    this.setToken(REFRESH_TOKEN_KEY, "");
    this.setToken(TOKEN_COUNT, "0");
  }

  static getTokenCount(): number {
    const count: string | undefined = this.getToken(TOKEN_COUNT);
    if (count && count.length > 0) {
      return Number(count);
    } else {
      return 0;
    }
  }

  static loggedIn(): Boolean {
    return (TokenManager.getToken(USER_ID_KEY) && TokenManager.getToken(USER_ID_KEY) !== "") ? true : false;
  }
}