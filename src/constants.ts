export function getApiBaseUrl(environment: string): string {
    return environment === 'dev'
      ? "http://127.0.0.1:35245"
      : "https://isgro6sam3.execute-api.us-east-1.amazonaws.com/prod";
  }

export const SERVER_PORT = 54021;
export const INLINE_COMPLETION_ACCEPTED_COMMAND = 'dappforge.InlineCompletionAccepted';
