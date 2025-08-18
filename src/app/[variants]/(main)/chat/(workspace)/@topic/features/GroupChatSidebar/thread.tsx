'use client';

import { ActionIcon } from '@lobehub/ui';
import { createStyles } from 'antd-style';
import { ArrowLeft } from 'lucide-react';
import { memo } from 'react';
import { Flexbox } from 'react-layout-kit';

import { useChatGroupStore } from '@/store/chatGroup';
import { useSessionStore } from '@/store/session';
import { sessionSelectors } from '@/store/session/selectors';
import ThreadChatList from './ThreadChatList';

const useStyles = createStyles(({ css, token }) => ({
  header: css`
    padding: ${token.paddingSM}px ${token.padding}px;
    border-bottom: 1px solid ${token.colorBorderSecondary};
  `,
  headerTitle: css`
    color: ${token.colorText};
    font-size: ${token.fontSizeLG}px;
    font-weight: ${token.fontWeightStrong};
  `,
}));

const GroupChatThread = memo(() => {
  const { styles } = useStyles();
  const activeThreadAgentId = useChatGroupStore((s) => s.activeThreadAgentId);
  const toggleThread = useChatGroupStore((s) => s.toggleThread);

  // Get agent info for the thread
  const agents = useSessionStore(sessionSelectors.currentGroupAgents);
  const currentAgent = agents?.find(agent => agent.id === activeThreadAgentId);
  const agentTitle = currentAgent?.title || `Agent ${activeThreadAgentId}`;

  const handleBackToSidebar = () => {
    toggleThread(''); // Clear thread to go back to sidebar
  };

  return (
    <Flexbox height={'100%'}>
      {/* Custom header with back button on top-left */}
      <Flexbox
        align={'center'}
        className={styles.header}
        gap={8}
        horizontal
      >
        <ActionIcon
          icon={ArrowLeft}
          onClick={handleBackToSidebar}
          size={'small'}
          title="Back to Sidebar"
        />
        <div className={styles.headerTitle}>
          Thread with {agentTitle}
        </div>
      </Flexbox>

      <Flexbox flex={1} style={{ overflow: 'hidden' }}>
        <ThreadChatList />
      </Flexbox>
    </Flexbox>
  );
});

export default GroupChatThread;
