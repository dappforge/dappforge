/******/ (() => { // webpackBootstrap
/******/ 	var __webpack_modules__ = ([
/* 0 */
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {

"use strict";

var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.deactivate = exports.activate = void 0;
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const vscode = __importStar(__webpack_require__(1));
const SidebarProvider_1 = __webpack_require__(2);
const authenticate_1 = __webpack_require__(3);
const TokenManager_1 = __webpack_require__(12);
const provider_1 = __webpack_require__(15);
const constants_1 = __webpack_require__(4);
// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
function activate(context) {
    const config = vscode.workspace.getConfiguration('dAppForge');
    const environment = config.get('environment', 'dev');
    console.log(`Environment: ${environment}`);
    TokenManager_1.TokenManager.globalState = context.globalState;
    TokenManager_1.TokenManager.setBasicAuthToken();
    if (!TokenManager_1.TokenManager.loggedIn()) {
        TokenManager_1.TokenManager.resetTokens();
    }
    TokenManager_1.TokenManager.setToken(TokenManager_1.API_BASE_URL, (0, constants_1.getApiBaseUrl)(environment));
    // Create status bar
    let statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    context.subscriptions.push(statusBarItem);
    statusBarItem.command = 'dappforge.toggle';
    statusBarItem.text = `$(chip) dAppForge`;
    statusBarItem.show();
    // Settings
    context.subscriptions.push(vscode.commands.registerCommand('dappforge.openSettings', () => {
        vscode.commands.executeCommand('workbench.action.openSettings', '@ext:dappforge.dappforge');
    }));
    // Create provider
    const provider = new provider_1.PromptProvider(statusBarItem, context);
    context.subscriptions.push(vscode.languages.registerInlineCompletionItemProvider({ pattern: '**', }, provider));
    context.subscriptions.push(vscode.commands.registerCommand('dappforge.pause', () => {
        provider.paused = true;
    }));
    context.subscriptions.push(vscode.commands.registerCommand('dappforge.resume', () => {
        provider.paused = false;
    }));
    context.subscriptions.push(vscode.commands.registerCommand('dappforge.toggle', () => {
        provider.paused = !provider.paused;
    }));
    context.subscriptions.push(vscode.commands.registerCommand('dappforge.authorised', () => {
        provider.authorised = true;
    }));
    context.subscriptions.push(vscode.commands.registerCommand('dappforge.unauthorised', () => {
        provider.authorised = false;
    }));
    // Sidebar provider
    const sidebarProvider = new SidebarProvider_1.SidebarProvider(context.extensionUri);
    context.subscriptions.push(vscode.window.registerWebviewViewProvider("dappforge-sidebar", sidebarProvider));
    context.subscriptions.push(vscode.commands.registerCommand("dappforge.authenticate", () => {
        try {
            (0, authenticate_1.authenticate)();
        }
        catch (err) {
            console.log(err);
        }
    }));
    context.subscriptions.push(vscode.commands.registerCommand("dappforge.refresh", async () => {
        await vscode.commands.executeCommand("workbench.action.closeSidebar");
        await vscode.commands.executeCommand("workbench.view.extension.dappforge-sidebar-view");
    }));
    context.subscriptions.push(vscode.commands.registerCommand(constants_1.INLINE_COMPLETION_ACCEPTED_COMMAND, () => {
        //vscode.window.showInformationMessage('Inline completion accepted!');
        // Call webview to decrement token count
        const tokenCount = provider.completionAccepted(sidebarProvider, 1);
    }));
}
exports.activate = activate;
// This method is called when your extension is deactivated
function deactivate() { }
exports.deactivate = deactivate;


/***/ }),
/* 1 */
/***/ ((module) => {

"use strict";
module.exports = require("vscode");

/***/ }),
/* 2 */
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {

"use strict";

var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.SidebarProvider = void 0;
const vscode = __importStar(__webpack_require__(1));
const authenticate_1 = __webpack_require__(3);
const getNonce_1 = __webpack_require__(14);
const TokenManager_1 = __webpack_require__(12);
class SidebarProvider {
    _extensionUri;
    _view;
    _doc;
    constructor(_extensionUri) {
        this._extensionUri = _extensionUri;
    }
    postMessageToWebview(message) {
        // Post message to webview
        this._view?.webview.postMessage(message);
    }
    resolveWebviewView(webviewView) {
        this._view = webviewView;
        webviewView.webview.options = {
            // Allow scripts in the webview
            enableScripts: true,
            localResourceRoots: [this._extensionUri],
        };
        webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);
        webviewView.webview.onDidReceiveMessage(async (data) => {
            console.log(`---><><> onDidReceiveMessage ${JSON.stringify(data, undefined, 2)}`);
            switch (data.type) {
                case "logout": {
                    TokenManager_1.TokenManager.resetTokens();
                    vscode.commands.executeCommand('dappforge.unauthorised');
                    break;
                }
                case "authenticate": {
                    (0, authenticate_1.authenticate)(() => {
                        webviewView.webview.postMessage({
                            type: "token",
                            value: TokenManager_1.TokenManager.getTokensAsJsonString()
                        });
                    });
                    break;
                }
                case "logged-in-out": {
                    if (!data.value) {
                        TokenManager_1.TokenManager.resetTokens();
                        vscode.commands.executeCommand('dappforge.unauthorised');
                    }
                    else {
                        TokenManager_1.TokenManager.setToken(TokenManager_1.TOKEN_COUNT, String(data.value.tokenCount));
                        if (data.value.tokenCount <= 0) {
                            vscode.commands.executeCommand('dappforge.unauthorised');
                        }
                        else {
                            vscode.commands.executeCommand('dappforge.authorised');
                        }
                    }
                    break;
                }
                case "get-token": {
                    webviewView.webview.postMessage({
                        type: "token",
                        value: TokenManager_1.TokenManager.getTokensAsJsonString()
                    });
                    break;
                }
                case "onInfo": {
                    if (!data.value) {
                        return;
                    }
                    vscode.window.showInformationMessage(data.value);
                    break;
                }
                case "onError": {
                    if (!data.value) {
                        return;
                    }
                    vscode.window.showErrorMessage(data.value);
                    break;
                }
            }
        });
    }
    revive(panel) {
        this._view = panel;
    }
    _getHtmlForWebview(webview) {
        const styleResetUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, "media", "reset.css"));
        const styleVSCodeUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, "media", "vscode.css"));
        const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, "out", "compiled/sidebar.js"));
        const styleMainUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, "out", "compiled/sidebar.css"));
        // Use a nonce to only allow a specific script to be run.
        const nonce = (0, getNonce_1.getNonce)();
        return `<!DOCTYPE html>
			<html lang="en">
			<head>
				<meta charset="UTF-8">
				<!--
					Use a content security policy to only allow loading images from https or from our extension directory,
					and only allow scripts that have a specific nonce.
        -->
        <meta http-equiv="Content-Security-Policy" content="img-src https: data:; style-src 'unsafe-inline' ${webview.cspSource}; script-src 'nonce-${nonce}';">
				<meta name="viewport" content="width=device-width, initial-scale=1.0">
				<link href="${styleResetUri}" rel="stylesheet">
				<link href="${styleVSCodeUri}" rel="stylesheet">
        <link href="${styleMainUri}" rel="stylesheet">
        <script nonce="${nonce}">
          const tsvscode = acquireVsCodeApi();
          const apiBaseUrl = ${JSON.stringify(TokenManager_1.TokenManager.getToken(TokenManager_1.API_BASE_URL))}
        </script>
			</head>
      <body>
				<script nonce="${nonce}" src="${scriptUri}"></script>
			</body>
			</html>`;
    }
}
exports.SidebarProvider = SidebarProvider;


