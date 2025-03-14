import { ExtensionContext, WebviewView, workspace, window, commands, Uri } from 'vscode'
import { ClientMessage, dAppForgeRequestTypes, User } from '../common/types'
import {
  AUTHENTICATION_EVENT_NAME,
} from '../common/constants'
import { 
  getStoredUser, 
  checkAuthenticationStatus,
  userHasValidSubscription,
  getWebSocketUri,
  getBasicAuthToken
} from './auth-utils'
import { Logger } from '../common/logger'
import { WebSocketHandler } from './websocket'
import { updateWebsocketConnection } from './stream'

const logger = new Logger()

export class Stripe {
  _context: ExtensionContext
  _webviewView: WebviewView
  _stripeWebSocket: WebSocketHandler | undefined
  _stripeWebhookWebSocket: WebSocketHandler | undefined

  constructor(context: ExtensionContext, webviewView: WebviewView) {
    this._stripeWebSocket = undefined
    this._stripeWebhookWebSocket = undefined
    this._context = context
    this._webviewView = webviewView
    this.setUpEventListeners()
  }

  private setUpEventListeners = () => {
    this._webviewView.webview.onDidReceiveMessage(
      async (message: ClientMessage<string>) => {
        await this.handleMessage(message); // Use await to handle async code
      }
    );
  }

  // ** Note plugin updates after subscription operations is done via messages 
  // received from the API stripe webhook that send messages to the plugin whenever 
  // the subscription is updated.

  private handleMessage = async (message: ClientMessage<string>) => {
    switch (message.type) {
      case AUTHENTICATION_EVENT_NAME.subscribe: {
        const { data: priceData } = message;
        if (!priceData) {
          throw new Error('Price data is undefined');
        }
        const { priceId, coupon } = JSON.parse(priceData);
        if (priceId && priceId.length > 0) {
          return await this._handleSubscription(priceId, coupon)          
        }
        throw new Error('PriceId is undefined')
      }
      case AUTHENTICATION_EVENT_NAME.retrieveStripeCoupon: {
        const { data: coupon } = message
        if (coupon && coupon.length > 0) {
          return await this._stripeRetrieveCoupon(coupon)          
        }
        throw new Error('Coupon is undefined')
      }
      case AUTHENTICATION_EVENT_NAME.cancelStripeSubscription: {
        const { data: subscriptionId } = message
        if (subscriptionId && subscriptionId.length > 0) {
          return await this._stripeCancelSubscription(subscriptionId)          
        }
        throw new Error('PriceId is undefined')
      }
      case AUTHENTICATION_EVENT_NAME.checkForValidSubscription:
        return this._checkForValidSubscription()
      case AUTHENTICATION_EVENT_NAME.closeStripeWebsocket:
          return this._closeWebhookSocket()
      case AUTHENTICATION_EVENT_NAME.setupStripeWebsockets: {
        const user: User | null | undefined = getStoredUser() 
        if (!user) {
          throw new Error('User is not authenticated')
        }
        return await this._setupStripeWebsocket(                   
          dAppForgeRequestTypes.stripeWebhook,
          getBasicAuthToken(user) ?? '',
          user.accessToken,
          user.id)           
      }
    }
  } 

  // ** Note plugin updates after subscription operations is done via messages 
  // received from the API stripe webhook that send messages to the plugin whenever 
  // the subscription is updated.

  private _handleSubscription = async (priceId: string, coupon: string) => {
    const config = workspace.getConfiguration('dappforge')
    const apiBaseUrl: string |undefined = config.get('apiUri')
    const user: User | null | undefined = getStoredUser()
    if (!user || !apiBaseUrl) return
    if (priceId === 'free') {
        await this._processFreeSubscription(priceId, user, apiBaseUrl)
    } else {
        if (user.subscriptionId && user.subscriptionId !== 'free' && user.subscriptionPriceId != priceId)
          await this._stripeUpdateSubscription(priceId, user, coupon)
        else
          await this._stripeCreateCheckoutSession(priceId, user, coupon)
    }
  }

  private _stripeRetrieveCoupon = async (coupon: string) => {
    //logger.log(`------> _stripeRetrieveCoupon coupon: ${coupon}`)
    const user: User | null | undefined = getStoredUser()
    if (!user) return
    const authorization = getBasicAuthToken(user) || ''
    await this._setupStripeWebsocket(
        dAppForgeRequestTypes.stripe,
        authorization,
        user.accessToken,
        user.id    
    )
    const websocketBody = {
        userId: user.id,
        requestType: 'stripe-retrieve-coupon',       
        request: JSON.stringify({
          coupon: coupon
        }),
        authorization: authorization,
        accessToken: user.accessToken,
    }
    try {
      const response = await this._stripeWebSocket?.sendRequest(websocketBody)
      if (typeof response === 'string') {
          if (response.length > 0) {
            //logger.log(`------> _stripeRetrieveCoupon response: ${response}`)
            const jsonResponse: {  status: number, response: {error?: string, discount?: number } } = JSON.parse(response)
            if (jsonResponse.status != 200 && jsonResponse.status != 404) {
                throw Error(jsonResponse.response.error)
            } else {
              this._webviewView.webview.postMessage({
                type: AUTHENTICATION_EVENT_NAME.retrieveStripeCoupon,
                value: {
                  error: jsonResponse.response.error ?? '',
                  discount: jsonResponse.response.discount          
                }
              }) 
            }
          }
      } else {
          throw new Error('Expected response to be of type string')
      }
    } catch(e) {
      if (e instanceof Error) {
        logger.error(e)
      } else {
        logger.log(`${e}`)
      }
    }
  }

