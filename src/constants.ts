export function getApiBaseUrl(environment: string): string {
    return environment === 'dev'
      ? "http://127.0.0.1:44151"
      : "https://api.dappforge.com";
  }

export const SERVER_PORT = 54021;
