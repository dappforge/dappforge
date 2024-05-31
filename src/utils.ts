
export const USERNAME="dappforge-api-user";
export const PASSWORD="d8pp4ge-8pi-p8ssan-AI_app?thatwillanswerQuestions";

export function getBasicAuthToken(): string {
    return Buffer.from(USERNAME + ":" + PASSWORD).toString('base64');
}
