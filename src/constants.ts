export function getApiBaseUrl(environment: string): string {
    return environment === 'dev'
      ? "http://127.0.0.1:35245"
      : "https://api.dappforge.com";
  }

export const SERVER_PORT = 54021;
export const INLINE_COMPLETION_ACCEPTED_COMMAND = 'dappforge.InlineCompletionAccepted';
