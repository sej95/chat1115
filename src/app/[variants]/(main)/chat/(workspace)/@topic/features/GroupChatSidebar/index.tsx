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

  const activeId = useSessionStore((s) => s.activeId);
  const isGroupSession = useSessionStore(sessionSelectors.currentSessionIsGroup);
  const activeGroupId = isGroupSession ? activeId : null;

  // Get current group ID from the chat store
  const addAgentsToGroup = useChatGroupStore((s) => s.addAgentsToGroup);

  const currentGroup = useChatGroupStore((s) =>
    activeGroupId ? chatGroupSelectors.getGroupById(activeGroupId)(s) : null,
  );

  // Get current group agents
  const groupAgents = useChatGroupStore((s) =>
    activeGroupId ? chatGroupSelectors.getGroupAgents(activeGroupId)(s) : [],
  );

  console.log('groupAgents', groupAgents);

  // Get session data for the agents and current user data
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

  // Get agent details for display
  const getAgentDetails = (agentId: string) => {
    const agent = groupAgents.find((a) => a.id === agentId);
    return {
      avatar: agent?.meta?.avatar,
      description: agent?.meta?.description,
      id: agentId,
      name: agent?.meta?.title || t('untitledAgent'),
    };
  };

  // Total members count includes user + agents
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

      <Flexbox className={styles.content} flex={1} gap={8}>
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
                  color: '#52c41a',
                  fontSize: '11px',
                  fontWeight: 500,
                }}
              >
                {t('active')} • {t('you')}
              </div>
            </Flexbox>
            <div
              style={{
                background: '#52c41a',
                borderRadius: '4px',
                color: 'white',
                fontSize: '10px',
                padding: '2px 6px',
                textTransform: 'uppercase',
              }}
            >
              {t('owner')}
            </div>
          </Flexbox>
        </div>

        {/* Group Agent Members */}
        {groupAgents.length === 0 ? (
          <div className={styles.emptyState}>{t('noAgentsYet')}</div>
        ) : (
          <div>
            {groupAgents.map((agent) => {
              const agentDetails = getAgentDetails(agent.id);

              return (
                <div className={styles.memberItem} key={agent.id}>
                  <Flexbox align={'center'} gap={12} horizontal>
                    <Avatar
                      avatar={agentDetails.avatar}
                      size={32}
                      style={{
                        opacity: agent.enabled ? 1 : 0.5,
                      }}
                    />
                    <Flexbox flex={1} gap={2}>
                      <div
                        style={{
                          fontSize: '14px',
                          fontWeight: 500,
                          opacity: agent.enabled ? 1 : 0.5,
                        }}
                      >
                        {agentDetails.name}
                      </div>
                      {agentDetails.description && (
                        <div
                          style={{
                            color: '#666',
                            fontSize: '12px',
                            opacity: agent.enabled ? 1 : 0.5,
                          }}
                        >
                          {agentDetails.description}
                        </div>
                      )}
                      <div
                        style={{
                          color: agent.enabled ? '#52c41a' : '#d9d9d9',
                          fontSize: '11px',
                          fontWeight: 500,
                        }}
                      >
                        {agent.enabled ? t('active') : t('inactive')}
                      </div>
                    </Flexbox>
                    {agent.role && agent.role !== 'participant' && (
                      <div
                        style={{
                          background: '#1890ff',
                          borderRadius: '4px',
                          color: 'white',
                          fontSize: '10px',
                          padding: '2px 6px',
                          textTransform: 'uppercase',
                        }}
                      >
                        {agent.role}
                      </div>
                    )}
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
