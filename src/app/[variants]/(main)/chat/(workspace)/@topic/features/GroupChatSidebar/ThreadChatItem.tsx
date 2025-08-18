'use client';

import { memo, useMemo } from 'react';

import { useAgentStore } from '@/store/agent';
import { agentChatConfigSelectors } from '@/store/agent/selectors';
import ChatItem from '@/features/Conversation/components/ChatItem';

export interface ThreadChatItemProps {
    id: string;
    index: number;
}

const ThreadChatItem = memo<ThreadChatItemProps>(({ id, index }) => {
    const [displayMode, enableHistoryDivider] = useAgentStore((s) => [
        agentChatConfigSelectors.displayMode(s),
        // For thread view, we can enable history divider for all messages
        true, // or you can implement specific logic: agentChatConfigSelectors.enableHistoryDivider(length, index)(s)
    ]);

    const actionBar = useMemo(() => null, []);

    return (
        <ChatItem
            actionBar={actionBar}
            enableHistoryDivider={enableHistoryDivider}
            id={id}
            inPortalThread={true} // Mark this as thread context
            index={index}
        />
    );
});

ThreadChatItem.displayName = 'ThreadChatItem';

export default ThreadChatItem;