  // ** Note plugin updates after subscription operations is done via messages 
  // received from the API stripe webhook that send messages to the plugin whenever 
  // the subscription is updated.
  private _stripeCancelSubscription = async (subscriptionId: string) => {
    //logger.log(`------> _stripeCancelSubscription subscriptionId: ${subscriptionId}`)
    const user: User | null | undefined = getStoredUser()
    if (!user) return
    const authorization = getBasicAuthToken(user) || ''
    await this._setupStripeWebsocket(
        dAppForgeRequestTypes.stripe,
        authorization,
        user.accessToken,
        user.id    
    )
    const websocketBody = {
        userId: user.id,
        requestType: 'stripe-cancel-subscription',       
        request: JSON.stringify({
          subscriptionId: subscriptionId
        }),
        authorization: authorization,
        accessToken: user.accessToken,
    }
    try {
      const response = await this._stripeWebSocket?.sendRequest(websocketBody)
      if (typeof response === 'string') {
          if (response.length > 0) {
            //logger.log(`------> _stripeCancelSubscription response: ${response}`)
            const jsonResponse: {  status: number, response: {error?: string, cancelResult?: string } } = JSON.parse(response)
            if (jsonResponse.status != 200) {
                throw Error(jsonResponse.response.error)
            }
          }
      } else {
          throw new Error('Expected response to be of type string')
      }
    } catch(e) {
      if (e instanceof Error) {
        logger.error(e)
      } else {
        logger.log(`${e}`)
      }
    }
  }

  private _stripeUpdateSubscription = async (priceId: string, user: User, coupon: string) => {
    const authorization = getBasicAuthToken(user) || ''
    await this._setupStripeWebsocket(
        dAppForgeRequestTypes.stripe,
        authorization,
        user.accessToken,
        user.id    
    )
    const websocketBody = {
        userId: user.id,
        requestType: 'stripe-update-subscription',       
        request: JSON.stringify({
          priceId: priceId, 
          subscriptionId: user.subscriptionId,
          subscriptionItemId: user.subscriptionItemId,
          coupon: coupon
        }),
        authorization: authorization,
        accessToken: user.accessToken,
    }
    try {
      const response = await this._stripeWebSocket?.sendRequest(websocketBody)
      if (typeof response === 'string') {
          if (response.length > 0) {
            //logger.log(`------> _stripeUpdateSubscription response: ${response}`)
            const jsonResponse: {  status: number, response: {error?: string, updateResult?: string } } = JSON.parse(response)
            if (jsonResponse.status != 200) {
                throw Error(jsonResponse.response.error)
            }
          }
      } else {
          throw new Error('Expected response to be of type string')
      }
    } catch(e) {
      if (e instanceof Error) {
        logger.error(e)
      } else {
        logger.log(`${e}`)
      }
    }
  }

  private _stripeCreateCheckoutSession = async (priceId: string, user: User, coupon: string) => {
    const authorization = getBasicAuthToken(user) || ''
    await this._setupStripeWebsocket(
        dAppForgeRequestTypes.stripe,
        authorization,
        user.accessToken,
        user.id    
    )
    const websocketBody = {
        userId: user.id,
        requestType: 'stripe-create-checkout-session',       
        request: JSON.stringify({priceId: priceId, coupon: coupon}),
        authorization: authorization,
        accessToken: user.accessToken,
    }
    try {
      const response = await this._stripeWebSocket?.sendRequest(websocketBody)
      if (typeof response === 'string') {
          if (response.length > 0) {
            //logger.log(`------> stripeCreateCheckoutSession response: ${response}`)
            const jsonResponse: {  status: number, response: {error?: string, url?: string, subscriptionFound?: string } } = JSON.parse(response)
            if (jsonResponse.status != 200) {
                // Check if subscription already exists, if so a 302 will be returned
                //console.log(`------> stripeCreateCheckoutSession jsonResponse: ${JSON.stringify(jsonResponse)}`)
                if (jsonResponse.status == 302 && jsonResponse.response.subscriptionFound) {
                  //logger.log(`------> stripeCreateCheckoutSession found active subscription: ${JSON.stringify(jsonResponse.response.subscriptionFound)}`)
                  window.showInformationMessage('Found an existing active subscription.')
                  await checkAuthenticationStatus((stripeData: object) => {
                    this._webviewView.webview.postMessage({
                      type: AUTHENTICATION_EVENT_NAME.getAuthenticationState,
                      value: {
                        data: getStoredUser(),
                        stripeData: stripeData          
                      }
                    })})  
                    this._checkForValidSubscription()            
                } else {
                  throw Error(jsonResponse.response.error)
                }
            } else if (jsonResponse.response.url && jsonResponse.response.url.length > 0) {
              commands.executeCommand(
                  'vscode.open',
                  Uri.parse(jsonResponse.response.url)
              )
            }
          }
      } else {
          throw new Error('Expected response to be of type string')
      }
    } catch(e) {
      if (e instanceof Error) {
        logger.error(e)
      } else {
        logger.log(`${e}`)
      }
    }
  }

