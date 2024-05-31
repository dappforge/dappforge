export function getApiBaseUrl(environment: string): string {
    return environment === 'production'
      ? "http://127.0.0.1:44151"
      : "https://api.dappforge.com";
  }