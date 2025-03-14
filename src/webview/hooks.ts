import { useEffect, useState } from 'react'

import {
  CONVERSATION_EVENT_NAME,
  WORKSPACE_STORAGE_KEY,
  EVENT_NAME,
  PROVIDER_EVENT_NAME,
  AUTHENTICATION_EVENT_NAME
} from '../common/constants'
import {
  ApiModel,
  ClientMessage,
  Conversation,
  LanguageType,
  ServerMessage,
  StripeProduct,
  ThemeType,
  User
} from '../common/types'
import { DappforgeProvider } from '../extension/provider-manager'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const global = globalThis as any

export const useSelection = (onSelect?: () => void) => {
  const [selection, setSelection] = useState('')
  const handler = (event: MessageEvent) => {
    const message: ServerMessage = event.data
    if (message?.type === EVENT_NAME.dappforgeTextSelection) {
      setSelection(message?.value.completion.trim())
      onSelect?.()
    }
  }

  useEffect(() => {
    window.addEventListener('message', handler)
    global.vscode.postMessage({
      type: EVENT_NAME.dappforgeTextSelection
    })
    return () => window.removeEventListener('message', handler)
  }, [])

  return selection
}

export const useGlobalContext = <T>(key: string) => {
  const [context, setContextState] = useState<T | undefined>()

  const handler = (event: MessageEvent) => {
    const message: ServerMessage = event.data
    if (message?.type === `${EVENT_NAME.dappforgeGlobalContext}-${key}`) {
      setContextState(event.data.value)
    }
  }

  const setContext = (value: T) => {
    setContextState(value)
    global.vscode.postMessage({
      type: EVENT_NAME.dappforgeSetGlobalContext,
      key,
      data: value
    })
  }

  useEffect(() => {
    window.addEventListener('message', handler)

    global.vscode.postMessage({
      type: EVENT_NAME.dappforgeGlobalContext,
      key
    })

    return () => window.removeEventListener('message', handler)
  }, [])

  return { context, setContext }
}

export const useSessionContext = <T>(key: string) => {
  const [context, setContext] = useState<T>()

  const handler = (event: MessageEvent) => {
    const message: ServerMessage = event.data
    if (message?.type === `${EVENT_NAME.dappforgeSessionContext}-${key}`) {
      setContext(event.data.value)
    }
  }

  useEffect(() => {
    window.addEventListener('message', handler)
    global.vscode.postMessage({
      type: EVENT_NAME.dappforgeSessionContext,
      key
    })
    return () => window.removeEventListener('message', handler)
  }, [])

  return { context, setContext }
}

export const useWorkSpaceContext = <T>(key: string) => {
  const [context, setContext] = useState<T>()

  const handler = (event: MessageEvent) => {
    const message: ServerMessage = event.data
    if (message?.type === `${EVENT_NAME.dappforgeWorkspaceContext}-${key}`) {
      setContext(event.data.value)
    }
  }

  useEffect(() => {
    window.addEventListener('message', handler)
    global.vscode.postMessage({
      type: EVENT_NAME.dappforgeWorkspaceContext,
      key
    })

    return () => window.removeEventListener('message', handler)
  }, [])

  return { context, setContext }
}

export const useTheme = () => {
  const [theme, setTheme] = useState<ThemeType | undefined>()
  const handler = (event: MessageEvent) => {
    const message: ServerMessage<ThemeType> = event.data
    if (message?.type === EVENT_NAME.dappforgeSendTheme) {
      setTheme(message?.value.data)
    }
    return () => window.removeEventListener('message', handler)
  }
  useEffect(() => {
    global.vscode.postMessage({
      type: EVENT_NAME.dappforgeSendTheme
    })
    window.addEventListener('message', handler)
    return () => window.removeEventListener('message', handler)
  }, [])
  return theme
}

export const useLoading = () => {
  const [loader, setLoader] = useState<string | undefined>()
  const handler = (event: MessageEvent) => {
    const message: ServerMessage<string> = event.data
    if (message?.type === EVENT_NAME.dappforgeSendLoader) {
      setLoader(message?.value.data)
    }
    return () => window.removeEventListener('message', handler)
  }
  useEffect(() => {
    global.vscode.postMessage({
      type: EVENT_NAME.dappforgeSendLoader
    })
    window.addEventListener('message', handler)
    return () => window.removeEventListener('message', handler)
  }, [])
  return loader
}

