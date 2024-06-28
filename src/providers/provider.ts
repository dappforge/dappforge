import vscode from 'vscode';
import { autocomplete, dappforgeAutocomplete } from '../prompts/autocomplete';
import { preparePrompt } from '../prompts/preparePrompt';
import { AsyncLock } from '../modules/lock';
import { getFromPromptCache, setPromptToCache } from '../prompts/promptCache';
import { isNotNeeded, isSupported } from '../prompts/filter';
import { ollamaCheckModel } from '../modules/ollamaCheckModel';
import { ollamaDownloadModel } from '../modules/ollamaDownloadModel';
import { config } from '../config';
import { ACCESS_TOKEN_KEY, API_BASE_URL, AUTO_COMPLETE_ACTIVE, BASIC_AUTH_TOKEN, REFRESH_TOKEN_KEY, TOKEN_COUNT, TokenManager, USER_ID_KEY } from '../modules/TokenManager';
import { INLINE_COMPLETION_ACCEPTED_COMMAND } from '../constants';
import { SidebarProvider } from './SidebarProvider';

type Status = {
    icon: string;
    text: string;
};

export class PromptProvider implements vscode.InlineCompletionItemProvider {

    lock = new AsyncLock();
    statusbar: vscode.StatusBarItem;
    context: vscode.ExtensionContext;
    private _paused: boolean = true;
    private _solution_accepted: boolean = false;
    private _authorised: boolean = false;
    private _processing_request: boolean = false;
    private _status: Status = { icon: "chip", text: "dAppForge" };

    constructor(
        statusbar: vscode.StatusBarItem, 
        context: vscode.ExtensionContext
    ) {
        this.statusbar = statusbar;
        this.context = context;
        this._authorised = TokenManager.loggedIn();
        this._paused = TokenManager.getToken(AUTO_COMPLETE_ACTIVE) === 'true';
        this.update();
    }

    public set authorised(value: boolean) {
        this._authorised = TokenManager.loggedIn();
        this.update();
    }

    public get authorised(): boolean {
        return this._authorised;
    }
    
    public set paused(value: boolean) {
        this._paused = value;
        TokenManager.setToken(AUTO_COMPLETE_ACTIVE, `${value}`);
        this.update();
    }

    public get paused(): boolean {
        if (!TokenManager.loggedIn()) {
            return true;
        }
        return this._paused;
    }

    private update(icon?: string, text?: string): void {
        this._status.icon = icon ? icon : this._status.icon;
        this._status.text = text ? text : this._status.text;

        let statusText = '';
        let statusTooltip = '';
        if (this.paused || !this.authorised) {
            statusText = `$(sync-ignored) ${this._status.text}`;
            statusTooltip = `${this._status.text} (Paused)`;
        } else {
            statusText = `$(${this._status.icon}) ${this._status.text}`;
            statusTooltip = `${this._status.text}`;
        }
        this.statusbar.text = statusText;
        this.statusbar.tooltip = statusTooltip;
    }

    async delayCompletion(delay: number, token: vscode.CancellationToken): Promise<boolean> {
        if (config.inference.delay < 0) {
            return false;
        }
        await new Promise(p => setTimeout(p, delay));
        if (token.isCancellationRequested) {
            return false;
        }
        return true;
    }

