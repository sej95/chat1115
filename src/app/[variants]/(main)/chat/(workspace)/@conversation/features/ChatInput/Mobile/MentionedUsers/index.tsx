import { Avatar, Text } from '@lobehub/ui';
import { memo } from 'react';
import { Flexbox } from 'react-layout-kit';

import { useChatGroupStore } from '@/store/chatGroup';
import { chatGroupSelectors } from '@/store/chatGroup/selectors';
import { useMentionStore } from '@/store/mention';
import { mentionSelectors } from '@/store/mention/selectors';
import { useSessionStore } from '@/store/session';
import { sessionSelectors } from '@/store/session/selectors';

import MentionedUserItem from './MentionedUserItem';

const MentionedUsers = memo(() => {
  const currentSession = useSessionStore(sessionSelectors.currentSession);
  const mentionedUsers = useMentionStore(mentionSelectors.mentionedUsers);
  const hasMentionedUsers = useMentionStore(mentionSelectors.hasMentionedUsers);
  
  // Only show for group sessions
  if (currentSession?.type !== 'group' || !hasMentionedUsers) return null;

  const groupId = currentSession.id;
  const groupAgents = useChatGroupStore(chatGroupSelectors.getGroupAgents(groupId));
  
  // Filter agents that are mentioned
  const mentionedAgents = groupAgents.filter(agent => 
    mentionedUsers.includes(agent.agentId)
  );

  if (mentionedAgents.length === 0) return null;

  return (
    <Flexbox paddingBlock={4} style={{ position: 'relative' }}>
      <Flexbox
        gap={4}
        horizontal
        padding={'4px 8px 8px'}
        style={{ overflow: 'scroll', width: '100%' }}
      >
        {mentionedAgents.map((agent) => (
          <MentionedUserItem key={agent.agentId} agent={agent} />
        ))}
      </Flexbox>
    </Flexbox>
  );
});

export default MentionedUsers;
