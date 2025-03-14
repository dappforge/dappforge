import { workspace, window, commands, Uri, StatusBarItem } from 'vscode'
import { getContext } from './context'
import { 
    USER_STORAGE_KEY, 
    SERVER_PORT, API_USERNAME, 
    WEBSOCKET_URI_STORAGE_KEY, 
    ACTIVE_FIM_PROVIDER_STORAGE_KEY,
    STATUSBAR_ICON,
    STATUSBAR_NOT_AUTH,
    ACTIVE_CHAT_PROVIDER_STORAGE_KEY,
    SUBSCRIPTION_UNLIMITED_TOKENS
 } from '../common/constants'
import { User, dAppForgeRequestTypes, StripeProduct } from '../common/types'
import polka from 'polka'
import { updateGlobalState } from './global-state-manager'
import { Logger } from '../common/logger'
import { DappforgeProvider } from './provider-manager'
import { extractHostAndPort } from './utils'
import { getDateFromUnixTimestamp } from '../webview/utils'

const logger = new Logger()

function isAuthenticated(): boolean {
    const user = getStoredUser();
    if (user && user.email && user.email.trim().length > 0) return true
    return false
}

export function userHasValidSubscription(): string {
    let error = ''
    if (isAuthenticated()) { 
        const user = getStoredUser();
        //console.log(`userHasValidSubscription user: ${JSON.stringify(user)}`)
        if (user !== null && 
            user !== undefined) {
            if (!user.subscriptionId || user.subscriptionId.length <= 0)
                error = 'You do not have a valid subscription.'
            else if (user.tokenCount != SUBSCRIPTION_UNLIMITED_TOKENS && (!user.tokenCount || user.tokenCount <= 0))
                error = 'You do not have anough tokens left to perform any actions.'
            else if (user.subscriptionId !== 'free' && 
                (!user.subscriptionCurrentPeriodEnd || 
                user.subscriptionCurrentPeriodEnd.length <= 0 ||
                getDateFromUnixTimestamp(user.subscriptionCurrentPeriodEnd).getTime() < Date.now()))
                error = 'You do not have a valid subscription, it may have expired.'
        }
    } else {
        error = 'Please login using GitHub or Google'    
    }
    if (error.length > 0) window.showErrorMessage(error);
    return error 
}
  
export function getStoredUser(): User | null | undefined {
    const context = getContext()
    let user: User | null | undefined = undefined
    if (context) user = context.globalState.get<User>(USER_STORAGE_KEY)
    return user
}

export function setStoredUser(user: User | undefined | null) {
     // Update using this function as we use it to monitor changes 
    // in globalStatus, we can then trigger a function to update the statusbar etc.
    //console.log(`setStoredUser user: ${JSON.stringify(user)}`)
    updateGlobalState(USER_STORAGE_KEY, user)
    return getStoredUser()
}
  
export function getWebSocketUri(requestType: string): string | null | undefined {
    const context = getContext()
    let uri: string | null | undefined = undefined
    if (context) uri = context.globalState.get<string>(`${WEBSOCKET_URI_STORAGE_KEY}-${requestType}`)
    return uri
}

function setWebSocketUri(requestType: string, uri: string | undefined | null): string | null | undefined {
    const context = getContext()
    if (context) context.globalState.update(`${WEBSOCKET_URI_STORAGE_KEY}-${requestType}`, uri)
    return getWebSocketUri(requestType)
}

let app: polka.Polka | null = null
export const authenticate = async (authType: string, fn?: () => void) => {
    const config = workspace.getConfiguration('dappforge')
    const apiBaseUrl = config.get('apiUri')

    if (app && app.server) { 
        app.server.close() 
    }

    app = polka()

    app.get('/auth/:id/:accessToken/:apiPassword/:authType', async (req, res) => {
        const { id, accessToken, apiPassword } = req.params
        if (!accessToken || !apiPassword || !authType) {
            res.end('<h1>Failed to authenticate, something went wrong</h1>')
            return
        }
        //logger.log(`-----> authenticate: received auth info from user id: ${id}`)
        const user: User = {
            id: id,
            accessToken: accessToken,
            apiPassword: apiPassword,
            authType: authType
        }
        setStoredUser(user)

        if (fn) { fn() }
  
        res.end('<h1>dAppForge authentication was successful, you can close this now</h1>')
  
        if (app && app.server) app.server.close()
        app = null
    })
  
    app.listen(SERVER_PORT, (err: Error) => {
        if (err) {
            window.showErrorMessage(err.message)
            logger.error(err)
        } else {
            let url = `${apiBaseUrl}/auth/github`
            if (authType == 'google') url = `${apiBaseUrl}/auth/google`               
            commands.executeCommand(
                'vscode.open',
                Uri.parse(url)
            )
        }
    })
}