  private _processFreeSubscription = async (priceId:string, user: User, apiBaseUrl: string) => {
    let error = ''
    const url = `${apiBaseUrl}/stripe/subscribe-free/${priceId}/${user.id}`

    try {
          //logger.log(`~~~~~> processFreeSubscription url: ${url}`)
          const fetchOptions = {
              method: 'POST',
              headers: {
                authorization: `Basic ${getBasicAuthToken(user)}`,
                'access-token': user.accessToken,
                'Content-Type': 'application/json'
              }
          }      

          const response = await fetch(
              url,
              fetchOptions
          );
          //logger.log(`~~~~~> processFreeSubscription status: ${response.status}`)
          if (!response.ok) {
              throw Error('dAppForge: Unable to process subscription');
          }
      } catch (e: unknown) {
          if (e instanceof Error) {
              error = e.message
              logger.error(e)
          } else {
              error = `-----> processFreeSubscription: error: ${e}`
              logger.log(error)
          }
          window.showErrorMessage(error);
      } finally {
          await checkAuthenticationStatus(() => {
            this._webviewView.webview.postMessage({
              type: AUTHENTICATION_EVENT_NAME.subscribe,
              value: {
                data: error
              }
          })})
      }
  }

  private _checkForValidSubscription = () => {
    const error = userHasValidSubscription()
    const isValid = !(error && error.length > 0)
    this._webviewView.webview.postMessage({
      type: AUTHENTICATION_EVENT_NAME.checkForValidSubscription,
      value: {
        data: isValid
      }
    })
  }

  private _processWebhookMessage = async (message: unknown) => {
    //console.log('~~~~~> _processWebhookMessage message received:', message);
    try {
        if (typeof message === 'object') {
          if (message) {
            const msg = message as { status: number, response: { subscriptionUpdated?: boolean } };
            if (msg.status != 200) {
              throw Error('Received a failed message from the API')
            }
            if (msg.response.subscriptionUpdated) {
              await checkAuthenticationStatus(() => {
                this._webviewView.webview.postMessage({
                  type: AUTHENTICATION_EVENT_NAME.subscribe,
                  value: {
                    data: ''
                  }
              })})
            }
          }
        } else {
          throw new Error('Expected response to be of type object')
        }
      } catch(e) {
        if (e instanceof Error) {
          logger.error(e)
        } else {
          logger.log(`${e}`)
        }
      }   

  }

  private _setupStripeWebsocket = async (
      requestType: string,
      authorization: string,
      accessToken: string,
      userId: string
    
  ): Promise<void> => {
      const url = getWebSocketUri(requestType) || ''
      let webSocket: WebSocketHandler | undefined = undefined
      let newSocket = false

      if (requestType == dAppForgeRequestTypes.stripe) {
          if (!this._stripeWebSocket || !this._stripeWebSocket.isSocketOpen()) {
              this._stripeWebSocket = new WebSocketHandler(url)
              newSocket = true
          }        
          webSocket = this._stripeWebSocket
      } else if (requestType == dAppForgeRequestTypes.stripeWebhook) {
          if (!this._stripeWebhookWebSocket || !this._stripeWebhookWebSocket.isSocketOpen()) {
              this._stripeWebhookWebSocket = new WebSocketHandler(url, this._processWebhookMessage)
              newSocket = true
          }        
          webSocket = this._stripeWebhookWebSocket
      }

      if (!webSocket) throw Error('Unable to create websocket')

      if (webSocket && webSocket.getNewUrl() !== url) webSocket.setNewUrl(url)

      if (newSocket) { 
          await updateWebsocketConnection(
              requestType,
              authorization,
              accessToken,
              userId,
              webSocket
          )  
      }
  }

  private _closeWebhookSocket = () => {
    if (this._stripeWebhookWebSocket) {
        this._stripeWebhookWebSocket.closeSocket()
        this._stripeWebhookWebSocket = undefined
    }
  }
  

}