/***/ }),
/* 3 */
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {

"use strict";

var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.authenticate = void 0;
const vscode = __importStar(__webpack_require__(1));
const constants_1 = __webpack_require__(4);
const polka_1 = __importDefault(__webpack_require__(5));
const TokenManager_1 = __webpack_require__(12);
let app = null;
const authenticate = async (fn) => {
    if (app) {
        app.server.close();
    }
    const apiBaseUrl = TokenManager_1.TokenManager.getToken(TokenManager_1.API_BASE_URL);
    app = (0, polka_1.default)();
    app.get(`/auth/:id/:accessToken/:refreshToken`, async (req, res) => {
        const { id, accessToken, refreshToken } = req.params;
        if (!accessToken || !refreshToken) {
            res.end(`<h1>Failed to authenticate, something went wrong</h1>`);
            return;
        }
        TokenManager_1.TokenManager.setTokens(id, accessToken, refreshToken);
        if (fn) {
            fn();
        }
        res.end(`<h1>dAppForge authentication was successful, you can close this now</h1>`);
        app.server.close();
        app = null;
    });
    app.listen(constants_1.SERVER_PORT, (err) => {
        if (err) {
            vscode.window.showErrorMessage(err.message);
        }
        else {
            vscode.commands.executeCommand("vscode.open", vscode.Uri.parse(`${apiBaseUrl}/auth/github`));
        }
    });
};
exports.authenticate = authenticate;


/***/ }),
/* 4 */
/***/ ((__unused_webpack_module, exports) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.INLINE_COMPLETION_ACCEPTED_COMMAND = exports.SERVER_PORT = exports.getApiBaseUrl = void 0;
function getApiBaseUrl(environment) {
    return environment === 'dev'
        ? "http://127.0.0.1:35245"
        : "https://xs84120lea.execute-api.us-east-1.amazonaws.com/prod";
}
exports.getApiBaseUrl = getApiBaseUrl;
exports.SERVER_PORT = 54021;
exports.INLINE_COMPLETION_ACCEPTED_COMMAND = 'dappforge.InlineCompletionAccepted';


/***/ }),
/* 5 */
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

const http = __webpack_require__(6);
const Router = __webpack_require__(7);
const { parse } = __webpack_require__(10);
const parser = __webpack_require__(11);

function lead(x) {
	return x.charCodeAt(0) === 47 ? x : ('/' + x);
}

function value(x) {
  let y = x.indexOf('/', 1);
  return y > 1 ? x.substring(0, y) : x;
}

function mutate(str, req) {
	req.url = req.url.substring(str.length) || '/';
	req.path = req.path.substring(str.length) || '/';
}

function onError(err, req, res, next) {
	let code = (res.statusCode = err.code || err.status || 500);
	res.end(err.length && err || err.message || http.STATUS_CODES[code]);
}

class Polka extends Router {
	constructor(opts={}) {
		super(opts);
		this.apps = {};
		this.wares = [];
		this.bwares = {};
		this.parse = parser;
		this.server = opts.server;
		this.handler = this.handler.bind(this);
		this.onError = opts.onError || onError; // catch-all handler
		this.onNoMatch = opts.onNoMatch || this.onError.bind(null, { code:404 });
	}

	add(method, pattern, ...fns) {
		let base = lead(value(pattern));
		if (this.apps[base] !== void 0) throw new Error(`Cannot mount ".${method.toLowerCase()}('${lead(pattern)}')" because a Polka application at ".use('${base}')" already exists! You should move this handler into your Polka application instead.`);
		return super.add(method, pattern, ...fns);
	}

	use(base, ...fns) {
		if (typeof base === 'function') {
			this.wares = this.wares.concat(base, fns);
		} else if (base === '/') {
			this.wares = this.wares.concat(fns);
		} else {
			base = lead(base);
			fns.forEach(fn => {
				if (fn instanceof Polka) {
					this.apps[base] = fn;
				} else {
					let arr = this.bwares[base] || [];
					arr.length > 0 || arr.push((r, _, nxt) => (mutate(base, r),nxt()));
					this.bwares[base] = arr.concat(fn);
				}
			});
		}
		return this; // chainable
	}

	listen() {
		(this.server = this.server || http.createServer()).on('request', this.handler);
		this.server.listen.apply(this.server, arguments);
		return this;
	}

	handler(req, res, info) {
		info = info || this.parse(req);
		let fns=[], arr=this.wares, obj=this.find(req.method, info.pathname);
		req.originalUrl = req.originalUrl || req.url;
		let base = value(req.path = info.pathname);
		if (this.bwares[base] !== void 0) {
			arr = arr.concat(this.bwares[base]);
		}
		if (obj) {
			fns = obj.handlers;
			req.params = obj.params;
		} else if (this.apps[base] !== void 0) {
			mutate(base, req); info.pathname=req.path; //=> updates
			fns.push(this.apps[base].handler.bind(null, req, res, info));
		} else if (fns.length === 0) {
			fns.push(this.onNoMatch);
		}
		// Grab addl values from `info`
		req.search = info.search;
		req.query = parse(info.query);
		// Exit if only a single function
		let i=0, len=arr.length, num=fns.length;
		if (len === i && num === 1) return fns[0](req, res);
		// Otherwise loop thru all middlware
		let next = err => err ? this.onError(err, req, res, next) : loop();
		let loop = _ => res.finished || (i < len) && arr[i++](req, res, next);
		arr = arr.concat(fns);
		len += num;
		loop(); // init
	}
}

module.exports = opts => new Polka(opts);


/***/ }),
/* 6 */
/***/ ((module) => {

"use strict";
module.exports = require("http");

/***/ }),
/* 7 */
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

const { exec, match, parse } = __webpack_require__(8);

class Trouter {
	constructor(opts) {
		this.opts = opts || {};
		this.routes = {};
		this.handlers = {};

		this.all = this.add.bind(this, '*');
		this.get = this.add.bind(this, 'GET');
		this.head = this.add.bind(this, 'HEAD');
		this.patch = this.add.bind(this, 'PATCH');
		this.options = this.add.bind(this, 'OPTIONS');
    this.connect = this.add.bind(this, 'CONNECT');
		this.delete = this.add.bind(this, 'DELETE');
    this.trace = this.add.bind(this, 'TRACE');
		this.post = this.add.bind(this, 'POST');
		this.put = this.add.bind(this, 'PUT');
	}

	add(method, pattern, ...fns) {
		// Save decoded pattern info
		if (this.routes[method] === void 0) this.routes[method]=[];
		this.routes[method].push(parse(pattern));
		// Save route handler(s)
		if (this.handlers[method] === void 0) this.handlers[method]={};
		this.handlers[method][pattern] = fns;
		// Allow chainable
		return this;
	}

