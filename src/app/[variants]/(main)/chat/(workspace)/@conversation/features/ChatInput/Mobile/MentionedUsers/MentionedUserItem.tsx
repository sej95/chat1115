import { Avatar, Text } from '@lobehub/ui';
import { memo } from 'react';
import { Flexbox } from 'react-layout-kit';

import { useMentionStore } from '@/store/mention';

interface MentionedUserItemProps {
  agent: any; // The actual agent data from the group
}

const MentionedUserItem = memo<MentionedUserItemProps>(({ agent }) => {
  const removeMentionedUser = useMentionStore((s: any) => s.removeMentionedUser);

  const handleRemove = () => {
    removeMentionedUser(agent.agentId);
  };

  return (
    <Flexbox
      align={'center'}
      gap={8}
      horizontal
      style={{
        padding: '8px 12px',
        background: 'rgba(0, 0, 0, 0.04)',
        borderRadius: 16,
        position: 'relative',
      }}
    >
      <Avatar
        avatar={agent.avatar}
        background={agent.backgroundColor}
        shape="circle"
        size={24}
      />
      <Text style={{ fontSize: 12, maxWidth: 80 }} ellipsis={{ tooltip: true }}>
        {agent.title || agent.agentId}
      </Text>
      <div
        onClick={handleRemove}
        style={{
          cursor: 'pointer',
          padding: 2,
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 16,
          height: 16,
          background: 'rgba(0, 0, 0, 0.1)',
        }}
      >
        <Text style={{ fontSize: 10, lineHeight: 1 }}>×</Text>
      </div>
    </Flexbox>
  );
});

export default MentionedUserItem;
