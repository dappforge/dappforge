
import WebSocket from 'ws'
import { Logger } from '../common/logger'


const logger = new Logger()

export class WebSocketHandler {
  private socket: WebSocket | null = null
  private reconnectInterval = 5000 // 5 seconds
  private url: string
  private requestTimeout = 180000 // 3 minutes in milliseconds
  private onMessage: ((message: unknown) => void) | null = null
  private handleMessage: ((event: WebSocket.MessageEvent) => void) | null = null

  constructor(url: string, onMessage?: (message: unknown) => void) {
    this.url = url
    this.onMessage = onMessage || null
  }

  public setNewUrl(url: string) {
    this.url = url
    if (this.socket) {
      this.socket.close()
    }
  }

  public closeSocket() {
    if (this.socket) {
      this.socket.close()
      this.socket = null
    }
  }

  public isSocketOpen() {
    return (this.socket && this.socket.readyState === WebSocket.OPEN)  
  }

  public getNewUrl(): string {
    return this.url
  }

  public async sendMessage(message: unknown) {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      await this.openConnection()
    }
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(message))
    } else {
      console.error('WebSocket is not connected.')
    }
  }

  // Function to send a request and handle both streaming and non-streaming responses
  public async sendRequest(
    request: unknown,
    onData?: (data: unknown) => void,  // Callback for streaming data
    onComplete?: () => void           // Callback for when the stream ends
  ): Promise<unknown> {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      await this.openConnection()
    }

    return new Promise((resolve, reject) => {
      if (!this.socket) {
        reject(new Error('WebSocket connection is not available.'))
        return
      }

      let isStreaming = false
      let timeoutHandle: NodeJS.Timeout

      // Timeout logic to reject if no response within the specified time
      timeoutHandle = setTimeout(() => {
        reject(new Error('Did not receive a response from the AI API in a timely manner.'))
      }, this.requestTimeout)

      // Remove old listener if exists, then re-add
      if (this.handleMessage) {
        this.socket.removeEventListener('message', this.handleMessage)
      }

      // Set up event listener for incoming messages
      this.handleMessage = (event: WebSocket.MessageEvent) => {
        try {
          const data = event.data
          const dataStr = typeof data === 'string' ? data : data.toString()
          //logger.log(`<~~~~~ received data: ${dataStr}`)
          const parsedData = JSON.parse(dataStr)

          // Reset the timeout when data is received
          clearTimeout(timeoutHandle)

          if (parsedData?.event === 'stream') {
            isStreaming = true
            if (onData) {
              onData(parsedData) // Process each chunk of data
            }

            // Set a new timeout for next data chunk or end of stream
            timeoutHandle = setTimeout(() => {
              reject(new Error('Did not receive a response from the AI API in a timely manner.'))
            }, this.requestTimeout)

          } else if (parsedData?.event === 'end') {
            clearTimeout(timeoutHandle)
            //if (onComplete) onComplete()
            resolve('')
          } else if (parsedData?.event === 'error') {
            clearTimeout(timeoutHandle)
            reject(new Error(`Error: ${parsedData?.response?.error} Status: ${parsedData?.status}`))
            resolve('')
          } else {
            clearTimeout(timeoutHandle)
            if (!isStreaming) {
              resolve(data) // Resolve the promise with the complete response for non-streaming
            }
          }
        } catch (e) {
          clearTimeout(timeoutHandle)
          reject(new Error('Error parsing WebSocket response data.'))
        }
      }

      this.socket.addEventListener('message', this.handleMessage)


      this.socket.onerror = () => {
        clearTimeout(timeoutHandle)
        reject(new Error('WebSocket encountered an error.'))
      }

      this.socket.onclose = () => {
        //logger.log('WebSocket connection was closed.')
        if (isStreaming && onComplete) {
          onComplete() // Signal the end of the stream
        }
        clearTimeout(timeoutHandle)
      }

      // Send the request
      //console.log(`>>>>> sendRequest request: ${JSON.stringify(request)}`)
      this.socket.send(JSON.stringify(request))
    })
  }

  private openConnection(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.socket = new WebSocket(this.url)
      this.socket.binaryType = 'arraybuffer'
  
      this.socket.onopen = () => {
        //logger.log('WebSocket connection established')
        resolve()
      }
  
      this.socket.onerror = (error) => {
        console.error('WebSocket error:', error)
        reject(new Error('Failed to open WebSocket connection.'))
      }
  
      this.socket.onclose = () => {
        //logger.log('WebSocket connection closed')
      }

      // Instead of assigning this.socket.onmessage, use addEventListener
      if (this.onMessage) {
        this.socket.addEventListener('message', (event) => {
          try {
            //console.log(`this.socket.onmessage data: ${event}`)
            const data = JSON.parse(event.data.toString())
            if (this.onMessage) {
              this.onMessage(data) // Handle general messages
            }
          } catch (error) {
            console.error('Error processing message:', error)
          }
        })
      }
    })
  }
  
}
