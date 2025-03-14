import { VSCodeButton } from '@vscode/webview-ui-toolkit/react'
import React, { ReactNode, useState } from 'react'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { vscDarkPlus, vs } from 'react-syntax-highlighter/dist/esm/styles/prism'

import { ASSISTANT, EVENT_NAME } from '../common/constants'

import styles from './index.module.css'
import { LanguageType, Theme, ThemeType } from '../common/types'
import { getLanguageMatch } from './utils'

interface CodeBlockProps {
  className?: string
  children?: ReactNode
  language: LanguageType | undefined
  theme: ThemeType
  role: string | undefined
  index: number
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const global = globalThis as any

export const CodeBlock = (props: CodeBlockProps) => {
  const { children, language, className, theme, role, index } = props

  const lang = getLanguageMatch(language, className)

  const [showFeedbackForm, setShowFeedbackForm] = useState(false)
  const [feedbackType, setFeedbackType] = useState<string | null>(null)
  const [feedbackText, setFeedbackText] = useState('')

  const handleFeedbackClick = (type: string) => {
    setFeedbackType(type)
    setShowFeedbackForm(true)
  }

  const handleFeedbackSubmit = () => {
    //if (feedbackText.trim()) {
    global.vscode.postMessage({
      type: EVENT_NAME.dappforgeChatFeedback,
      data: { 
        type: feedbackType, 
        content: JSON.stringify({
          comment: feedbackText,
          code: String(children).replace(/^\n/, '') 
        })
      }
    })
    setShowFeedbackForm(false)
    setFeedbackText('')
    //}
  }

  const handleFeedbackCancel = () => {
    setShowFeedbackForm(false)
    setFeedbackText('')
  }

  const handleCopy = () => {
    const text = String(children).replace(/^\n/, '')
    navigator.clipboard.writeText(text)
  }

  const handleNewDocument = () => {
    global.vscode.postMessage({
      type: EVENT_NAME.dappforgeNewDocument,
      data: String(children).replace(/^\n/, '')
    })
  }

  const handleAccept = () => {
    global.vscode.postMessage({
      type: EVENT_NAME.dappforgeAcceptSolution,
      data: String(children).replace(/^\n/, '')
    })
  }

  const handleOpenDiff = () => {
    global.vscode.postMessage({
      type: EVENT_NAME.dappforgeOpenDiff,
      data: String(children).replace(/^\n/, '')
    })
  }

  return (
    <>
      <SyntaxHighlighter
        children={String(children).trimStart().replace(/\n$/, '')}
        style={theme === Theme.Dark ? vscDarkPlus : vs}
        language={lang || 'rust'}
        index={index || 0}
      />

      {showFeedbackForm && (
        <div className={styles.feedbackForm}>
          <h4 className={styles.feedbackHeading}>Feedback</h4>
          <textarea
            className={styles.feedbackTextarea}
            value={feedbackText}
            onChange={(e) => setFeedbackText(e.target.value)}
            placeholder={feedbackType === 'positive' ? 'What did you like about the response?' : 'What did you dislike about the response?'}
          />
          <div className={styles.feedbackButtons}>
            <VSCodeButton className={styles.feedbackButton} onClick={handleFeedbackSubmit}>Submit</VSCodeButton>
            <VSCodeButton className={styles.feedbackButton} onClick={handleFeedbackCancel}>Cancel</VSCodeButton>
          </div>
        </div>
      )}      

      {role === ASSISTANT && (
        <>
          <div className={styles.codeOptionsContainer}>
            {index == 1 ? (
              <span className={styles.staticMessage}>Your feedback is crucial for improving the quality of the code/output produced. Click on the thumbs up/down to submit feedback.</span>
            ) : (
              <span></span>
            )}
            <div className={styles.codeOptions}>
              <VSCodeButton
                title="Copy code"
                onClick={handleCopy}
                appearance="icon"
              >
                <span className="codicon codicon-copy"></span>
              </VSCodeButton>
              <VSCodeButton
                title="Append to new document"
                onClick={handleNewDocument}
                appearance="icon"
              >
                <span className="codicon codicon-new-file"></span>
              </VSCodeButton>
              <VSCodeButton
                title="Good response"
                appearance="icon"
                onClick={() => handleFeedbackClick('positive')}
              >
                <span className="codicon codicon-thumbsup"></span>
              </VSCodeButton>
              <VSCodeButton
                title="Bad response"
                appearance="icon"
                onClick={() => handleFeedbackClick('negative')}
              >
                <span className="codicon codicon-thumbsdown"></span>
              </VSCodeButton>
            </div>
          </div>
        </>
      )}
    </>
  )
}

export default React.memo(CodeBlock)
