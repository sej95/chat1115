'use client';

import { ActionIcon, Avatar } from '@lobehub/ui';
import { createStyles } from 'antd-style';
import { Edit, UserMinus, UserPlus } from 'lucide-react';
import { memo, useState } from 'react';
import { Flexbox } from 'react-layout-kit';

import SidebarHeader from '@/components/SidebarHeader';
import { useChatGroupStore } from '@/store/chatGroup';
import { useSessionStore } from '@/store/session';
import { sessionSelectors } from '@/store/session/selectors';
import { useUserStore } from '@/store/user';
import { userProfileSelectors } from '@/store/user/selectors';

import { MemberSelectionModal } from '@/components/MemberSelectionModal';
import { ChatGroupAgentItem } from '@/database/schemas/chatGroup';
import TopicListContent from '../TopicListContent';
import { LobeGroupSession } from 'packages/types/src/session';
import Header from '../Header';

const useStyles = createStyles(({ css, token }) => ({
  content: css`
    padding: 0 ${token.paddingSM}px;
    min-height: 200px;
    height: fit-content;
    overflow-y: auto;
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
  placeholder: css`
    border: 1px dashed ${token.colorBorder};
    border-radius: ${token.borderRadiusLG}px;
    color: ${token.colorTextSecondary};
    margin: ${token.marginSM}px 0;
    padding: ${token.paddingLG}px;
    text-align: center;
  `,
  sectionTitle: css`
    color: ${token.colorTextSecondary};
    font-size: ${token.fontSizeSM}px;
    font-weight: ${token.fontWeightStrong};
    letter-spacing: 0.5px;
    margin: ${token.marginLG}px 0 ${token.marginSM}px 0;
    text-transform: uppercase;
  `,
  topicList: css`
    border-block-start: 1px solid ${token.colorBorderSecondary};
  `,
}));

const GroupChatSidebar = memo(() => {
  const { styles } = useStyles();
  const [inviteModalOpen, setInviteModalOpen] = useState(false);

  const activeGroupId = useSessionStore((s) => s.activeId);
  const currentSession = useSessionStore(sessionSelectors.currentSession) as LobeGroupSession;

  const addAgentsToGroup = useChatGroupStore((s) => s.addAgentsToGroup);

  const currentUser = useUserStore((s) => ({
    avatar: userProfileSelectors.userAvatar(s),
    name: userProfileSelectors.displayUserName(s) || userProfileSelectors.nickName(s) || 'You',
  }));

  const removeAgentFromGroup = useChatGroupStore((s) => s.removeAgentFromGroup);

  const handleInviteMembers = async (selectedAgents: string[]) => {
    if (!activeGroupId) {
      console.error('No active group to add members to');
      return;
    }
    await addAgentsToGroup(activeGroupId, selectedAgents);
    setInviteModalOpen(false);
  };

  return (
    <Flexbox height={'100%'}>
      <SidebarHeader
        actions={
          <ActionIcon
            icon={UserPlus}
            key="addMember"
            onClick={() => setInviteModalOpen(true)}
            size={'small'}
            title="Add Member"
          />
        }
        style={{ cursor: 'pointer' }}
        title={
          <Flexbox align={'center'} gap={8} horizontal>
            Members
          </Flexbox>
        }
      />

      <Flexbox className={styles.content} flex={0.6} gap={2}>
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
            </Flexbox>
          </Flexbox>
        </div>

        <div>
          {currentSession?.members?.map((member: ChatGroupAgentItem) => {
            return (
              <div className={styles.memberItem} key={member.id}>
                <Flexbox align={'center'} gap={12} horizontal>
                  <Avatar avatar={member.avatar} background={member.backgroundColor!} size={32} />
                  <Flexbox flex={1} gap={2}>
                    <div
                      style={{
                        fontSize: '14px',
                        fontWeight: 500,
                      }}
                    >
                      {member.title}
                    </div>
                    <div
                      style={{
                        color: '#666',
                        fontSize: '12px',
                      }}
                    >
                      {member.systemRole}
                    </div>
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
                      removeAgentFromGroup(activeGroupId!, member.id);
                    }}
                    size={'small'}
                    title="Remove Member"
                  />
                </Flexbox>
              </div>
            );
          })}
        </div>
      </Flexbox>

      <Flexbox className={styles.topicList} flex={1}>
        <Header />
        <TopicListContent />
      </Flexbox>

      <MemberSelectionModal
        mode="invite"
        onCancel={() => setInviteModalOpen(false)}
        onConfirm={handleInviteMembers}
        open={inviteModalOpen}
      />

    </Flexbox>
  );
});

GroupChatSidebar.displayName = 'GroupChat';

export default GroupChatSidebar;
