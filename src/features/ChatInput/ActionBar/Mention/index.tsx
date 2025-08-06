import { Avatar, type ItemType } from '@lobehub/ui';
import { AtSign } from 'lucide-react';
import { memo, useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { useSessionStore } from '@/store/session';
import { sessionSelectors } from '@/store/session/selectors';
import type { LobeGroupSession } from '@/types/session';
import { ChatGroupAgentItem } from '@/database/schemas/chatGroup';

import Action from '../components/Action';

const handleMemberSelect = (agentId: string) => {
  // TODO: [Group Chat] Implement member selection callback
  console.log('Selected member:', agentId);
};

const useMentionItems = () => {
  const currentSession = useSessionStore(sessionSelectors.currentSession) as LobeGroupSession;

  const items: ItemType[] = useMemo(() => {
    const memberItems: ItemType[] = [];

    currentSession.members.forEach((agent: ChatGroupAgentItem) => {
      memberItems.push({
        icon: (
          <Avatar
            avatar={agent.avatar}
            background={agent.backgroundColor}
            shape="circle"
            size={24}
          />
        ),
        key: agent.agentId,
        label: agent.title || agent.agentId,
        onClick: () => handleMemberSelect(agent.agentId),
      });
    });

    return memberItems;
  }, [currentSession]);

  return items;
};

const Mention = memo(() => {
  const { t } = useTranslation('chat');

  const items = useMentionItems();

  return (
    <Action
      dropdown={{
        maxHeight: 320,
        menu: { items },
        minWidth: 200,
      }}
      icon={AtSign}
      title={t('mention.title', { defaultValue: 'Mention Member' })}
    />
  );
});

export default Mention;