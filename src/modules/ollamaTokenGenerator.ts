import { lineGenerator } from "./lineGenerator";

export type OllamaToken = {
    model: string,
    response: string,
    done: boolean
};

export async function* ollamaTokenGenerator(url: string, data: any, bearerToken: string): AsyncGenerator<OllamaToken> {
    for await (let line of lineGenerator(url, data, bearerToken)) {
        console.log('Receive line: ' + line);
        let parsed: OllamaToken;
        try {
            parsed = JSON.parse(line) as OllamaToken;
        } catch (e) { 
            console.warn('Receive wrong line: ' + line);
            continue;
        }
        yield parsed;
    }
}