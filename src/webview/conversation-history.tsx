import { VSCodeButton, VSCodeTextField } from '@vscode/webview-ui-toolkit/react';
import { Conversation } from '../common/types';
import styles from './conversation-history.module.css';
import { useConversationHistory } from './hooks';
import { EVENT_NAME } from '../common/constants';
import { useEffect } from 'react';

interface ConversationHistoryProps {
  onSelect: () => void;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const global = globalThis as any;
export const ConversationHistory = ({ onSelect }: ConversationHistoryProps) => {
  const {
    conversations: savedConversations,
    setActiveConversation,
    removeConversation,
    clearAllConversations,
    renameConversation,
    setEditingId,
    setNewTitle,
    newTitle,
    editingId
  } = useConversationHistory();

  useEffect(() => {
    if (editingId) {
      setTimeout(() => {
        // Find the VSCodeTextField
        const textField = document.querySelector('vscode-text-field');
        if (textField) {
          // Access the internal input inside the shadowRoot
          const inputElement = textField.shadowRoot?.querySelector('input') as HTMLInputElement;
          if (inputElement) { 
            inputElement.focus(); 
            inputElement.select();
          }
        }
      }, 50);
    }
  }, [editingId]);  

  const handleSetConversation = (conversation: Conversation) => {
    if (editingId) return; // Prevent navigation when renaming
    setActiveConversation(conversation);
    onSelect();
    global.vscode.postMessage({ type: EVENT_NAME.dappforgeHideBackButton });
  };

  const handleRemoveConversation = (event: React.MouseEvent, conversation: Conversation) => {
    event.stopPropagation();
    removeConversation(conversation);
  };

  const handleRenameClick = (event: React.MouseEvent, conversation: Conversation) => {
    event.stopPropagation();
    setEditingId(conversation.id ?? null);
    setNewTitle(conversation.title ?? '');
  };

  const handleRenameSubmit = (conversation: Conversation) => {
    renameConversation(conversation);
  };

  const handleClearAllConversations = () => clearAllConversations();

  const conversations = Object.values(savedConversations).reverse();

  return (
    <div>
      <h3>Chat history</h3>
      <VSCodeButton appearance="primary" onClick={handleClearAllConversations}>
        Clear chat history
      </VSCodeButton>
      {conversations.length ? (
        conversations.map((conversation) => (
          <div
            key={conversation.id}
            className={styles.conversation}
            onClick={() => handleSetConversation(conversation)}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '5px'
            }}
          >
            <div style={{ flex: 1 }}>
              {editingId === conversation.id ? (
                <VSCodeTextField
                  value={newTitle}
                  onInput={(e) => setNewTitle((e.target as HTMLInputElement).value)}
                  onBlur={() => handleRenameSubmit(conversation)}
                  onKeyDown={(e) => e.key === 'Enter' && handleRenameSubmit(conversation)}
                  onClick={(e) => e.stopPropagation()}
                  onMouseDown={(e) => e.stopPropagation()}
                  autoFocus
                />
              ) : (
                <span>{conversation.title?.substring(0, 100)}...</span>
              )}
            </div>
            <div style={{ display: 'flex', gap: '5px' }}>
              <VSCodeButton
                appearance="icon"
                onClick={(e) => handleRenameClick(e, conversation)}
              >
                <i className="codicon codicon-edit" />
              </VSCodeButton>
              <VSCodeButton
                appearance="icon"
                onClick={(e) => handleRemoveConversation(e, conversation)}
              >
                <i className="codicon codicon-trash" />
              </VSCodeButton>
            </div>
          </div>
        ))
      ) : (
        <p>No chat history yet...</p>
      )}
    </div>
  );
};
