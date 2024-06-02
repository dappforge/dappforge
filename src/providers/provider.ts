import vscode from 'vscode';
import { autocomplete, dappforgeAutocomplete } from '../prompts/autocomplete';
import { preparePrompt } from '../prompts/preparePrompt';
import { AsyncLock } from '../modules/lock';
import { getFromPromptCache, setPromptToCache } from '../prompts/promptCache';
import { isNotNeeded, isSupported } from '../prompts/filter';
import { ollamaCheckModel } from '../modules/ollamaCheckModel';
import { ollamaDownloadModel } from '../modules/ollamaDownloadModel';
import { config } from '../config';
import { ACCESS_TOKEN_KEY, AUTO_COMPLETE_ACTIVE, TokenManager } from '../modules/TokenManager';

type Status = {
    icon: string;
    text: string;
};

export class PromptProvider implements vscode.InlineCompletionItemProvider {

    lock = new AsyncLock();
    statusbar: vscode.StatusBarItem;
    context: vscode.ExtensionContext;
    private _paused: boolean = true;
    private _authorised: boolean = false;
    private _status: Status = { icon: "chip", text: "dAppForge" };

    constructor(
        statusbar: vscode.StatusBarItem, 
        context: vscode.ExtensionContext
    ) {
        this.statusbar = statusbar;
        this.context = context;
        this._authorised = !TokenManager.loggedIn();
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
        if (!await this.delayCompletion(config.inference.delay, token)) {
            return;
        }

        try {
            if (this.paused || !this.authorised) {
                return;
            }

            console.log(`provideInlineCompletionItems:document: ${JSON.stringify(document, undefined ,2)}`);

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

            // Execute in lock
            return await this.lock.inLock(async () => {

                // Prepare context
                let prepared = await preparePrompt(document, position, context);
                if (token.isCancellationRequested) {
                    console.log(`Canceled before AI completion.`);
                    return;
                }

                // Result
                let res: string | null = null;

                // Check if in cache
                let cached = getFromPromptCache({
                    prefix: prepared.prefix,
                    suffix: prepared.suffix
                });

                // If not cached
                if (cached === undefined) {

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
                            console.log(`Running AI completion...`);
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
                    return [{
                        insertText: res,
                        range: new vscode.Range(position, position),
                    }];
                }

                // Nothing to complete
                return;
            });
        } catch (e) {
            console.log('Error during inference:', e);
            tsvscode.postMessage({
                type: "onError",
                value: `Error during inference: ${(e as Error).message}`,
              });
        }
    }
}