export const useLanguage = (): LanguageType | undefined => {
  const [language, setLanguage] = useState<LanguageType | undefined>()
  const handler = (event: MessageEvent) => {
    const message: ServerMessage = event.data
    if (message?.type === EVENT_NAME.dappforgeSendLanguage) {
      setLanguage(message?.value.data)
    }
    return () => window.removeEventListener('message', handler)
  }
  useEffect(() => {
    global.vscode.postMessage({
      type: EVENT_NAME.dappforgeSendLanguage
    })
    window.addEventListener('message', handler)
    return () => window.removeEventListener('message', handler)
  }, [])
  return language
}

export const useTemplates = () => {
  const [templates, setTemplates] = useState<string[]>()
  const handler = (event: MessageEvent) => {
    const message: ServerMessage<string[]> = event.data
    if (message?.type === EVENT_NAME.dappforgeListTemplates) {
      setTemplates(message?.value.data)
    }
    return () => window.removeEventListener('message', handler)
  }

  const saveTemplates = (templates: string[]) => {
    global.vscode.postMessage({
      type: EVENT_NAME.dappforgeSetWorkspaceContext,
      key: WORKSPACE_STORAGE_KEY.selectedTemplates,
      data: templates
    } as ClientMessage<string[]>)
  }

  useEffect(() => {
    global.vscode.postMessage({
      type: EVENT_NAME.dappforgeListTemplates
    })
    window.addEventListener('message', handler)
    return () => window.removeEventListener('message', handler)
  }, [])
  return { templates, saveTemplates }
}

export const useProviders = () => {
  const [providers, setProviders] = useState<Record<string, DappforgeProvider>>({})
  const [chatProvider, setChatProvider] = useState<DappforgeProvider>()
  const [fimProvider, setFimProvider] = useState<DappforgeProvider>()
  const handler = (event: MessageEvent) => {
    const message: ServerMessage<
      Record<string, DappforgeProvider> | DappforgeProvider
    > = event.data
    if (message?.type === PROVIDER_EVENT_NAME.getAllProviders) {
      if (message.value.data) {
        const providers = message.value.data as Record<string, DappforgeProvider>
        setProviders(providers)
      }
    }
    if (message?.type === PROVIDER_EVENT_NAME.getActiveChatProvider) {
      if (message.value.data) {
        const provider = message.value.data as DappforgeProvider
        setChatProvider(provider)
      }
    }
    if (message?.type === PROVIDER_EVENT_NAME.getActiveFimProvider) {
      if (message.value.data) {
        const provider = message.value.data as DappforgeProvider
        setFimProvider(provider)
      }
    }
    return () => window.removeEventListener('message', handler)
  }

  const saveProvider = (provider: DappforgeProvider) => {
    global.vscode.postMessage({
      type: PROVIDER_EVENT_NAME.addProvider,
      data: provider
    } as ClientMessage<DappforgeProvider>)
  }

  const copyProvider = (provider: DappforgeProvider) => {
    global.vscode.postMessage({
      type: PROVIDER_EVENT_NAME.copyProvider,
      data: provider
    } as ClientMessage<DappforgeProvider>)
  }

  const updateProvider = (provider: DappforgeProvider) => {
    global.vscode.postMessage({
      type: PROVIDER_EVENT_NAME.updateProvider,
      data: provider
    } as ClientMessage<DappforgeProvider>)
  }

  const removeProvider = (provider: DappforgeProvider) => {
    global.vscode.postMessage({
      type: PROVIDER_EVENT_NAME.removeProvider,
      data: provider
    } as ClientMessage<DappforgeProvider>)
  }

  const setActiveFimProvider = (provider: DappforgeProvider) => {
    global.vscode.postMessage({
      type: PROVIDER_EVENT_NAME.setActiveFimProvider,
      data: provider
    } as ClientMessage<DappforgeProvider>)
  }

  const setActiveChatProvider = (provider: DappforgeProvider) => {
    global.vscode.postMessage({
      type: PROVIDER_EVENT_NAME.setActiveChatProvider,
      data: provider
    } as ClientMessage<DappforgeProvider>)
  }

  const getProvidersByType = (type: string) => {
    return Object.values(providers).filter(
      (provider) => provider.type === type
    ) as DappforgeProvider[]
  }

  const resetProviders = () => {
    global.vscode.postMessage({
      type: PROVIDER_EVENT_NAME.resetProvidersToDefaults
    } as ClientMessage<DappforgeProvider>)
  }

  useEffect(() => {
    global.vscode.postMessage({
      type: PROVIDER_EVENT_NAME.getAllProviders
    })
    global.vscode.postMessage({
      type: PROVIDER_EVENT_NAME.getActiveChatProvider
    })
    global.vscode.postMessage({
      type: PROVIDER_EVENT_NAME.getActiveFimProvider
    })
    window.addEventListener('message', handler)
    return () => window.removeEventListener('message', handler)
  }, [])

  return {
    chatProvider,
    copyProvider,
    fimProvider,
    getProvidersByType,
    providers,
    removeProvider,
    resetProviders,
    saveProvider,
    setActiveChatProvider,
    setActiveFimProvider,
    updateProvider
  }
}