// Check github token is still active, retrieve user details as the same time
export const processUpdateEmail = async (email: string, fn?: () => void) => {
    const config = workspace.getConfiguration('dappforge')
    const apiBaseUrl: string |undefined = config.get('apiUri')
    const user: User | null | undefined = getStoredUser()
    if (!user || !apiBaseUrl) return

    let error = ''
    const url = `${apiBaseUrl}/auth/update-email/${user.id}`

    try {
        //logger.log(`~~~~~> processUpdateEmail url: ${url}`)
        const fetchOptions = {
            method: 'POST',
            headers: {
              authorization: `Basic ${getBasicAuthToken(user)}`,
              'access-token': user.accessToken,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({email: email})
          }      

        const response = await fetch(
            url,
            fetchOptions
        );
        //logger.log(`~~~~~> processUpdateEmail status: ${response.status}`)
        if (!response.ok) {
            throw Error('dAppForge: Unable to update email');
        }
    } catch (e: unknown) {
        if (e instanceof Error) {
            error = e.message
            logger.error(e)
        } else {
            error = `-----> processUpdateEmail: error: ${e}`
            logger.log(error)
        }
       window.showErrorMessage(error);
     } finally {
        if (fn) { fn() }
    }
}

// Check github token is still active, retrieve user details as the same time
export const checkAuthenticationStatus = async (fn?: (stripeData: object) => void) => {
    const config = workspace.getConfiguration('dappforge')
    const apiBaseUrl = config.get('apiUri')
    //logger.log(`~~~~~> checkAuthenticationStatus apiBaseUrl: ${apiBaseUrl}`)
    let user: User | null | undefined = getStoredUser()
    const stripeData: { stripeProducts: StripeProduct[] } = {
        stripeProducts: []
    }
    if (!user) {
        if (fn) { fn(stripeData) }
    } else {
        try {
            let url = `${apiBaseUrl}/auth/check/${user.id}`
            if (user.authType == 'google') url = `${apiBaseUrl}/auth/google_check/${user.id}`
            const response = await fetch(
                url,
                {
                    headers: {
                        authorization: `Basic ${getBasicAuthToken(user)}`,
                        'access-token': user.accessToken
                    }
                }
            );
            //logger.log(`~~~~~> checkAuthenticationStatus: status: ${response.status}`)
            if (!response.ok || !response.body) {
                throw Error('dAppForge: Unable to connect to API');
            }
            const txt = await response.text()
            const data = JSON.parse(txt)
            //logger.log(`<~~~~~ checkAuthenticationStatus json response: ${JSON.stringify(data, undefined, 2)}`)
            if (data && Object.prototype.hasOwnProperty.call(data, 'user') && Object.keys(data['user']).length > 0) {
                const userData = data['user'];
                user = {
                  ...user,
                  fullName: userData.fullName,
                  tokenCount: Number(userData.tokenCount),
                  avatarUrl: userData.avatarUrl,
                  subscriptionId: userData.subscriptionId,
                  subscriptionCurrentPeriodEnd: userData.subscriptionCurrentPeriodEnd,
                  subscriptionTokens: Number(userData.subscriptionTokens),
                  subscriptionUsedFree: userData.subscriptionUsedFree,
                  subscriptionName: userData.subscriptionName,
                  subscriptionInterval: userData.subscriptionInterval,
                  subscriptionPriceId: userData.subscriptionPriceId,
                  subscriptionItemId: userData.subscriptionItemId,
                  email: userData.email
                }
                setStoredUser(user)
            } else {
                throw Error('dAppForge: Could not obtain user details from API')
            }
            if (data && 
                Object.prototype.hasOwnProperty.call(data, 'completionWebSocketUri') && data['completionWebSocketUri'].length > 0 &&
                Object.prototype.hasOwnProperty.call(data, 'chatWebSocketUri') && data['chatWebSocketUri'].length > 0 && 
                Object.prototype.hasOwnProperty.call(data, 'aiApiWebSocketUri') && data['aiApiWebSocketUri'].length > 0 && 
                Object.prototype.hasOwnProperty.call(data, 'tokenCountWebSocketUri') && data['tokenCountWebSocketUri'].length > 0 &&
                Object.prototype.hasOwnProperty.call(data, 'stripeWebSocketUri') && data['stripeWebSocketUri'].length > 0 &&
                Object.prototype.hasOwnProperty.call(data, 'stripeWebhookWebSocketUri') && data['stripeWebhookWebSocketUri'].length > 0) {
                //if (getWebSocketUri() !== data['websocketuri']) {
                setWebSocketUri(dAppForgeRequestTypes.autocompletion, data['completionWebSocketUri'])
                updateProviders(dAppForgeRequestTypes.autocompletion, data['completionWebSocketUri'])
                setWebSocketUri(dAppForgeRequestTypes.chat, data['chatWebSocketUri'])
                updateProviders(dAppForgeRequestTypes.chat, data['chatWebSocketUri'])
                setWebSocketUri(dAppForgeRequestTypes.reduceCount, data['tokenCountWebSocketUri'])
                setWebSocketUri(dAppForgeRequestTypes.feedback, data['aiApiWebSocketUri'])
                setWebSocketUri(dAppForgeRequestTypes.stripe, data['stripeWebSocketUri'])
                setWebSocketUri(dAppForgeRequestTypes.stripeWebhook, data['stripeWebhookWebSocketUri'])
                if (Object.prototype.hasOwnProperty.call(data, 'stripeProducts') && data['stripeProducts'].length > 0) {
                    stripeData['stripeProducts'] = data['stripeProducts']
                }
               //}
            } else {
                throw Error('dAppForge: Could not obtain websocket URI from API')
            }
        } catch (e: unknown) {
            setStoredUser(undefined)
            window.showErrorMessage('Please login using GitHub or Google');
            if (e instanceof Error) {
              logger.error(e)
            } else {
              logger.log(`-----> checkAuthenticationStatus: error: ${e}`)
            }
        } finally {
            if (fn) { fn(stripeData) }
        }
    }
}

export function getBasicAuthToken(user: User): string | null {
    return Buffer.from(API_USERNAME + ':' + user.apiPassword).toString('base64')
}

export function updateStatusBar(statusBar: StatusBarItem) {
    const subscriptionError = userHasValidSubscription()
    if (subscriptionError.length <= 0) {
        statusBar.text = STATUSBAR_ICON;
        statusBar.tooltip = ''
    } else {
        statusBar.text = STATUSBAR_NOT_AUTH
        statusBar.tooltip = subscriptionError
    }
}

export async function updateTokenCount(count: number) {
    const user: User | null | undefined = getStoredUser()
    if (user) {
        user.tokenCount = count
    }
    setStoredUser(user)
}

function updateProviders(requestType: string, uri: string) {
    const context = getContext()
    if (context) {
        const fimProvider = context.globalState.get<DappforgeProvider>(
            ACTIVE_FIM_PROVIDER_STORAGE_KEY
        ) 
        const chatProvider = context.globalState.get<DappforgeProvider>(
            ACTIVE_CHAT_PROVIDER_STORAGE_KEY
        ) 
        const { host, port} = extractHostAndPort(uri)
        if (fimProvider && requestType == dAppForgeRequestTypes.autocompletion) {
            fimProvider.apiPath = uri
            fimProvider.apiHostname = host
            if (port) fimProvider.apiPort = port
            context.globalState.update(ACTIVE_FIM_PROVIDER_STORAGE_KEY, fimProvider)
        }
        if (chatProvider && requestType == dAppForgeRequestTypes.chat) {
            chatProvider.apiPath = uri
            chatProvider.apiHostname = host
            if (port) chatProvider.apiPort = port
            context.globalState.update(ACTIVE_CHAT_PROVIDER_STORAGE_KEY, chatProvider)
        }
    }
  }  