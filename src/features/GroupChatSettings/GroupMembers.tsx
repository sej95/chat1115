'use client';

import { ActionIcon, Avatar, Form } from '@lobehub/ui';
import { createStyles } from 'antd-style';
import { useUpdateEffect } from 'ahooks';
import { Edit, UserMinus } from 'lucide-react';
import { memo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Flexbox } from 'react-layout-kit';

import { useChatGroupStore } from '@/store/chatGroup';
import { chatGroupSelectors } from '@/store/chatGroup/selectors';
import { useSessionStore } from '@/store/session';
import { sessionSelectors } from '@/store/session/selectors';
import { useUserStore } from '@/store/user';
import { userProfileSelectors } from '@/store/user/selectors';
import { LobeGroupSession } from '@/types/session';

import { MemberSelectionModal } from '@/components/MemberSelectionModal';

const useStyles = createStyles(({ css, token }) => ({
  container: css`
    width: 100%;
  `,
  emptyState: css`
    color: ${token.colorTextSecondary};
    font-size: ${token.fontSizeSM}px;
    padding: ${token.paddingLG}px;
    text-align: center;
  `,
  memberItem: css`
    background: ${token.colorFillQuaternary};
    border: 1px solid ${token.colorBorderSecondary};
    border-radius: ${token.borderRadius}px;
    margin-bottom: ${token.marginXS}px;
    padding: ${token.paddingSM}px;
    transition: all 0.2s ease;

    &:hover {
      background: ${token.colorFillTertiary};
    }
  `,
}));

const GroupMembers = memo(() => {
  const { t } = useTranslation(['chat', 'common', 'setting']);
  const { styles } = useStyles();
  const [form] = Form.useForm();
  const [inviteModalOpen, setInviteModalOpen] = useState(false);

  const activeGroupId = useSessionStore((s) => s.activeId);
  const currentSession = useSessionStore(sessionSelectors.currentSession) as LobeGroupSession;

  const addAgentsToGroup = useChatGroupStore((s) => s.addAgentsToGroup);

  const currentGroup = useChatGroupStore((s) =>
    activeGroupId ? chatGroupSelectors.getGroupById(activeGroupId)(s) : null,
  );

  const currentUser = useUserStore((s) => ({
    avatar: userProfileSelectors.userAvatar(s),
    name: userProfileSelectors.displayUserName(s) || userProfileSelectors.nickName(s) || 'You',
  }));

  const removeAgentFromGroup = useChatGroupStore((s) => s.removeAgentFromGroup);
  const updateGroup = useChatGroupStore((s) => s.updateGroup);

  const memberData = {
    allowNewMembers: currentGroup?.config?.autoResponse !== false, // Default to true if not set
  };

  useUpdateEffect(() => {
    form.setFieldsValue(memberData);
  }, [memberData]);

  const handleInviteMembers = async (selectedAgents: string[]) => {
    if (!activeGroupId) {
      console.error('No active group to add members to');
      return;
    }
    await addAgentsToGroup(activeGroupId, selectedAgents);
    setInviteModalOpen(false);
  };

  const membersContent = (
    <Flexbox className={styles.container} flex={1} gap={2}>

      {/* Current User - Always shown first */}
      <div className={styles.memberItem}>
        <Flexbox align={'center'} gap={12} horizontal>
          <Avatar avatar={currentUser.avatar} size={32} />
          <Flexbox flex={1} gap={2}>
            <div
              style={{
                fontSize: '14px',
                fontWeight: 500,
              }}
            >
              {currentUser.name}
            </div>
            <div
              style={{
                color: '#888',
                fontSize: '12px',
              }}
            >
              You (Owner)
            </div>
          </Flexbox>
        </Flexbox>
      </div>

      {/* Agent Members */}
      {currentSession?.members?.map((agent) => {
        return (
          <div className={styles.memberItem} key={agent.id}>
            <Flexbox align={'center'} gap={12} horizontal>
              <Avatar avatar={agent.avatar} background={agent.backgroundColor} size={32} />
              <Flexbox flex={1} gap={2}>
                <div
                  style={{
                    fontSize: '14px',
                    fontWeight: 500,
                  }}
                >
                  {agent.title}
                </div>
                {agent.description && (
                  <div
                    style={{
                      color: '#666',
                      fontSize: '12px',
                    }}
                  >
                    {agent.description}
                  </div>
                )}
              </Flexbox>
              <ActionIcon
                icon={Edit}
                onClick={() => {
                  // TODO: Implement edit member logic
                }}
                size={'small'}
                title="Edit Member"
              />
              <ActionIcon
                danger
                icon={UserMinus}
                onClick={() => {
                  removeAgentFromGroup(currentGroup?.id, agent.agentId);
                }}
                size={'small'}
                title="Remove Member"
              />
            </Flexbox>
          </div>
        );
      })}

      {/* Empty State */}
      {(!currentSession?.members || currentSession.members.length === 0) && (
        <div className={styles.emptyState}>
          No agents in this group yet. Click the + button to add members.
        </div>
      )}
    </Flexbox>
  );

  return (
    <Flexbox gap={24}>
      {membersContent}

      <MemberSelectionModal
        mode="invite"
        onCancel={() => setInviteModalOpen(false)}
        onConfirm={handleInviteMembers}
        open={inviteModalOpen}
      />
    </Flexbox>
  );
});

GroupMembers.displayName = 'GroupMembers';

export default GroupMembers;