export const useConfigurationSetting = (key: string) => {
  const [configurationSetting, setConfigurationSettings] = useState<
    string | boolean | number
  >()

  const handler = (event: MessageEvent) => {
    const message: ServerMessage<string | boolean | number> = event.data
    if (
      message?.type === EVENT_NAME.dappforgeGetConfigValue &&
      message.value.type === key
    ) {
      setConfigurationSettings(message?.value.data)
    }
  }

  useEffect(() => {
    global.vscode.postMessage({
      type: EVENT_NAME.dappforgeGetConfigValue,
      key
    })
    window.addEventListener('message', handler)
    return () => window.removeEventListener('message', handler)
  }, [key])

  return { configurationSetting }
}

export const useConversationHistory = () => {
  const [conversations, setConversations] = useState<
    Record<string, Conversation>
  >({})
  const [conversation, setConversation] = useState<Conversation>()

  const getConversations = () => {
    global.vscode.postMessage({
      type: CONVERSATION_EVENT_NAME.getConversations
    } as ClientMessage<string>)
  }

  const getActiveConversation = () => {
    global.vscode.postMessage({
      type: CONVERSATION_EVENT_NAME.getActiveConversation
    })
  }

  const removeConversation = (conversation: Conversation) => {
    global.vscode.postMessage({
      type: CONVERSATION_EVENT_NAME.removeConversation,
      data: conversation
    } as ClientMessage<Conversation>)
  }

  const setActiveConversation = (conversation: Conversation | undefined) => {
    global.vscode.postMessage({
      type: CONVERSATION_EVENT_NAME.setActiveConversation,
      data: conversation
    } as ClientMessage<Conversation | undefined>)
    setConversation(conversation)
  }

  const saveLastConversation = (conversation: Conversation | undefined) => {
    global.vscode.postMessage({
      type: CONVERSATION_EVENT_NAME.saveConversation,
      data: conversation
    } as ClientMessage<Conversation>)
  }

  const clearAllConversations = () => {
    global.vscode.postMessage({
      type: CONVERSATION_EVENT_NAME.clearAllConversations
    } as ClientMessage<string>)
  }

  const handler = (event: MessageEvent) => {
    const message = event.data
    if (message.value?.data) {
      if (message?.type === CONVERSATION_EVENT_NAME.getConversations) {
        setConversations(message.value.data)
      }
      if (message?.type === CONVERSATION_EVENT_NAME.getActiveConversation) {
        setConversation(message.value.data as Conversation)
      }
    }
  }

  useEffect(() => {
    getConversations()
    getActiveConversation()
    window.addEventListener('message', handler)

    return () => window.removeEventListener('message', handler)
  }, [])

  return {
    conversations,
    conversation,
    getConversations,
    removeConversation,
    saveLastConversation,
    clearAllConversations,
    setActiveConversation
  }
}

export const useOllamaModels = () => {
  const [models, setModels] = useState<ApiModel[] | undefined>([])
  const handler = (event: MessageEvent) => {
    const message: ServerMessage<ApiModel[]> = event.data
    if (message?.type === EVENT_NAME.dappforgeFetchOllamaModels) {
      setModels(message?.value.data)
    }
    return () => window.removeEventListener('message', handler)
  }

  useEffect(() => {
    global.vscode.postMessage({
      type: EVENT_NAME.dappforgeFetchOllamaModels
    })
    window.addEventListener('message', handler)
    return () => window.removeEventListener('message', handler)
  }, [])

  return { models }
}