    async provideInlineCompletionItems(document: vscode.TextDocument, position: vscode.Position, context: vscode.InlineCompletionContext, token: vscode.CancellationToken): Promise<vscode.InlineCompletionItem[] | vscode.InlineCompletionList | undefined | null> {
        if (!await this.delayCompletion(config.inference.delay, token) || this._solution_accepted ) { // || this._processing_request) {
            if (this._solution_accepted) { console.log(`xxxxxxx do not query AI as solution was accepted`); }
            // Do not do another AI request when a solution is accepted
            this._solution_accepted = false;
            return;
        }

        try {
            if (this.paused || !this.authorised) {
                return;
            }

            console.log(`provideInlineCompletionItems:document: ${JSON.stringify(document, undefined ,2)}`);
            console.log(`setting res at position: ${JSON.stringify(position, undefined, 2)} context: ${JSON.stringify(context, undefined, 2)}`);

            // Config
            let inferenceConfig = config.inference;

            // Ignore unsupported documents
            if (!isSupported(document, inferenceConfig.aiProvider)) {
                console.log(`Unsupported document: ${document.uri.toString()} ignored.`);
                return;
            }

            // Ignore if not needed
            if (isNotNeeded(document, position, context)) {
                console.log('No inline completion required');
                return;
            }

            // Ignore if already canceled
            if (token.isCancellationRequested) {
                console.log(`Canceled before AI completion.`);
                return;
            }

            console.log('Before lock');

            this._processing_request = true;

            // Execute in lock
            return await this.lock.inLock(async () => {
                console.log('In lock');

                if (this._solution_accepted) { return; }

                // Prepare context
                let prepared = await preparePrompt(document, position, context);
                if (token.isCancellationRequested) {
                    console.log(`Canceled before AI completion.`);
                    return;
                }

                console.log('Start to process AI request');

                // Result
                let res: string | null = null;

                console.log(`<><><><>prepared.prefix: ${prepared.prefix} prepared.suffix: ${prepared.suffix} prepared.prefix.length: ${prepared.prefix?.length}`);

                // Check if in cache
                let cached = getFromPromptCache({
                    prefix: prepared.prefix,
                    suffix: prepared.suffix
                });

                // If not cached
                if (cached === undefined) {
                    console.log('not in cache');

                    // Update status
                    this.update('sync~spin', 'dAppForge');
                    try {
                        console.log(`inferenceConfig.aiProvider: ${inferenceConfig.aiProvider}`);
                        if (inferenceConfig.aiProvider === "Ollama") {

                            // Check model exists
                            let modelExists = await ollamaCheckModel(inferenceConfig.endpoint, inferenceConfig.modelName, inferenceConfig.bearerToken);
                            if (token.isCancellationRequested) {
                                console.log(`Canceled after AI completion.`);
                                return;
                            }

                            // Download model if not exists
                            if (!modelExists) {

                                // Check if user asked to ignore download
                                if (this.context.globalState.get('llama-coder-download-ignored') === inferenceConfig.modelName) {
                                    console.log(`Ingoring since user asked to ignore download.`);
                                    return;
                                }

                                // Ask for download
                                let download = await vscode.window.showInformationMessage(`Model ${inferenceConfig.modelName} is not downloaded. Do you want to download it? Answering "No" would require you to manually download model.`, 'Yes', 'No');
                                if (download === 'No') {
                                    console.log(`Ingoring since user asked to ignore download.`);
                                    this.context.globalState.update('llama-coder-download-ignored', inferenceConfig.modelName);
                                    return;
                                }

                                // Perform download
                                this.update('sync~spin', 'Downloading');
                                await ollamaDownloadModel(inferenceConfig.endpoint, inferenceConfig.modelName, inferenceConfig.bearerToken);
                                this.update('sync~spin', 'dAppForge');
                            }
                            if (token.isCancellationRequested) {
                                console.log(`Canceled after AI completion.`);
                                return;
                            }

                            // Run AI completion
                            console.log(`Running AI completion...`);
                            res = await autocomplete({
                                prefix: prepared.prefix,
                                suffix: prepared.suffix,
                                endpoint: inferenceConfig.endpoint,
                                bearerToken: inferenceConfig.bearerToken,
                                model: inferenceConfig.modelName,
                                format: inferenceConfig.modelFormat,
                                maxLines: inferenceConfig.maxLines,
                                maxTokens: inferenceConfig.maxTokens,
                                temperature: inferenceConfig.temperature,
                                canceled: () => token.isCancellationRequested,
                            });
                        } else {
                            // Run AI completion
                            console.log(`Running dAppForge AI completion...`);
                            res = await dappforgeAutocomplete({
                                prefix: prepared.prefix,
                                suffix: prepared.suffix,
                                endpoint: inferenceConfig.endpoint,
                                bearerToken: inferenceConfig.bearerToken,
                                model: inferenceConfig.modelName,
                                format: inferenceConfig.modelFormat,
                                maxLines: inferenceConfig.maxLines,
                                maxTokens: inferenceConfig.maxTokens,
                                temperature: inferenceConfig.temperature,
                                canceled: () => token.isCancellationRequested,
                            });
                        }
                        console.log(`AI completion completed: ${res}`);

                        console.log(`store in cache prepared.prefix: ${prepared.prefix} prepared.suffix: ${prepared.suffix} res: ${res}`);

                        // Put to cache
                        setPromptToCache({
                            prefix: prepared.prefix,
                            suffix: prepared.suffix,
                            value: res
                        });
                    } finally {
                        this.update('chip', 'dAppForge');
                    }
                } else {
                    if (cached !== null) {
                        res = cached;
                    }
                }
                if (token.isCancellationRequested) {
                    console.log(`Canceled after AI completion.`);
                    return;
                }

                // Return result
                if (res && res.trim() !== '') {
                    console.log(`setting res at position: ${JSON.stringify(position, undefined, 2)}`);
                    const completionItems: vscode.InlineCompletionItem[] = [];
                    const completionItem = new vscode.InlineCompletionItem(res, new vscode.Range(position, position));
        
                    // Attach the command to the completion item so we can detect when its been accepted
                    completionItem.command = {
                        command: INLINE_COMPLETION_ACCEPTED_COMMAND,
                        title: 'Inline Completion Accepted'
                    };
        
                    completionItems.push(completionItem);
        
                    return completionItems;
                }

                // Nothing to complete
                return;
            });
        } catch (e) {
            console.log('Error during inference:', e);
            vscode.window.showErrorMessage((e as Error).message);
        } finally {
            this._processing_request = false;
        }
    }

    async completionAccepted(sidebarProvider: SidebarProvider, cost: number) {
        if (TokenManager.loggedIn() && !this.paused) {
            console.log("Call endpoint to reduce count");
            this._solution_accepted = true;
            try {
                let res = await fetch(
                    `${TokenManager.getToken(API_BASE_URL)}/ai/reduce_token_count/${TokenManager.getToken(USER_ID_KEY)}`,
                {
                    method: "POST",
                    body: JSON.stringify({ cost: cost }),
                    headers: {
                    authorization: `Basic ${TokenManager.getToken(BASIC_AUTH_TOKEN)}`,
                    "Content-Type": "application/json",
                    "access-token": TokenManager.getToken(ACCESS_TOKEN_KEY) || '',
                    "refresh-token": TokenManager.getToken(REFRESH_TOKEN_KEY) || ''
                    },
                }
                );
                if (!res.ok || !res.body) {
                throw Error("Unable to connect to backend");
                }
                console.log(`res.body: ${res.body}`);
                const json: any = await res.json();
                console.log(
                `returned code: ${JSON.stringify(json, undefined, 2)}`
                );
                TokenManager.setToken(TOKEN_COUNT, String(json.tokenCount));
                if (json.tokenCount <= 0) {
                    vscode.commands.executeCommand('dappforge.unauthorised');
                } else {
                    vscode.commands.executeCommand('dappforge.authorised');
                }
                sidebarProvider.postMessageToWebview({ 
                    type: "update-token-count", 
                    value: json.tokenCount });    
            } catch (e) {
                console.log('Error when trying to charge for the AI completion:', e);
                vscode.window.showErrorMessage((e as Error).message);
            }
        }
    }
}