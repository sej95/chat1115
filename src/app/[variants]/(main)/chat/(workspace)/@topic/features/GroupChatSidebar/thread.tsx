'use client';

import { ActionIcon } from '@lobehub/ui';
import { createStyles } from 'antd-style';
import { ArrowLeft } from 'lucide-react';
import { memo } from 'react';
import { Flexbox } from 'react-layout-kit';

import { useChatGroupStore } from '@/store/chatGroup';

const useStyles = createStyles(({ css, token }) => ({
  container: css`
    background: ${token.colorBgContainer};
    border-radius: ${token.borderRadius}px;
    padding: ${token.paddingLG}px;
    margin: ${token.marginSM}px;
    text-align: center;
  `,
  header: css`
    padding: ${token.paddingSM}px ${token.padding}px;
    border-bottom: 1px solid ${token.colorBorderSecondary};
  `,
  headerTitle: css`
    color: ${token.colorText};
    font-size: ${token.fontSizeLG}px;
    font-weight: ${token.fontWeightStrong};
  `,
  placeholder: css`
    color: ${token.colorTextSecondary};
    font-size: ${token.fontSizeLG}px;
    margin: ${token.marginLG}px 0;
  `,
  subtitle: css`
    color: ${token.colorTextTertiary};
    font-size: ${token.fontSizeSM}px;
    margin-top: ${token.marginSM}px;
  `,
}));

const GroupChatThread = memo(() => {
  const { styles } = useStyles();
  const activeThreadAgentId = useChatGroupStore((s) => s.activeThreadAgentId);
  const toggleThread = useChatGroupStore((s) => s.toggleThread);

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
          Thread View
        </div>
      </Flexbox>

      <Flexbox align={'center'} className={styles.container} flex={1} justify={'center'}>
        <div className={styles.placeholder}>
          🧵 Thread Component
        </div>
        <div className={styles.subtitle}>
          Active Agent: {activeThreadAgentId}
        </div>
        <div className={styles.subtitle}>
          This is a placeholder for the thread functionality
        </div>
      </Flexbox>
    </Flexbox>
  );
});

export default GroupChatThread;
