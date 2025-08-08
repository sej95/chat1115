import { ChatMessage } from '@/types/message';

const chatMessage = (message: ChatMessage) => {
  return `<${message.role}>${message.content}</${message.role}>`;
};

export const chatHistoryPrompts = (messages: ChatMessage[]) => {
  return `<chat_history>
${messages.map((m) => chatMessage(m)).join('\n')}
</chat_history>`;
};

export const groupSupervisorPrompts = (messages: ChatMessage[]) => {
  const formatMessage = (message: ChatMessage) => {
    const author = message.role === 'user' ? 'user' : (message.agentId || 'assistant');
    return `<${message.role} author="${author}">${message.content}</${message.role}>`;
  };

  return messages.map((m) => formatMessage(m)).join('\n');
};

export const groupMemeberSpeakingPrompts = (messages: ChatMessage[]) => {
  return `<chat_group>
${messages.map((m) => chatMessage(m)).join('\n')}
</chat_group>`;
};

/**
 * Consolidates group chat message history into a single formatted string
 * for use in system messages. Each message is formatted as "(AuthorName): content"
 */
export const consolidateGroupChatHistory = (messages: ChatMessage[], agents: { id: string; title: string }[] = []) => {
  if (messages.length === 0) return '';

  // Create a map for quick agent lookup
  const agentMap = new Map(agents.map(agent => [agent.id, agent.title]));

  const formatMessage = (message: ChatMessage) => {
    let authorName: string;
    
    if (message.role === 'user') {
      authorName = 'User';
    } else if (message.role === 'assistant' && message.agentId) {
      // Try to get agent title from the provided agents map
      authorName = agentMap.get(message.agentId) || `Agent ${message.agentId}`;
    } else {
      authorName = 'Assistant';
    }

    return `(${authorName}): ${message.content}`;
  };

  return messages
    .filter(m => m.content && m.content.trim()) // Filter out empty messages
    .map(formatMessage)
    .join('\n');
};