const useAutosizeTextArea = (
  chatRef: React.RefObject<HTMLTextAreaElement> | null,
  value: string
) => {
  useEffect(() => {
    if (chatRef?.current) {
      chatRef.current.style.height = '0px'
      const scrollHeight = chatRef.current.scrollHeight
      chatRef.current.style.height = `${scrollHeight + 5}px`
    }
  }, [chatRef, value])
}

export const useAuthentication = () => {
  const [user, setUser] = useState<User | null>(null); // Store the authenticated user
  const [completed, setCompleted] = useState<boolean>(false); 
  const [stripeProducts, setStripeProducts] = useState<Array<StripeProduct> | null>(null); // Store the authenticated user
  const [updatingEmail, setUpdatingEmail] = useState(false);

  const updateEmail = async (email: string) => {
    setUpdatingEmail(true);
    global.vscode.postMessage({
      type: AUTHENTICATION_EVENT_NAME.updateEmail,
      data: email
    } as ClientMessage<string>);    
  };

  // Function to handle the authentication state
  const getAuthenticationState = () => {
    setCompleted(false)
    global.vscode.postMessage({
      type: AUTHENTICATION_EVENT_NAME.getAuthenticationState,
    } as ClientMessage<null>);
  };

  // Function to authenticate the user
  const authenticate = (authType: string) => {
    setCompleted(false)
    global.vscode.postMessage({
      type: AUTHENTICATION_EVENT_NAME.authenticate,
      data: authType
    } as ClientMessage<string>);
  };

  // Function to logout the user
  const logout = () => {
    setCompleted(false)
    global.vscode.postMessage({
      type: AUTHENTICATION_EVENT_NAME.logout,
    } as ClientMessage<null>);
    global.vscode.postMessage({
      type: AUTHENTICATION_EVENT_NAME.closeStripeWebsocket,
    } as ClientMessage<null>);

  };  

  // Handler to receive messages from the VS Code extension host
  const messageHandler = (event: MessageEvent) => {
    const message = event.data;
    if ((message.type === AUTHENTICATION_EVENT_NAME.getAuthenticationState || 
      message.type === AUTHENTICATION_EVENT_NAME.authenticate)) {
      if (message.value?.data) {
        if (message.type === AUTHENTICATION_EVENT_NAME.authenticate) {
          // If authenticated retrieve the latest user details
          global.vscode.postMessage({
            type: AUTHENTICATION_EVENT_NAME.getAuthenticationState,
          } as ClientMessage<null>);  
        }
        setUser(message.value.data); // Update user state with the authentication data
        if (message.type === AUTHENTICATION_EVENT_NAME.getAuthenticationState) {
          // Setup stripe websockets for subscriptions    
          global.vscode.postMessage({
            type: AUTHENTICATION_EVENT_NAME.setupStripeWebsockets,
          } as ClientMessage<null>)      
          global.vscode.postMessage({
            type: AUTHENTICATION_EVENT_NAME.checkForValidSubscription,
          } as ClientMessage<null>)      
        }
      }
      if (message.value?.stripeData) {
        if (Object.prototype.hasOwnProperty.call(message.value.stripeData, 'stripeProducts') && 
          message.value?.stripeData['stripeProducts'].length > 0)
          setStripeProducts(message.value.stripeData['stripeProducts'])
      }      
      setCompleted(true)
      setUpdatingEmail(false)
    } else if (message.type === AUTHENTICATION_EVENT_NAME.updateUser) {
      if (message.value?.data) {
        setUser(message.value.data); 
      }
    } else if (message.type === AUTHENTICATION_EVENT_NAME.logout) {
      setUser(null); // Clear the user state on logout
      setCompleted(true)
    }
  };

  // Effect to set up and clean up the message listener
  useEffect(() => {
    window.addEventListener('message', messageHandler);

    // Request the current authentication state on mount
    const checkAuthenticationState = async () => {
      await getAuthenticationState();
    };
    checkAuthenticationState();

    return () => window.removeEventListener('message', messageHandler);
  }, []);

  return {
    completed,
    user,
    authenticate,
    logout,
    getAuthenticationState,
    stripeProducts,
    updateEmail,
    updatingEmail
  };
};


