'use client';

import { ActionIcon, Avatar } from '@lobehub/ui';
import { createStyles } from 'antd-style';
import { Settings, UserPlus } from 'lucide-react';
import { memo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Flexbox } from 'react-layout-kit';

import SidebarHeader from '@/components/SidebarHeader';
import { useChatGroupStore } from '@/store/chatGroup';
import { chatGroupSelectors } from '@/store/chatGroup/selectors';
import { useSessionStore } from '@/store/session';
import { sessionSelectors } from '@/store/session/selectors';
import { useUserStore } from '@/store/user';
import { userProfileSelectors } from '@/store/user/selectors';
import { LobeGroupSession } from '@/types/session';

import InviteMemberModal from './InviteMemberModal';

const useStyles = createStyles(({ css, token }) => ({
  content: css`
    padding: ${token.paddingSM}px;
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
}));

const GroupChatSidebar = memo(() => {
  const { t } = useTranslation(['chat', 'common']);
  const { styles } = useStyles();
  const [inviteModalOpen, setInviteModalOpen] = useState(false);

  const activeGroupId = useSessionStore((s) => s.activeId);
  const currentSession = useSessionStore(sessionSelectors.currentSession) as LobeGroupSession;

  const addAgentsToGroup = useChatGroupStore((s) => s.addAgentsToGroup);

  const currentGroup = useChatGroupStore((s) =>
    activeGroupId ? chatGroupSelectors.getGroupById(activeGroupId)(s) : null,
  );

  const groupAgents = useChatGroupStore((s) =>
    activeGroupId ? chatGroupSelectors.getGroupAgents(activeGroupId)(s) : [],
  );

  const currentUser = useUserStore((s) => ({
    avatar: userProfileSelectors.userAvatar(s),
    name: userProfileSelectors.displayUserName(s) || userProfileSelectors.nickName(s) || 'You',
  }));

  const handleInviteMembers = async (selectedAgents: string[]) => {
    if (!activeGroupId) {
      console.error('No active group to add members to');
      return;
    }
    await addAgentsToGroup(activeGroupId, selectedAgents);
    setInviteModalOpen(false);
  };

  const totalMembers = 1 + groupAgents.length;

  return (
    <Flexbox height={'100%'}>
      <SidebarHeader
        actions={[
          <ActionIcon icon={Settings} key="settings" size={'small'} title={t('common:setting')} />,
        ]}
        title={
          <Flexbox align={'center'} gap={8} horizontal>
            {currentGroup?.meta?.title || t('groupDescription')}
          </Flexbox>
        }
      />

      <SidebarHeader
        actions={
          <ActionIcon
            icon={UserPlus}
            key="addMember"
            onClick={() => setInviteModalOpen(true)}
            size={'small'}
            title={t('addMember')}
          />
        }
        style={{ cursor: 'pointer' }}
        title={
          <Flexbox align={'center'} gap={8} horizontal>
            {t('members')} ({totalMembers})
          </Flexbox>
        }
      />

      <Flexbox className={styles.content} flex={1} gap={4}>
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

        {currentSession?.members?.length === 0 ? (
          <div className={styles.emptyState}>{t('noAgentsYet')}</div>
        ) : (
          <div>
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
                  </Flexbox>
                </div>
              );
            })}
          </div>
        )}
      </Flexbox>

      <InviteMemberModal
        onCancel={() => setInviteModalOpen(false)}
        onConfirm={handleInviteMembers}
        open={inviteModalOpen}
      />
    </Flexbox>
  );
});

GroupChatSidebar.displayName = 'GroupChat';

export default GroupChatSidebar;
