import { getApiBaseUrl } from '../constants';
import { JSONParser } from '../modules/jsonParser';
import { ollamaTokenGenerator } from '../modules/ollamaTokenGenerator';
import { countSymbol } from '../modules/text';
import { ACCESS_TOKEN_KEY, API_BASE_URL, REFRESH_TOKEN_KEY, TokenManager, USER_ID_KEY } from '../modules/TokenManager';
import { getBasicAuthToken } from '../utils';
import { ModelFormat, adaptPrompt } from './processors/models';

export async function autocomplete(args: {
    endpoint: string,
    bearerToken: string,
    model: string,
    format: ModelFormat,
    prefix: string,
    suffix: string,
    maxLines: number,
    maxTokens: number,
    temperature: number,
    canceled?: () => boolean,
}): Promise<string> {

    let prompt = adaptPrompt({ prefix: args.prefix, suffix: args.suffix, format: args.format });

    // Calculate arguments
    let data = {
        model: args.model,
        prompt: prompt.prompt,
        raw: true,
        options: {
            stop: prompt.stop,
            num_predict: args.maxTokens,
            temperature: args.temperature
        }
    };

    // Receiving tokens
    let res = '';
    let totalLines = 1;
    let blockStack: ('[' | '(' | '{')[] = [];
    outer: for await (let tokens of ollamaTokenGenerator(args.endpoint + '/api/generate', data, args.bearerToken)) {
        if (args.canceled && args.canceled()) {
            break;
        }

        // Block stack
        for (let c of tokens.response) {

            // Open block
            if (c === '[') {
                blockStack.push('[');
            } else if (c === '(') {
                blockStack.push('(');
            }
            if (c === '{') {
                blockStack.push('{');
            }

            // Close block
            if (c === ']') {
                if (blockStack.length > 0 && blockStack[blockStack.length - 1] === '[') {
                    blockStack.pop();
                } else {
                    console.log('Block stack error, breaking.');
                    break outer;
                }
            }
            if (c === ')') {
                if (blockStack.length > 0 && blockStack[blockStack.length - 1] === '(') {
                    blockStack.pop();
                } else {
                    console.log('Block stack error, breaking.');
                    break outer;
                }
            }
            if (c === '}') {
                if (blockStack.length > 0 && blockStack[blockStack.length - 1] === '{') {
                    blockStack.pop();
                } else {
                    console.log('Block stack error, breaking.');
                    break outer;
                }
            }

            // Append charater
            res += c;
        }

        // Update total lines
        totalLines += countSymbol(tokens.response, '\n');
        // Break if too many lines and on top level
        if (totalLines > args.maxLines && blockStack.length === 0) {
            console.log('Too many lines, breaking.');
            break;
        }
    }

    // Remove <EOT>
    if (res.endsWith('<EOT>')) {
        res = res.slice(0, res.length - 5);
    }

    // Trim ends of all lines since sometimes the AI completion will add extra spaces
    res = res.split('\n').map((v) => v.trimEnd()).join('\n');

    return res;
}


export async function dappforgeAutocomplete(args: {
    endpoint: string,
    bearerToken: string,
    model: string,
    format: ModelFormat,
    prefix: string,
    suffix: string,
    maxLines: number,
    maxTokens: number,
    temperature: number,
    canceled?: () => boolean,
}): Promise<string> {

    const prompt = {"prefix_code": args.prefix };
    console.log(`args.prefix: ${JSON.stringify(args, undefined, 2)}`);
    const url = `${TokenManager.getToken(API_BASE_URL)}/ai/generate_code/${TokenManager.getToken(USER_ID_KEY)}`;
    const basicAuthHeader = `Basic ${getBasicAuthToken()}`;
    console.log(`url: ${url} prompt: ${JSON.stringify(prompt)} auth: ${basicAuthHeader}`);
    const accessToken = TokenManager.getToken(ACCESS_TOKEN_KEY) || '';
    const refreshToken = TokenManager.getToken(REFRESH_TOKEN_KEY) || '';

    // Request
    let res = await fetch(url, {
        method: 'POST',
        body: JSON.stringify(prompt),
        headers: {
            Authorization: basicAuthHeader,
            'Content-Type': 'application/json; charset=UTF-8',
            "Accept": "application/json",
            'access-token': accessToken,
            'refresh-token': refreshToken
        }
    });
    if (!res.ok || !res.body) {
        if (res.body) {
            let detail: string = '';
            const data: any = await res.json();
            console.log(`completed_code: ${JSON.stringify(data, undefined, 2)}`);
            if (data.hasOwnProperty('detail')) {  
                detail = data.detail;
            }
            throw Error(`Error when trying to query the AI, status: ${res.status} error: ${detail}`);            
        }
        throw Error('Unable to connect to backend');
    } 
    if (res.status !== 200) {
        let detail: string = '';
        const data: any = await res.json();
        console.log(`completed_code: ${JSON.stringify(data, undefined, 2)}`);
        if (data.hasOwnProperty('detail')) {  
            detail = data.detail;
        }
        throw Error(`Error when trying to query the AI, status: ${res.status} error: ${detail}`);
    }
    console.log(`res.body: ${res.body}`);
    const data: any = await res.json();
    console.log(`returned code: ${JSON.stringify(data, undefined, 2)}`);

    let code: string = '';
    if (data.hasOwnProperty('generated_code')) {
        code = data.generated_code;
        // Trim ends of all lines since sometimes the AI completion will add extra spaces
        code = code.split('\n').map((v) => v.trimEnd()).join('\n');
        console.log(`completed_code: ${code}`);
    }
    console.log(`code: ${code}`);
    return code;
}
