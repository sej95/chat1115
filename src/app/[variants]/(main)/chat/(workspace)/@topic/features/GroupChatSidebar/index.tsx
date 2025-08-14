'use client';

import { ActionIcon, Avatar } from '@lobehub/ui';
import { createStyles } from 'antd-style';
import { GripVertical, UserMinus, UserPlus } from 'lucide-react';
import { memo, useState } from 'react';
import { Flexbox } from 'react-layout-kit';

import SidebarHeader from '@/components/SidebarHeader';
import { useActionSWR } from '@/libs/swr';
import { useChatGroupStore } from '@/store/chatGroup';
import { useSessionStore } from '@/store/session';
import { sessionSelectors } from '@/store/session/selectors';
import { useUserStore } from '@/store/user';
import { userProfileSelectors } from '@/store/user/selectors';

import { MemberSelectionModal } from '@/components/MemberSelectionModal';

import TopicListContent from '../TopicListContent';
import { LobeGroupSession } from 'packages/types/src/session';
import Header from '../Header';
import { DEFAULT_AVATAR } from '@/const/meta';
import { useTranslation } from 'react-i18next';

const MemberItem = memo<{
  activeGroupId: string;
  member: any; // Runtime is AgentItem but TypeScript thinks it's ChatGroupAgentItem
  styles: any;
}>(({ activeGroupId, member, styles }) => {
  const { t } = useTranslation('chat');
  const removeAgentFromGroup = useChatGroupStore((s) => s.removeAgentFromGroup);

  const { mutate: removeMember, isValidating: isRemoving } = useActionSWR(
    ['groupChatSidebar.removeMember', activeGroupId, member.id],
    async () => {
      await removeAgentFromGroup(activeGroupId, member.id);
    }
  );

  return (
    <div className={styles.memberItem}>
      <Flexbox align={'center'} gap={12} horizontal>
        <ActionIcon
          icon={GripVertical}
          size={'small'}
          style={{ color: '#999', cursor: 'grab', marginRight: '-6px' }}
          title="Drag to reorder"
        />
        <Avatar avatar={member.avatar || DEFAULT_AVATAR} background={member.backgroundColor!} size={32} />
        <Flexbox flex={1} gap={2}>
          <div
            style={{
              fontSize: '14px',
              fontWeight: 500,
            }}
          >
            {member.title || t('defaultSession', { ns: 'common' })}
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
        {/* <ActionIcon
          icon={Edit}
          onClick={() => {
            // TODO: Implement edit member logic
          }}
          size={'small'}
          title="Edit Member"
        /> */}
        <ActionIcon
          danger
          icon={UserMinus}
          loading={isRemoving}
          onClick={() => removeMember()}
          size={'small'}
          title="Remove Member"
        />
      </Flexbox>
    </div>
  );
});

const useStyles = createStyles(({ css, token }) => ({
  content: css`
    padding: 0 ${token.paddingSM}px;
    min-height: 200px;
    height: fit-content;
    overflow-y: auto;
    padding-bottom: ${token.padding}px;
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
    padding: ${token.paddingSM}px ${token.paddingXS}px;
    transition: all 0.2s ease;
    cursor: pointer;

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
  const [addModalOpen, setAddModalOpen] = useState(false);

  const activeGroupId = useSessionStore((s) => s.activeId);
  const currentSession = useSessionStore(sessionSelectors.currentSession) as LobeGroupSession;

  const addAgentsToGroup = useChatGroupStore((s) => s.addAgentsToGroup);

  const currentUser = useUserStore((s) => ({
    avatar: userProfileSelectors.userAvatar(s),
    name: userProfileSelectors.nickName(s),
  }));

  const handleAddMembers = async (selectedAgents: string[]) => {
    if (!activeGroupId) {
      console.error('No active group to add members to');
      return;
    }
    await addAgentsToGroup(activeGroupId, selectedAgents);
    setAddModalOpen(false);
  };

  return (
    <Flexbox height={'100%'}>
      <SidebarHeader
        actions={
          <ActionIcon
            icon={UserPlus}
            key="addMember"
            onClick={() => setAddModalOpen(true)}
            size={'small'}
            title="Add Member"
          />
        }
        style={{ cursor: 'pointer' }}
        title={
          <Flexbox align={'center'} gap={8} horizontal>
            Members {(currentSession?.members?.length || 0) + 1}
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
          {currentSession?.members?.map((member: any) => (
            <MemberItem
              activeGroupId={activeGroupId!}
              key={member.id}
              member={member}
              styles={styles}
            />
          ))}
        </div>
      </Flexbox>

      <Flexbox className={styles.topicList} flex={1}>
        <Header />
        <TopicListContent />
      </Flexbox>

      <MemberSelectionModal
        existingMembers={currentSession?.members?.map((member: any) => member.id) || []}
        groupId={activeGroupId}
        mode="add"
        onCancel={() => setAddModalOpen(false)}
        onConfirm={handleAddMembers}
        open={addModalOpen}
      />

    </Flexbox>
  );
});

export default GroupChatSidebar;