export const useSubscriptions = () => {
  const [subscriptionInProgress, setSubscriptionInProgress] = useState<string>(''); 
  const [validSubscription, setValidSubscription] = useState<boolean>(false); 
  const [discount, setDiscount] = useState<number>(0);
  const [applyingCoupon, setApplyingCoupon] = useState<boolean>(false);
  const [couponError, setCouponError] = useState<string>('');
  const [couponApplied, setCouponApplied] = useState<boolean>(false);
  const [coupon, setCoupon] = useState<string>('');

  const applyCoupon = async (coupon: string) => {
    setCouponError('')
    setDiscount(0)
    setApplyingCoupon(false)
    if (!coupon.trim()) return;
    setApplyingCoupon(true)
    setSubscriptionInProgress('Applying coupon code...')
    global.vscode.postMessage({
      type: AUTHENTICATION_EVENT_NAME.retrieveStripeCoupon,
      data: coupon
    } as ClientMessage<string>);
  };

  const handleRemoveCoupon = () => {
    setCouponError('')
    setDiscount(0)
    setApplyingCoupon(false)
    setCouponApplied(false)
    setCoupon('')
  }

  const checkForValidSubscription = () => {
    global.vscode.postMessage({
      type: AUTHENTICATION_EVENT_NAME.checkForValidSubscription,
    } as ClientMessage<null>);
  }

  const subscribe = (priceId: string, coupon: string) => {
    setSubscriptionInProgress('Processing your subscription...')
    global.vscode.postMessage({
      type: AUTHENTICATION_EVENT_NAME.subscribe,
      data: JSON.stringify({priceId: priceId, coupon: coupon})
    } as ClientMessage<string>);
  }

  const cancelSubscription = (subscriptionId: string) => {
    setSubscriptionInProgress('Cancelling your subscription...')
    global.vscode.postMessage({
      type: AUTHENTICATION_EVENT_NAME.cancelStripeSubscription,
      data: subscriptionId
    } as ClientMessage<string>);
  }

  // Handler to receive messages from the VS Code extension host
  const messageHandler = (event: MessageEvent) => {
    const message = event.data;
    if (message.type === AUTHENTICATION_EVENT_NAME.subscribe) {
      if (message.value?.data && message.value?.data.length > 0) {
        setValidSubscription(false)
      } else {
        checkSubscription() 
      }
      setSubscriptionInProgress('')
    } else if (message.type === AUTHENTICATION_EVENT_NAME.cancelStripeSubscription) {
      setSubscriptionInProgress('')
      handleRemoveCoupon()
      checkSubscription()
    } else if (message.type === AUTHENTICATION_EVENT_NAME.retrieveStripeCoupon) {
      if (message.value?.error && message.value?.error.length > 0) {
        setCouponError(message.value?.error)
        setDiscount(0)
        setCoupon('')
        setCouponApplied(false)
      } else {
        console.log(`hooks message.value?.error: ${message.value?.error}`)
        setCouponError('')
        setDiscount(message.value?.discount)
        setCouponApplied(true)
      }
      setSubscriptionInProgress('')
      setApplyingCoupon(false)
    } else if (message.type === AUTHENTICATION_EVENT_NAME.checkForValidSubscription) {
      console.log(`yyy hooks checkForValidSubscription checkForValidSubscription message.value.data: ${message.value.data}`)
      setValidSubscription(message.value.data); 
      console.log(`yyy hooks checkForValidSubscription validSubscription: ${validSubscription}`)
      setSubscriptionInProgress('')
      handleRemoveCoupon()
    }
  };

  const checkSubscription = async () => {
    await checkForValidSubscription();
  };

  // Effect to set up and clean up the message listener
  useEffect(() => {
    window.addEventListener('message', messageHandler);

    checkSubscription();

    return () => window.removeEventListener('message', messageHandler);
  }, []);

  return {
    subscribe,
    subscriptionInProgress,
    validSubscription,
    checkForValidSubscription,
    cancelSubscription,
    discount,
    applyCoupon,
    applyingCoupon,
    couponError,
    couponApplied,
    coupon,
    setCoupon,
    handleRemoveCoupon
  };
};

export default useAutosizeTextArea
