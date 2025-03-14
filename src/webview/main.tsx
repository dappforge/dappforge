import { useEffect, useState } from 'react'
import { Chat } from './chat'
import { ServerMessage, ClientMessage } from '../common/types'
import { EVENT_NAME, WEBUI_TABS } from '../common/constants'
import { ConversationHistory } from './conversation-history'
import { Authentication } from './authenticate'
import { useAuthentication } from './hooks'
import { Settings } from './settings'
import {
  AUTHENTICATION_EVENT_NAME
} from '../common/constants'
  
const tabs: Record<string, JSX.Element> = {
  [WEBUI_TABS.authenticate]: <Authentication />,
  [WEBUI_TABS.chat]: <Chat />,
  [WEBUI_TABS.settings]: <Settings />,
  //[WEBUI_TABS.providers]: <Providers />
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const global = globalThis as any
export const Main = () => {  
  const {completed, user} = useAuthentication()
  const [tab, setTab] = useState<string | undefined>(WEBUI_TABS.chat)

  const handler = (event: MessageEvent) => {
    const message: ServerMessage<string | undefined> = event.data
    if (message?.type === EVENT_NAME.dappforgeSetTab) {
      setTab(message?.value.data)
    }
  }

  const validEmail = (email: string | undefined) => {
    return email && email.trim().length > 0 &&
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) 
  }

  useEffect(() => {
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, []);

  useEffect(() => {
    if (completed && (
      !user || 
      !validEmail(user.email)) ) { //&& tab !== WEBUI_TABS.authenticate) {
      setTab(WEBUI_TABS.authenticate);
      //if (user && !validEmail(user.email)) {
      //  global.vscode.postMessage({
      //    type: AUTHENTICATION_EVENT_NAME.displaySettings
      //  } as ClientMessage)
      //}
    }
  }, [completed, user, tab]); 

  if (!completed) {
    return <div>Loading...</div>; // Display a loading indicator while checking authentication
  }

  //getUser()
  //if (!user) return tabs[WEBUI_TABS.authenticate]

  if (!tab) {
    return null
  }

  if (tab === WEBUI_TABS.history) {
    return <ConversationHistory onSelect={() => setTab(WEBUI_TABS.chat)} />
  }

  const element: JSX.Element = tabs[tab]

  return element || null
}