	find(method, url) {
		let arr = match(url, this.routes[method] || []);
		if (arr.length === 0) {
			arr = match(url, this.routes[method='*'] || []);
			if (!arr.length) return false;
		}
		return {
			params: exec(url, arr),
			handlers: this.handlers[method][arr[0].old]
		};
	}
}

module.exports = Trouter;


/***/ }),
/* 8 */
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   exec: () => (/* binding */ exec),
/* harmony export */   match: () => (/* binding */ match),
/* harmony export */   parse: () => (/* binding */ parse)
/* harmony export */ });
/* harmony import */ var _arr_every__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(9);




const SEP = '/';
// Types ~> static, param, any, optional
const STYPE=0, PTYPE=1, ATYPE=2, OTYPE=3;
// Char Codes ~> / : *
const SLASH=47, COLON=58, ASTER=42, QMARK=63;

function strip(str) {
	if (str === SEP) return str;
	(str.charCodeAt(0) === SLASH) && (str=str.substring(1));
	var len = str.length - 1;
	return str.charCodeAt(len) === SLASH ? str.substring(0, len) : str;
}

function split(str) {
	return (str=strip(str)) === SEP ? [SEP] : str.split(SEP);
}

function isMatch(arr, obj, idx) {
	idx = arr[idx];
	return (obj.val === idx && obj.type === STYPE) || (idx === SEP ? obj.type > PTYPE : obj.type !== STYPE && (idx || '').endsWith(obj.end));
}

function match(str, all) {
	var i=0, tmp, segs=split(str), len=segs.length, l;
	var fn = isMatch.bind(isMatch, segs);

	for (; i < all.length; i++) {
		tmp = all[i];
		if ((l=tmp.length) === len || (l < len && tmp[l-1].type === ATYPE) || (l > len && tmp[l-1].type === OTYPE)) {
			if ((0,_arr_every__WEBPACK_IMPORTED_MODULE_0__["default"])(tmp, fn)) return tmp;
		}
	}

	return [];
}

function parse(str) {
	if (str === SEP) {
		return [{ old:str, type:STYPE, val:str, end:'' }];
	}

	var c, x, t, sfx, nxt=strip(str), i=-1, j=0, len=nxt.length, out=[];

	while (++i < len) {
		c = nxt.charCodeAt(i);

		if (c === COLON) {
			j = i + 1; // begining of param
			t = PTYPE; // set type
			x = 0; // reset mark
			sfx = '';

			while (i < len && nxt.charCodeAt(i) !== SLASH) {
				c = nxt.charCodeAt(i);
				if (c === QMARK) {
					x=i; t=OTYPE;
				} else if (c === 46 && sfx.length === 0) {
					sfx = nxt.substring(x=i);
				}
				i++; // move on
			}

			out.push({
				old: str,
				type: t,
				val: nxt.substring(j, x||i),
				end: sfx
			});

			// shorten string & update pointers
			nxt=nxt.substring(i); len-=i; i=0;

			continue; // loop
		} else if (c === ASTER) {
			out.push({
				old: str,
				type: ATYPE,
				val: nxt.substring(i),
				end: ''
			});
			continue; // loop
		} else {
			j = i;
			while (i < len && nxt.charCodeAt(i) !== SLASH) {
				++i; // skip to next slash
			}
			out.push({
				old: str,
				type: STYPE,
				val: nxt.substring(j, i),
				end: ''
			});
			// shorten string & update pointers
			nxt=nxt.substring(i); len-=i; i=j=0;
		}
	}

	return out;
}

function exec(str, arr) {
	var i=0, x, y, segs=split(str), out={};
	for (; i < arr.length; i++) {
		x=segs[i]; y=arr[i];
		if (x === SEP) continue;
		if (x !== void 0 && y.type | 2 === OTYPE) {
			out[ y.val ] = x.replace(y.end, '');
		}
	}
	return out;
}


