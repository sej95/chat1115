import { ChatStreamPayload } from '@/libs/model-runtime';

export const NO_THINKING_CHAT_OPTIONS: Partial<ChatStreamPayload> = {
  thinking: { budget_tokens: 0, type: 'disabled' },
  thinkingBudget: 0,
  tool_choice: 'none',
};
