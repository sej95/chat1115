import { memo } from 'react';

import InputArea from '@/features/ChatInput/Desktop/InputArea';
import { useSendGroupMessage, useSendMessage } from '@/features/ChatInput/useSend';
import { useChatStore } from '@/store/chat';
import { chatSelectors } from '@/store/chat/slices/message/selectors';
import { useSessionStore } from '@/store/session';
import { sessionSelectors } from '@/store/session/selectors';

const TextArea = memo<{ onSend?: () => void }>(({ onSend }) => {
  const [loading, value, updateInputMessage] = useChatStore((s) => [
    chatSelectors.isAIGenerating(s),
    s.inputMessage,
    s.updateInputMessage,
  ]);

  const isGroupSession = useSessionStore(sessionSelectors.isCurrentSessionGroupSession);

  const { send: sendMessage } = useSendMessage();
  const { send: sendGroupMessage } = useSendGroupMessage();

  return (
    <InputArea
      loading={loading}
      onChange={updateInputMessage}
      onSend={() => {
        if (isGroupSession) {
          sendGroupMessage();
        } else {
          sendMessage();
        }

        onSend?.();
      }}
      value={value}
    />
  );
});

export default TextArea;
