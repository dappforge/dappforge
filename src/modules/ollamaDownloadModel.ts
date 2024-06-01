import { lineGenerator } from "./lineGenerator";

export async function ollamaDownloadModel(endpoint: string, model: string, bearerToken: string) {
    console.log('Downloading model from ollama: ' + model);
    for await (let line of lineGenerator(endpoint + '/api/pull', { name: model }, bearerToken)) {
        console.log('[DOWNLOAD] ' + line);
    }
}