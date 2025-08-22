'use client';

import { Icon } from '@lobehub/ui';
import { App, Dropdown } from 'antd';
import { createStyles } from 'antd-style';
import { ChevronDownIcon } from 'lucide-react';
import { useRouter } from 'nextjs-toploader/app';
import { memo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { SESSION_CHAT_URL } from '@/const/url';
import { useSessionStore } from '@/store/session';

import { useDetailContext } from '../../DetailProvider';

const useStyles = createStyles(({ css }) => ({
  button: css`
    button {
      width: 100%;
    }
  `,
}));

const AddAgent = memo<{ mobile?: boolean }>(({ mobile }) => {
  const { avatar, description, tags, title, config, backgroundColor, identifier } = useDetailContext();
  const { styles } = useStyles();
  const [isLoading, setIsLoading] = useState(false);
  const createSession = useSessionStore((s) => s.createSession);
  const sessions = useSessionStore((s) => s.sessions);
  const { message, modal } = App.useApp();
  const router = useRouter();
  const { t } = useTranslation('discover');

  const meta = {
    avatar,
    backgroundColor,
    description,
    marketIdentifier: identifier,
    tags,
    title,
  };

  const checkDuplicateAgent = () => {
    console.log("sessions",sessions)
    if (!identifier) return false;
    return sessions.some(session => session.meta?.marketIdentifier === identifier);
  };

  const showDuplicateConfirmation = (callback: () => void) => {
    modal.confirm({
      cancelText: '取消',
      content: `当前已经添加过「${title}」Agent，是否需要重复添加？`,
      okText: '确认添加',
      onOk: callback,
      title: '重复添加确认',
    });
  };

  const createSessionWithMarketIdentifier = async (isSwitchSession = true) => {
    if (!config) return;

    const sessionData = {
      config,
      meta,
    };

    console.log("sessionData",sessionData)

    const session = await createSession(sessionData, isSwitchSession);
    return session;
  };

  const handleCreateAndConverse = async () => {
    setIsLoading(true);
    try {
      const session = await createSessionWithMarketIdentifier(true);
      message.success(t('assistants.addAgentSuccess'));
      router.push(SESSION_CHAT_URL(session, mobile));
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreate = async () => {
    setIsLoading(true);
    try {
      await createSessionWithMarketIdentifier(false);
      message.success(t('assistants.addAgentSuccess'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddAgentAndConverse = async () => {
    if (!config) return;

    if (checkDuplicateAgent()) {
      showDuplicateConfirmation(handleCreateAndConverse);
    } else {
      await handleCreateAndConverse();
    }
  };

  const handleAddAgent = async () => {
    if (!config) return;

    if (checkDuplicateAgent()) {
      showDuplicateConfirmation(handleCreate);
    } else {
      await handleCreate();
    }
  };

  return (
    <Dropdown.Button
      className={styles.button}
      icon={<Icon icon={ChevronDownIcon} />}
      loading={isLoading}
      menu={{
        items: [
          {
            key: 'addAgent',
            label: t('assistants.addAgent'),
            onClick: handleAddAgent,
          },
        ],
      }}
      onClick={handleAddAgentAndConverse}
      overlayStyle={{ minWidth: 267 }}
      size={'large'}
      style={{ flex: 1, width: 'unset' }}
      type={'primary'}
    >
      {t('assistants.addAgentAndConverse')}
    </Dropdown.Button>
  );
});

export default AddAgent;
