import { getApiBaseUrl } from '../constants';
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
            'Content-Type': 'application/json',
            'access-token': accessToken,
            'refresh-token': refreshToken
        }
    });
    if (!res.ok || !res.body) {
        throw Error('Unable to connect to backend');
    }
    console.log(`res.body: ${res.body}`);
    const data: any = await res.json();
    console.log(`returned code: ${JSON.stringify(data, undefined, 2)}`);

    let code = '';
    if (data.hasOwnProperty('generated_code') && 
    data.generated_code && 
        data.generated_code.length > 0 && data.generated_code.includes('completed_code')) {
        const codeStart = data.generated_code.indexOf('"completed_code"');
        const jsonStr = data.generated_code.substring(codeStart);
        const jsonStrClean = jsonStr.replace(/}\s*"\n}\s*$/, ''); // remove trailing }" and whitespace
        const jsonData = JSON.parse(`{${jsonStrClean}}`); // wrap in {} to form valid JSON
    
        if (jsonData.hasOwnProperty('completed_code') && jsonData.completed_code && jsonData.completed_code.length > 0) {
            console.log('completed_code found');
            // Trim ends of all lines since sometimes the AI completion will add extra spaces
            code = jsonData.completed_code.split('\n').map((v: any) => v.trimEnd()).join('\n');
        }
    }
    
    console.log(`code: ${code}`);
    return code;
}
