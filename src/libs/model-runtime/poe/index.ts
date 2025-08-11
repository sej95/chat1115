import OpenAI from 'openai';

import { ChatStreamPayload, ModelProvider } from '../types';
import { createOpenAICompatibleRuntime } from '../utils/openaiCompatibleFactory';

export interface PoeModelCard {
  id: string;
}

const handlePoeRoleMapping = (payload: ChatStreamPayload) => {
  // Convert OpenAI format messages to Poe format
  const messages = payload.messages.map((message) => {
    if (message.role === 'assistant') {
      return { ...message, role: 'bot' };
    }
    return message;
  });

  return { ...payload, messages } as OpenAI.ChatCompletionCreateParamsStreaming;
};

export const LobePoe = createOpenAICompatibleRuntime({
  baseURL: 'https://api.poe.com/v1',
  chatCompletion: {
    handlePayload: handlePoeRoleMapping,
  },
  debug: {
    chatCompletion: () => process.env.DEBUG_POE_CHAT_COMPLETION === '1',
  },
  provider: ModelProvider.Poe,
});

export default LobePoe;