/***/ }),
/* 9 */
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (/* export default binding */ __WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony default export */ function __WEBPACK_DEFAULT_EXPORT__(arr, cb) {
	var i=0, len=arr.length;

	for (; i < len; i++) {
		if (!cb(arr[i], i, arr)) {
			return false;
		}
	}

	return true;
}


/***/ }),
/* 10 */
/***/ ((module) => {

"use strict";
module.exports = require("querystring");

/***/ }),
/* 11 */
/***/ ((module) => {

module.exports = function (req) {
	let url = req.url;
	if (url === void 0) return url;

	let obj = req._parsedUrl;
	if (obj && obj._raw === url) return obj;

	obj = {};
	obj.query = obj.search = null;
	obj.href = obj.path = obj.pathname = url;

	let idx = url.indexOf('?', 1);
	if (idx !== -1) {
		obj.search = url.substring(idx);
		obj.query = obj.search.substring(1);
		obj.pathname = url.substring(0, idx);
	}

	obj._raw = url;

	return (req._parsedUrl = obj);
}


/***/ }),
/* 12 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.TokenManager = exports.AUTO_COMPLETE_ACTIVE = exports.API_BASE_URL = exports.TOKEN_COUNT = exports.BASIC_AUTH_TOKEN = exports.USER_ID_KEY = exports.REFRESH_TOKEN_KEY = exports.ACCESS_TOKEN_KEY = void 0;
const utils_1 = __webpack_require__(13);
exports.ACCESS_TOKEN_KEY = "dappforgeaccesstoken";
exports.REFRESH_TOKEN_KEY = "dappforgerefreshtoken";
exports.USER_ID_KEY = "dappforgeuserid";
exports.BASIC_AUTH_TOKEN = "dappforgebasicauth";
exports.TOKEN_COUNT = "dappforgetokencount";
exports.API_BASE_URL = "dappforgetokenapibaseurl";
exports.AUTO_COMPLETE_ACTIVE = "dappforgetokenautocompleteactive";
class TokenManager {
    static globalState;
    static setBasicAuthToken() {
        this.setToken(exports.BASIC_AUTH_TOKEN, (0, utils_1.getBasicAuthToken)());
    }
    static setToken(key, token) {
        return this.globalState.update(key, token);
    }
    static getToken(key) {
        return this.globalState.get(key);
    }
    static getTokensAsJsonString() {
        return JSON.stringify({
            basicAuthToken: TokenManager.getToken(exports.BASIC_AUTH_TOKEN),
            userId: TokenManager.getToken(exports.USER_ID_KEY),
            accessToken: TokenManager.getToken(exports.ACCESS_TOKEN_KEY),
            refreshToken: TokenManager.getToken(exports.REFRESH_TOKEN_KEY)
        });
    }
    static setTokens(id, accessToken, refreshToken) {
        this.setToken(exports.USER_ID_KEY, id);
        this.setToken(exports.ACCESS_TOKEN_KEY, accessToken);
        this.setToken(exports.REFRESH_TOKEN_KEY, refreshToken);
    }
    static resetTokens() {
        this.setToken(exports.USER_ID_KEY, "");
        this.setToken(exports.ACCESS_TOKEN_KEY, "");
        this.setToken(exports.REFRESH_TOKEN_KEY, "");
        this.setToken(exports.TOKEN_COUNT, "0");
    }
    static getTokenCount() {
        const count = this.getToken(exports.TOKEN_COUNT);
        if (count && count.length > 0) {
            return Number(count);
        }
        else {
            return 0;
        }
    }
    static loggedIn() {
        return (TokenManager.getToken(exports.USER_ID_KEY) && TokenManager.getToken(exports.USER_ID_KEY) !== "") ? true : false;
    }
}
exports.TokenManager = TokenManager;


/***/ }),
/* 13 */
/***/ ((__unused_webpack_module, exports) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.getBasicAuthToken = exports.PASSWORD = exports.USERNAME = void 0;
exports.USERNAME = "dappforge-api-user";
exports.PASSWORD = "d8pp4ge-8pi-p8ssan-AI_app?thatwillanswerQuestions";
function getBasicAuthToken() {
    return Buffer.from(exports.USERNAME + ":" + exports.PASSWORD).toString('base64');
}
exports.getBasicAuthToken = getBasicAuthToken;


/***/ }),
/* 14 */
/***/ ((__unused_webpack_module, exports) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.getNonce = void 0;
function getNonce() {
    let text = "";
    const possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    for (let i = 0; i < 32; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}
exports.getNonce = getNonce;


/***/ }),
/* 15 */
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {

"use strict";

var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.PromptProvider = void 0;
const vscode_1 = __importDefault(__webpack_require__(1));
const autocomplete_1 = __webpack_require__(16);
const preparePrompt_1 = __webpack_require__(21);
const lock_1 = __webpack_require__(28);
const promptCache_1 = __webpack_require__(29);
const filter_1 = __webpack_require__(30);
const ollamaCheckModel_1 = __webpack_require__(31);
const ollamaDownloadModel_1 = __webpack_require__(32);
const config_1 = __webpack_require__(27);
const TokenManager_1 = __webpack_require__(12);
const constants_1 = __webpack_require__(4);
class PromptProvider {
    lock = new lock_1.AsyncLock();
    statusbar;
    context;
    _paused = true;
    _solution_accepted = false;
    _authorised = false;
    _processing_request = false;
    _status = { icon: "chip", text: "dAppForge" };
    constructor(statusbar, context) {
        this.statusbar = statusbar;
        this.context = context;
        this._authorised = TokenManager_1.TokenManager.loggedIn();
        this._paused = TokenManager_1.TokenManager.getToken(TokenManager_1.AUTO_COMPLETE_ACTIVE) === 'true';
        this.update();
    }
    set authorised(value) {
        this._authorised = TokenManager_1.TokenManager.loggedIn();
        this.update();
    }
    get authorised() {
        return this._authorised;
    }
    set paused(value) {
        this._paused = value;
        TokenManager_1.TokenManager.setToken(TokenManager_1.AUTO_COMPLETE_ACTIVE, `${value}`);
        this.update();
    }
    get paused() {
        if (!TokenManager_1.TokenManager.loggedIn()) {
            return true;
        }
        return this._paused;
    }
    update(icon, text) {
        this._status.icon = icon ? icon : this._status.icon;
        this._status.text = text ? text : this._status.text;
        let statusText = '';
        let statusTooltip = '';
        if (this.paused || !this.authorised) {
            statusText = `$(sync-ignored) ${this._status.text}`;
            statusTooltip = `${this._status.text} (Paused)`;
        }
        else {
            statusText = `$(${this._status.icon}) ${this._status.text}`;
            statusTooltip = `${this._status.text}`;
        }
        this.statusbar.text = statusText;
        this.statusbar.tooltip = statusTooltip;
    }
    async delayCompletion(delay, token) {
        if (config_1.config.inference.delay < 0) {
            return false;
        }
        await new Promise(p => setTimeout(p, delay));
        if (token.isCancellationRequested) {
            return false;
        }
        return true;
    }
    async provideInlineCompletionItems(document, position, context, token) {
        if (!await this.delayCompletion(config_1.config.inference.delay, token) || this._solution_accepted || this._processing_request) {
            if (this._solution_accepted) {
                console.log(`xxxxxxx do not query AI as solution was accepted`);
            }
            // Do not do another AI request when a solution is accepted
            this._solution_accepted = false;
            return;
        }
        try {
            if (this.paused || !this.authorised) {
                return;
            }
            console.log(`provideInlineCompletionItems:document: ${JSON.stringify(document, undefined, 2)}`);
            console.log(`setting res at position: ${JSON.stringify(position, undefined, 2)} context: ${JSON.stringify(context, undefined, 2)}`);
            // Config
            let inferenceConfig = config_1.config.inference;
            // Ignore unsupported documents
            if (!(0, filter_1.isSupported)(document, inferenceConfig.aiProvider)) {
                console.log(`Unsupported document: ${document.uri.toString()} ignored.`);
                return;
            }
            // Ignore if not needed
            if ((0, filter_1.isNotNeeded)(document, position, context)) {
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
            //return await this.lock.inLock(async () => {
            console.log('In lock');
            if (this._solution_accepted) {
                return;
            }
            // Prepare context
            let prepared = await (0, preparePrompt_1.preparePrompt)(document, position, context);
            if (token.isCancellationRequested) {
                console.log(`Canceled before AI completion.`);
                return;
            }
            console.log('Start to process AI request');
            // Result
            let res = null;
            console.log(`<><><><>prepared.prefix: ${prepared.prefix} prepared.suffix: ${prepared.suffix} prepared.prefix.length: ${prepared.prefix?.length}`);
            // Check if in cache
            let cached = (0, promptCache_1.getFromPromptCache)({
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
                        let modelExists = await (0, ollamaCheckModel_1.ollamaCheckModel)(inferenceConfig.endpoint, inferenceConfig.modelName, inferenceConfig.bearerToken);
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
                            let download = await vscode_1.default.window.showInformationMessage(`Model ${inferenceConfig.modelName} is not downloaded. Do you want to download it? Answering "No" would require you to manually download model.`, 'Yes', 'No');
                            if (download === 'No') {
                                console.log(`Ingoring since user asked to ignore download.`);
                                this.context.globalState.update('llama-coder-download-ignored', inferenceConfig.modelName);
                                return;
                            }
                            // Perform download
                            this.update('sync~spin', 'Downloading');
                            await (0, ollamaDownloadModel_1.ollamaDownloadModel)(inferenceConfig.endpoint, inferenceConfig.modelName, inferenceConfig.bearerToken);
                            this.update('sync~spin', 'dAppForge');
                        }
                        if (token.isCancellationRequested) {
                            console.log(`Canceled after AI completion.`);
                            return;
                        }
                        // Run AI completion
                        console.log(`Running AI completion...`);
                        res = await (0, autocomplete_1.autocomplete)({
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
                    else {
                        // Run AI completion
                        console.log(`Running dAppForge AI completion...`);
                        res = await (0, autocomplete_1.dappforgeAutocomplete)({
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
                    (0, promptCache_1.setPromptToCache)({
                        prefix: prepared.prefix,
                        suffix: prepared.suffix,
                        value: res
                    });
                }
                finally {
                    this.update('chip', 'dAppForge');
                }
            }
            else {
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
                const completionItems = [];
                const completionItem = new vscode_1.default.InlineCompletionItem(res, new vscode_1.default.Range(position, position));
                // Attach the command to the completion item so we can detect when its been accepted
                completionItem.command = {
                    command: constants_1.INLINE_COMPLETION_ACCEPTED_COMMAND,
                    title: 'Inline Completion Accepted'
                };
                completionItems.push(completionItem);
                return completionItems;
            }
            // Nothing to complete
            return;
            //});
        }
        catch (e) {
            console.log('Error during inference:', e);
            vscode_1.default.window.showErrorMessage(e.message);
        }
        finally {
            this._processing_request = false;
        }
    }
    async completionAccepted(sidebarProvider, cost) {
        if (TokenManager_1.TokenManager.loggedIn() && !this.paused) {
            console.log("Call endpoint to reduce count");
            this._solution_accepted = true;
            try {
                let res = await fetch(`${TokenManager_1.TokenManager.getToken(TokenManager_1.API_BASE_URL)}/ai/reduce_token_count/${TokenManager_1.TokenManager.getToken(TokenManager_1.USER_ID_KEY)}`, {
                    method: "POST",
                    body: JSON.stringify({ cost: cost }),
                    headers: {
                        authorization: `Basic ${TokenManager_1.TokenManager.getToken(TokenManager_1.BASIC_AUTH_TOKEN)}`,
                        "Content-Type": "application/json",
                        "access-token": TokenManager_1.TokenManager.getToken(TokenManager_1.ACCESS_TOKEN_KEY) || '',
                        "refresh-token": TokenManager_1.TokenManager.getToken(TokenManager_1.REFRESH_TOKEN_KEY) || ''
                    },
                });
                if (!res.ok || !res.body) {
                    throw Error("Unable to connect to backend");
                }
                console.log(`res.body: ${res.body}`);
                const json = await res.json();
                console.log(`returned code: ${JSON.stringify(json, undefined, 2)}`);
                TokenManager_1.TokenManager.setToken(TokenManager_1.TOKEN_COUNT, String(json.tokenCount));
                if (json.tokenCount <= 0) {
                    vscode_1.default.commands.executeCommand('dappforge.unauthorised');
                }
                else {
                    vscode_1.default.commands.executeCommand('dappforge.authorised');
                }
                sidebarProvider.postMessageToWebview({
                    type: "update-token-count",
                    value: json.tokenCount
                });
            }
            catch (e) {
                console.log('Error when trying to charge for the AI completion:', e);
                vscode_1.default.window.showErrorMessage(e.message);
            }
        }
    }
}
exports.PromptProvider = PromptProvider;


/***/ }),
/* 16 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.dappforgeAutocomplete = exports.autocomplete = void 0;
const ollamaTokenGenerator_1 = __webpack_require__(17);
const text_1 = __webpack_require__(19);
const TokenManager_1 = __webpack_require__(12);
const utils_1 = __webpack_require__(13);
const models_1 = __webpack_require__(20);
async function autocomplete(args) {
    let prompt = (0, models_1.adaptPrompt)({ prefix: args.prefix, suffix: args.suffix, format: args.format });
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
    let blockStack = [];
    outer: for await (let tokens of (0, ollamaTokenGenerator_1.ollamaTokenGenerator)(args.endpoint + '/api/generate', data, args.bearerToken)) {
        if (args.canceled && args.canceled()) {
            break;
        }
        // Block stack
        for (let c of tokens.response) {
            // Open block
            if (c === '[') {
                blockStack.push('[');
            }
            else if (c === '(') {
                blockStack.push('(');
            }
            if (c === '{') {
                blockStack.push('{');
            }
            // Close block
            if (c === ']') {
                if (blockStack.length > 0 && blockStack[blockStack.length - 1] === '[') {
                    blockStack.pop();
                }
                else {
                    console.log('Block stack error, breaking.');
                    break outer;
                }
            }
            if (c === ')') {
                if (blockStack.length > 0 && blockStack[blockStack.length - 1] === '(') {
                    blockStack.pop();
                }
                else {
                    console.log('Block stack error, breaking.');
                    break outer;
                }
            }
            if (c === '}') {
                if (blockStack.length > 0 && blockStack[blockStack.length - 1] === '{') {
                    blockStack.pop();
                }
                else {
                    console.log('Block stack error, breaking.');
                    break outer;
                }
            }
            // Append charater
            res += c;
        }
        // Update total lines
        totalLines += (0, text_1.countSymbol)(tokens.response, '\n');
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
exports.autocomplete = autocomplete;
async function dappforgeAutocomplete(args) {
    const preparedPrompt = prepareAIPrompt(args.prefix);
    const prompt = { "prefix_code": preparedPrompt };
    console.log(`prompt: ${JSON.stringify(prompt, undefined, 2)}`);
    const url = `${TokenManager_1.TokenManager.getToken(TokenManager_1.API_BASE_URL)}/ai/generate_code/${TokenManager_1.TokenManager.getToken(TokenManager_1.USER_ID_KEY)}`;
    const basicAuthHeader = `Basic ${(0, utils_1.getBasicAuthToken)()}`;
    console.log(`url: ${url} prompt: ${JSON.stringify(prompt)} auth: ${basicAuthHeader}`);
    const accessToken = TokenManager_1.TokenManager.getToken(TokenManager_1.ACCESS_TOKEN_KEY) || '';
    const refreshToken = TokenManager_1.TokenManager.getToken(TokenManager_1.REFRESH_TOKEN_KEY) || '';
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
            let detail = '';
            let body = await res.text();
            if (body.includes('completed_code')) {
                const data = await res.json();
                console.log(`completed_code: ${JSON.stringify(data, undefined, 2)}`);
                if (data.hasOwnProperty('detail')) {
                    detail = data.detail;
                }
            }
            else {
                detail = body;
            }
            throw Error(`Error when trying to query the AI, status: ${res.status} error: ${detail}`);
        }
        throw Error('Unable to connect to backend');
    }
    if (res.status !== 200) {
        let detail = '';
        const data = await res.json();
        console.log(`completed_code: ${JSON.stringify(data, undefined, 2)}`);
        if (data.hasOwnProperty('detail')) {
            detail = data.detail;
        }
        throw Error(`Error when trying to query the AI, status: ${res.status} error: ${detail}`);
    }
    console.log(`res.body: ${res.body}`);
    const data = await res.json();
    console.log(`returned code: ${JSON.stringify(data, undefined, 2)}`);
    let code = '';
    if (data.hasOwnProperty('generated_code')) {
        code = data.generated_code;
        code = code.replace(/\\n/g, '\n');
        // Trim ends of all lines since sometimes the AI completion will add extra spaces
        code = code.split('\n').map((v) => v.trimEnd()).join('\n');
        console.log(`completed_code: ${code}`);
    }
    console.log(`code: ${code}`);
    return code;
}
exports.dappforgeAutocomplete = dappforgeAutocomplete;
function prepareAIPrompt(input, limit = 1000) {
    // Step 1: Trim the input to the last `limit` characters
    const trimmedInput = input.slice(-limit);
    // Step 2: Adjust start to ensure it begins with a complete word
    // Find the index of the first space followed by a word character in the trimmed input
    const startIndex = trimmedInput.search(/\s\w/);
    const adjustedInput = startIndex !== -1 ? trimmedInput.slice(startIndex + 1) : trimmedInput;
    // Optional: Adjust to ensure starting with a complete sentence
    const sentenceStartIndex = trimmedInput.search(/\. \w/);
    const adjustedInputForSentence = sentenceStartIndex !== -1 ? trimmedInput.slice(sentenceStartIndex + 2) : adjustedInput;
    // Return the adjusted input
    return adjustedInput.trim();
}


/***/ }),
/* 17 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.ollamaTokenGenerator = void 0;
const lineGenerator_1 = __webpack_require__(18);
async function* ollamaTokenGenerator(url, data, bearerToken) {
    for await (let line of (0, lineGenerator_1.lineGenerator)(url, data, bearerToken)) {
        console.log('Receive line: ' + line);
        let parsed;
        try {
            parsed = JSON.parse(line);
        }
        catch (e) {
            console.warn('Receive wrong line: ' + line);
            continue;
        }
        yield parsed;
    }
}
exports.ollamaTokenGenerator = ollamaTokenGenerator;


/***/ }),
/* 18 */
/***/ ((__unused_webpack_module, exports) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.lineGenerator = void 0;
async function* lineGenerator(url, data, bearerToken) {
    // Request
    const controller = new AbortController();
    let res = await fetch(url, {
        method: 'POST',
        body: JSON.stringify(data),
        headers: bearerToken ? {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${bearerToken}`,
        } : {
            'Content-Type': 'application/json',
        },
        signal: controller.signal,
    });
    if (!res.ok || !res.body) {
        throw Error('Unable to connect to backend');
    }
    // Reading stream
    let stream = res.body.getReader();
    const decoder = new TextDecoder();
    let pending = '';
    try {
        while (true) {
            const { done, value } = await stream.read();
            // If ended
            if (done) {
                if (pending.length > 0) { // New lines are impossible here
                    yield pending;
                }
                break;
            }
            // Append chunk
            let chunk = decoder.decode(value);
            console.warn(chunk);
            pending += chunk;
            // Yield results 
            while (pending.indexOf('\n') >= 0) {
                let offset = pending.indexOf('\n');
                yield pending.slice(0, offset);
                pending = pending.slice(offset + 1);
            }
        }
    }
    finally {
        stream.releaseLock();
        if (!stream.closed) { // Stop generation
            await stream.cancel();
        }
        controller.abort();
    }
}
exports.lineGenerator = lineGenerator;


/***/ }),
/* 19 */
/***/ ((__unused_webpack_module, exports) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.countSymbol = exports.trimEndBlank = exports.trimIndent = exports.indentWidth = exports.isBlank = exports.countLines = void 0;
function countLines(src) {
    return countSymbol(src, '\n') + 1;
}
exports.countLines = countLines;
function isBlank(src) {
    return src.trim().length === 0;
}
exports.isBlank = isBlank;
function indentWidth(src) {
    for (let i = 0; i < src.length; i++) {
        if (!isBlank(src[i])) {
            return i;
        }
    }
    return src.length;
}
exports.indentWidth = indentWidth;
function trimIndent(src) {
    // Prase lines
    let lines = src.split('\n');
    if (lines.length === 0) {
        return '';
    }
    if (lines.length === 1) {
        return lines[0].trim();
    }
    // Remove first and last empty line
    if (isBlank(lines[0])) {
        lines = lines.slice(1);
    }
    if (isBlank(lines[lines.length - 1])) {
        lines = lines.slice(0, lines.length - 1);
    }
    if (lines.length === 0) {
        return '';
    }
    // Find minimal indent
    let indents = lines.filter((v) => !isBlank(v)).map((v) => indentWidth(v));
    let minimal = indents.length > 0 ? Math.min(...indents) : 0;
    // Trim indent
    return lines.map((v) => isBlank(v) ? '' : v.slice(minimal).trimEnd()).join('\n');
}
exports.trimIndent = trimIndent;
function trimEndBlank(src) {
    let lines = src.split('\n');
    for (let i = lines.length - 1; i++; i >= 0) {
        if (isBlank(lines[i])) {
            lines.splice(i);
        }
    }
    return lines.join('\n');
}
exports.trimEndBlank = trimEndBlank;
function countSymbol(src, char) {
    let res = 0;
    for (let i = 0; i < src.length; i++) {
        if (src[i] === char) {
            res++;
        }
    }
    return res;
}
exports.countSymbol = countSymbol;


/***/ }),
/* 20 */
/***/ ((__unused_webpack_module, exports) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.adaptPrompt = void 0;
function adaptPrompt(args) {
    // Common non FIM mode
    // if (!args.suffix) {
    //     return {
    //         prompt: args.prefix,
    //         stop: [`<END>`]
    //     };
    // }
    // Starcoder FIM
    if (args.format === 'deepseek') {
        return {
            prompt: `<｜fim▁begin｜>${args.prefix}<｜fim▁hole｜>${args.suffix}<｜fim▁end｜>`,
            stop: [`<｜fim▁begin｜>`, `<｜fim▁hole｜>`, `<｜fim▁end｜>`, `<END>`]
        };
    }
    // Stable code FIM
    if (args.format === 'stable-code') {
        return {
            prompt: `<fim_prefix>${args.prefix}<fim_suffix>${args.suffix}<fim_middle>`,
            stop: [`<|endoftext|>`]
        };
    }
    // Codellama FIM
    return {
        prompt: `<PRE> ${args.prefix} <SUF> ${args.suffix} <MID>`,
        stop: [`<END>`, `<EOD>`, `<EOT>`]
    };
}
exports.adaptPrompt = adaptPrompt;


/***/ }),
/* 21 */
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {

"use strict";

var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.preparePrompt = void 0;
const vscode_1 = __importDefault(__webpack_require__(1));
const detectLanguage_1 = __webpack_require__(22);
const languages_1 = __webpack_require__(24);
const config_1 = __webpack_require__(27);
var decoder = new TextDecoder("utf8");
function getNotebookDocument(document) {
    return vscode_1.default.workspace.notebookDocuments
        .find(x => x.uri.path === document.uri.path);
}
async function preparePrompt(document, position, context) {
    // Load document text
    let text = document.getText();
    let offset = document.offsetAt(position);
    let prefix = text.slice(0, offset);
    let suffix = text.slice(offset);
    let notebookConfig = config_1.config.notebook;
    // If this is a notebook, add the surrounding cells to the prefix and suffix
    let notebookDocument = getNotebookDocument(document);
    let language = (0, detectLanguage_1.detectLanguage)(document.uri.fsPath, document.languageId);
    let commentStart = undefined;
    if (language) {
        commentStart = languages_1.languages[language].comment?.start;
    }
    if (notebookDocument) {
        let beforeCurrentCell = true;
        let prefixCells = "";
        let suffixCells = "";
        notebookDocument.getCells().forEach((cell) => {
            let out = "";
            if (cell.document.uri.fragment === document.uri.fragment) {
                beforeCurrentCell = false; // switch to suffix mode
                return;
            }
            // add the markdown cell output to the prompt as a comment
            if (cell.kind === vscode_1.default.NotebookCellKind.Markup && commentStart) {
                if (notebookConfig.includeMarkup) {
                    for (const line of cell.document.getText().split('\n')) {
                        out += `\n${commentStart}${line}`;
                    }
                }
            }
            else {
                out += cell.document.getText();
            }
            // if there is any outputs add them to the prompt as a comment
            const addCellOutputs = notebookConfig.includeCellOutputs
                && beforeCurrentCell
                && cell.kind === vscode_1.default.NotebookCellKind.Code
                && commentStart;
            if (addCellOutputs) {
                let cellOutputs = cell.outputs
                    .map(x => x.items
                    .filter(x => x.mime === 'text/plain')
                    .map(x => decoder.decode(x.data))
                    .map(x => x.slice(0, notebookConfig.cellOutputLimit).split('\n')))
                    .flat(3);
                if (cellOutputs.length > 0) {
                    out += `\n${commentStart}Output:`;
                    for (const line of cellOutputs) {
                        out += `\n${commentStart}${line}`;
                    }
                }
            }
            // update the prefix/suffix
            if (beforeCurrentCell) {
                prefixCells += out;
            }
            else {
                suffixCells += out;
            }
        });
        prefix = prefixCells + prefix;
        suffix = suffix + suffixCells;
    }
    // Trim suffix
    // If suffix is too small it is safe to assume that it could be ignored which would allow us to use
    // more powerful completition instead of in middle one
    // if (suffix.length < 256) {
    //     suffix = null;
    // }
    // Add filename and language to prefix
    // NOTE: Most networks don't have a concept of filenames and expected language, but we expect that some files in training set has something in title that 
    //       would indicate filename and language
    // NOTE: If we can't detect language, we could ignore this since the number of languages that need detection is limited
    //if (language && addFilename) {
    //    prefix = fileHeaders(prefix, document.uri.fsPath, languages[language]);
    //}
    return {
        prefix,
        suffix,
    };
}
exports.preparePrompt = preparePrompt;


/***/ }),
/* 22 */
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {

"use strict";

var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.detectLanguage = void 0;
const path_1 = __importDefault(__webpack_require__(23));
const languages_1 = __webpack_require__(24);
let aliases = {
    'typescriptreact': 'typescript',
    'javascriptreact': 'javascript',
    'jsx': 'javascript'
};
function detectLanguage(uri, languageId) {
    // Resolve aliases
    if (!!languageId && aliases[languageId]) {
        return aliases[languageId];
    }
    // Resolve using language id
    if (!!languageId && !!languages_1.languages[languageId]) {
        return languageId;
    }
    // Resolve using filename and extension
    let basename = path_1.default.basename(uri);
    let extname = path_1.default.extname(basename).toLowerCase();
    // Check extensions
    for (let lang in languages_1.languages) {
        let k = languages_1.languages[lang];
        for (let ex of k.extensions) {
            if (extname === ex) {
                return lang;
            }
        }
    }
    // Return result
    return null;
}
exports.detectLanguage = detectLanguage;


/***/ }),
/* 23 */
/***/ ((module) => {

"use strict";
module.exports = require("path");

/***/ }),
/* 24 */
/***/ ((__unused_webpack_module, exports) => {

"use strict";

//
// Well Known Languages
//
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.languages = void 0;
//
// List of well known languages
// 
// Extensions from: https://github.com/github-linguist/linguist/blob/master/lib/linguist/languages.yml
//
exports.languages = {
    // Web languages
    typescript: {
        name: 'Typescript',
        extensions: ['.ts', '.tsx', '.cts', '.mts'],
        comment: { start: '//' }
    },
    javascript: {
        name: 'Javascript',
        extensions: ['.js', '.jsx', '.cjs'],
        comment: { start: '//' }
    },
    html: {
        name: 'HTML',
        extensions: ['.htm', '.html'],
        comment: { start: '<!--', end: '-->' }
    },
    css: {
        name: 'CSS',
        extensions: ['.css', '.scss', '.sass', '.less'],
        // comment: { start: '/*', end: '*/' } // Disable comments for CSS - not useful anyway
    },
    json: {
        name: 'JSON',
        extensions: ['.json', '.jsonl', '.geojson'],
        // comment: { start: '//' } // Disable comments for CSS - not useful anyway
    },
    yaml: {
        name: 'YAML',
        extensions: ['.yml', '.yaml'],
        comment: { start: '#' }
    },
    xml: {
        name: 'XML',
        extensions: ['.xml'],
        comment: { start: '<!--', end: '-->' }
    },
    // Generic languages
    java: {
        name: 'Java',
        extensions: ['.java'],
        comment: { start: '//' }
    },
    kotlin: {
        name: 'Kotlin',
        extensions: ['.kt', '.ktm', '.kts'],
        comment: { start: '//' }
    },
    swift: {
        name: 'Swift',
        extensions: ['.swift'],
        comment: { start: '//' }
    },
    "objective-c": {
        name: 'Objective C',
        extensions: ['.h', '.m', '.mm'],
        comment: { start: '//' }
    },
    rust: {
        name: 'Rust',
        extensions: ['.rs', '.rs.in'],
        comment: { start: '//' }
    },
    python: {
        name: 'Python',
        extensions: ['.py', 'ipynb'],
        comment: { start: '#' }
    },
    c: {
        name: 'C',
        extensions: ['.c', '.h'],
        comment: { start: '//' }
    },
    cpp: {
        name: 'C++',
        extensions: ['.cpp', '.h'],
        comment: { start: '//' }
    },
    go: {
        name: 'Go',
        extensions: ['.go'],
        comment: { start: '//' }
    },
    php: {
        name: 'PHP',
        extensions: ['.aw', '.ctp', '.fcgi', '.inc', '.php', '.php3', '.php4', '.php5', '.phps', '.phpt'],
        comment: { start: '//' }
    },
    // Shell
    bat: {
        name: 'BAT file',
        extensions: ['.bat', '.cmd'],
        comment: { start: 'REM' }
    },
    shellscript: {
        name: 'Shell',
        extensions: ['.bash', '.sh'],
        comment: { start: '#' }
    }
};


/***/ }),
/* 25 */,
/* 26 */,
/* 27 */
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {

"use strict";

var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.config = void 0;
const vscode_1 = __importDefault(__webpack_require__(1));
class Config {
    // Inference
    get inference() {
        let config = this.#config;
        let aiProvider = config.get('aiProvider').trim();
        if (aiProvider === '') {
            aiProvider = 'dAppForge';
        }
        // Load endpoint
        let endpoint = config.get('endpoint').trim();
        if (endpoint.endsWith('/')) {
            endpoint = endpoint.slice(0, endpoint.length - 1).trim();
        }
        if (endpoint === '') {
            endpoint = 'http://127.0.0.1:11434';
        }
        let bearerToken = config.get('bearerToken');
        // Load general paremeters
        let maxLines = config.get('maxLines');
        let maxTokens = config.get('maxTokens');
        let temperature = config.get('temperature');
        // Load model
        let modelName = config.get('model');
        let modelFormat = 'codellama';
        if (modelName === 'custom') {
            modelName = config.get('custom.model');
            modelFormat = config.get('cutom.format');
        }
        else {
            if (modelName.startsWith('deepseek-coder')) {
                modelFormat = 'deepseek';
            }
            else if (modelName.startsWith('stable-code')) {
                modelFormat = 'stable-code';
            }
        }
        let delay = config.get('delay');
        return {
            aiProvider,
            endpoint,
            bearerToken,
            maxLines,
            maxTokens,
            temperature,
            modelName,
            modelFormat,
            delay
        };
    }
    // Notebook
    get notebook() {
        let config = vscode_1.default.workspace.getConfiguration('notebook');
        let includeMarkup = config.get('includeMarkup');
        let includeCellOutputs = config.get('includeCellOutputs');
        let cellOutputLimit = config.get('cellOutputLimit');
        return {
            includeMarkup,
            includeCellOutputs,
            cellOutputLimit,
        };
    }
    get #config() {
        return vscode_1.default.workspace.getConfiguration('inference');
    }
    ;
}
exports.config = new Config();


/***/ }),
/* 28 */
/***/ ((__unused_webpack_module, exports) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.AsyncLock = void 0;
class AsyncLock {
    permits = 1;
    promiseResolverQueue = [];
    async inLock(func) {
        try {
            await this.lock();
            return await func();
        }
        finally {
            this.unlock();
        }
    }
    async lock() {
        if (this.permits > 0) {
            this.permits = this.permits - 1;
            return;
        }
        await new Promise(resolve => this.promiseResolverQueue.push(resolve));
    }
    unlock() {
        this.permits += 1;
        if (this.permits > 1 && this.promiseResolverQueue.length > 0) {
            throw new Error('this.permits should never be > 0 when there is someone waiting.');
        }
        else if (this.permits === 1 && this.promiseResolverQueue.length > 0) {
            // If there is someone else waiting, immediately consume the permit that was released
            // at the beginning of this function and let the waiting function resume.
            this.permits -= 1;
            const nextResolver = this.promiseResolverQueue.shift();
            // Resolve on the next tick
            if (nextResolver) {
                setTimeout(() => {
                    nextResolver(true);
                }, 0);
            }
        }
    }
}
exports.AsyncLock = AsyncLock;


/***/ }),
/* 29 */
/***/ ((__unused_webpack_module, exports) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.setPromptToCache = exports.getFromPromptCache = void 0;
// Remove all newlines, double spaces, etc
function normalizeText(src) {
    src = src.split('\n').join(' ');
    src = src.replace(/\s+/gm, ' ');
    return src;
}
function extractPromptCacheKey(args) {
    if (args.suffix) {
        return normalizeText(args.prefix + ' ##CURSOR## ' + args.suffix);
    }
    else {
        return normalizeText(args.prefix);
    }
}
// TODO: make it LRU
let cache = {};
function getFromPromptCache(args) {
    const key = extractPromptCacheKey(args);
    return cache[key];
}
exports.getFromPromptCache = getFromPromptCache;
function setPromptToCache(args) {
    const key = extractPromptCacheKey(args);
    cache[key] = args.value;
}
exports.setPromptToCache = setPromptToCache;


/***/ }),
/* 30 */
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {

"use strict";

var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.isNotNeeded = exports.isSupported = void 0;
const path_1 = __importDefault(__webpack_require__(23));
function isSupported(doc, aiProvider) {
    return (doc.uri.scheme === 'file' ||
        doc.uri.scheme === 'vscode-notebook-cell' ||
        doc.uri.scheme === 'vscode-remote') &&
        (aiProvider !== 'dAppForge' || (aiProvider === 'dAppForge' && path_1.default.extname(doc.uri.fsPath) === ".rs"));
}
exports.isSupported = isSupported;
function isNotNeeded(doc, position, context) {
    // Avoid autocomplete on empty lines
    // const line = doc.lineAt(position.line).text.trim();
    // if (line.trim() === '') {
    //     return true;
    // }
    // Avoid autocomplete when system menu is shown (ghost text is hidden anyway)
    // if (context.selectedCompletionInfo) {
    //     return true;
    // }
    return false;
}
exports.isNotNeeded = isNotNeeded;


/***/ }),
/* 31 */
/***/ ((__unused_webpack_module, exports) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.ollamaCheckModel = void 0;
async function ollamaCheckModel(endpoint, model, bearerToken) {
    // Check if exists
    let res = await fetch(endpoint + '/api/tags', {
        headers: bearerToken ? {
            Authorization: `Bearer ${bearerToken}`,
        } : {},
    });
    if (!res.ok) {
        console.log(await res.text());
        console.log(endpoint + '/api/tags');
        throw Error('Network response was not ok.');
    }
    let body = await res.json();
    if (body.models.find((v) => v.name === model)) {
        return true;
    }
    else {
        return false;
    }
}
exports.ollamaCheckModel = ollamaCheckModel;


/***/ }),
/* 32 */
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.ollamaDownloadModel = void 0;
const lineGenerator_1 = __webpack_require__(18);
async function ollamaDownloadModel(endpoint, model, bearerToken) {
    console.log('Downloading model from ollama: ' + model);
    for await (let line of (0, lineGenerator_1.lineGenerator)(endpoint + '/api/pull', { name: model }, bearerToken)) {
        console.log('[DOWNLOAD] ' + line);
    }
}
exports.ollamaDownloadModel = ollamaDownloadModel;


/***/ })
/******/ 	]);
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		__webpack_modules__[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
/******/ 	/* webpack/runtime/define property getters */
/******/ 	(() => {
/******/ 		// define getter functions for harmony exports
/******/ 		__webpack_require__.d = (exports, definition) => {
/******/ 			for(var key in definition) {
/******/ 				if(__webpack_require__.o(definition, key) && !__webpack_require__.o(exports, key)) {
/******/ 					Object.defineProperty(exports, key, { enumerable: true, get: definition[key] });
/******/ 				}
/******/ 			}
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/hasOwnProperty shorthand */
/******/ 	(() => {
/******/ 		__webpack_require__.o = (obj, prop) => (Object.prototype.hasOwnProperty.call(obj, prop))
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/make namespace object */
/******/ 	(() => {
/******/ 		// define __esModule on exports
/******/ 		__webpack_require__.r = (exports) => {
/******/ 			if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
/******/ 				Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 			}
/******/ 			Object.defineProperty(exports, '__esModule', { value: true });
/******/ 		};
/******/ 	})();
/******/ 	
/************************************************************************/
/******/ 	
/******/ 	// startup
/******/ 	// Load entry module and return exports
/******/ 	// This entry module is referenced by other modules so it can't be inlined
/******/ 	var __webpack_exports__ = __webpack_require__(0);
/******/ 	module.exports = __webpack_exports__;
/******/ 	
/******/ })()
;
//# sourceMappingURL=extension.js.map