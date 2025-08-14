'use client';

import { ActionIcon, Avatar, SortableList } from '@lobehub/ui';
import { createStyles } from 'antd-style';
import { UserMinus, UserPlus } from 'lucide-react';
import { memo, useEffect, useMemo, useState } from 'react';
import { Flexbox } from 'react-layout-kit';

import SidebarHeader from '@/components/SidebarHeader';
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
    margin-bottom: 2px;
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
  const { t } = useTranslation('chat');

  const activeGroupId = useSessionStore((s) => s.activeId);
  const currentSession = useSessionStore(sessionSelectors.currentSession) as LobeGroupSession;

  const addAgentsToGroup = useChatGroupStore((s) => s.addAgentsToGroup);
  const removeAgentFromGroup = useChatGroupStore((s) => s.removeAgentFromGroup);
  const persistReorder = useChatGroupStore((s) => s.reorderGroupMembers);

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

  // optimistic local state for member ordering
  const initialMembers = useMemo(() => currentSession?.members ?? [], [currentSession?.members]);
  const [members, setMembers] = useState<any[]>(initialMembers);
  
  // state for tracking which members are being removed
  const [removingMemberIds, setRemovingMemberIds] = useState<string[]>([]);

  useEffect(() => {
    setMembers(initialMembers);
  }, [initialMembers]);

  const handleRemoveMember = async (memberId: string) => {
    if (!activeGroupId) return;
    
    // Start loading state
    setRemovingMemberIds(prev => [...prev, memberId]);
    
    try {
      await removeAgentFromGroup(activeGroupId, memberId);
    } finally {
      // Clear loading state
      setRemovingMemberIds(prev => prev.filter(id => id !== memberId));
    }
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
        <div className={styles.memberItem} style={{ marginBottom: 8 }}>
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

        {members && members.length > 0 ? (
          <SortableList
            items={members}
            onChange={async (items: any[]) => {
              setMembers(items);
              if (!activeGroupId) return;
              // persist new order
              const orderedIds = items.map((m) => m.id);
              // fire and forget; store action will refresh groups and sessions
              persistReorder(activeGroupId, orderedIds).catch(() => {});
            }}
            renderItem={(item: any) => (
              <SortableList.Item className={styles.memberItem} id={item.id}>
                <Flexbox align={'center'} gap={8} horizontal justify={'space-between'}>
                  <Flexbox align={'center'} gap={8} horizontal>
                    <SortableList.DragHandle />
                    <Avatar avatar={item.avatar || DEFAULT_AVATAR} background={item.backgroundColor!} size={32} />
                    <Flexbox flex={1} gap={2}>
                      <div
                        style={{
                          fontSize: '14px',
                          fontWeight: 500,
                        }}
                      >
                        {item.title || t('defaultSession', { ns: 'common' })}
                      </div>
                      <div
                        style={{
                          color: '#666',
                          fontSize: '12px',
                        }}
                      >
                        {item.systemRole}
                      </div>
                    </Flexbox>
                  </Flexbox>
                  <ActionIcon
                    danger
                    icon={UserMinus}
                    loading={removingMemberIds.includes(item.id)}
                    onClick={() => handleRemoveMember(item.id)}
                    size={'small'}
                    title="Remove Member"
                  />
                </Flexbox>
              </SortableList.Item>
            )}
          />
        ) : null}
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
