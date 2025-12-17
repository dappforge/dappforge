import { ExtensionContext, WebviewView, commands } from 'vscode'
import { ClientMessage, ServerMessage, User } from '../common/types'
import {
  AUTHENTICATION_EVENT_NAME,
  WEBUI_TABS,
  EVENT_NAME
} from '../common/constants'
import {
  getStoredUser,
  setStoredUser,
  authenticate,
  checkAuthenticationStatus,
  processUpdateEmail,
  processGenerateApiKey
} from './auth-utils'

export class AuthenticationManager {
  _context: ExtensionContext
  _webviewView: WebviewView

  constructor(context: ExtensionContext, webviewView: WebviewView) {
    this._context = context
    this._webviewView = webviewView
    this.setUpEventListeners()
  }

  setUpEventListeners() {
    this._webviewView.webview.onDidReceiveMessage(
      async (message: ClientMessage<string>) => {
        await this.handleMessage(message) // Use await to handle async code
      }
    )
  }

  async handleMessage(message: ClientMessage<string>) {
    switch (message.type) {
      case AUTHENTICATION_EVENT_NAME.getAuthenticationState:
        return await this.getAuthenticationStatus()
      case AUTHENTICATION_EVENT_NAME.authenticate: {
        const { data: authType } = message
        if (authType) {
          return await this.do_authenticate(authType)
        }
        throw new Error('Authentication type is undefined')
      }
      case AUTHENTICATION_EVENT_NAME.updateEmail: {
        const { data: email } = message
        if (email && email.length > 0) {
          return await this.handleEmailUpdate(email)
        }
        throw new Error('Email is undefined')
      }
      case AUTHENTICATION_EVENT_NAME.logout:
        return this.logout()
      case AUTHENTICATION_EVENT_NAME.focusAuthenticationTab:
        return this.focusAuthenticationTab()
      case AUTHENTICATION_EVENT_NAME.displaySettings:
        return this.displaySettingsForm()
      case AUTHENTICATION_EVENT_NAME.generateApiKey:
        return this.generateApiKey()
      case AUTHENTICATION_EVENT_NAME.resetApiRawKey:
        return this.resetapiRawKey()
    }
  }

  public focusAuthenticationTab = () => {
    this._webviewView?.webview.postMessage({
      type: EVENT_NAME.dappforgeSetTab,
      value: {
        data: WEBUI_TABS.authenticate
      }
    } as ServerMessage<string>)
  }

  public displaySettingsForm = () => {
    commands.executeCommand('workbench.action.openSettings', 'dappforge.email')
  }

  async getAuthenticationStatus() {
    // Retrieve user details at the same time check github token is still valid
    await checkAuthenticationStatus((stripeData: object) => {
      this._webviewView.webview.postMessage({
        type: AUTHENTICATION_EVENT_NAME.getAuthenticationState,
        value: {
          data: getStoredUser(),
          stripeData: stripeData
        }
      })
    })
  }

  async do_authenticate(authType: string) {
    await authenticate(authType, () => {
      this._webviewView.webview.postMessage({
        type: AUTHENTICATION_EVENT_NAME.authenticate,
        value: {
          data: getStoredUser()
        }
      })
    })
  }

  async handleEmailUpdate(email: string) {
    await processUpdateEmail(email, async () => {
      await this.getAuthenticationStatus()
    })
  }

  logout() {
    setStoredUser(undefined)
    this._webviewView.webview.postMessage({
      type: AUTHENTICATION_EVENT_NAME.logout
    })
  }

  async generateApiKey() {
    await processGenerateApiKey(() => {
      this._webviewView.webview.postMessage({
        type: AUTHENTICATION_EVENT_NAME.generateApiKey,
        value: {
          data: getStoredUser()
        }
      })
    })
  }

  async resetapiRawKey() {
    const user: User | null | undefined = getStoredUser()
    console.log(`user: ${user}`)
    if (!user) return
    user.apiRawKey = undefined
    setStoredUser(user)
    console.log(`after update user: ${user}`)
    this._webviewView.webview.postMessage({
      type: AUTHENTICATION_EVENT_NAME.resetApiRawKey,
      value: {
        data: getStoredUser()
      }
    })
  }
}
