'use client';

import { ActionIcon, Avatar, List, Modal, SearchBar } from '@lobehub/ui';
import { Button, Checkbox, Empty, List as AntdList, Typography } from 'antd';
import { useHover } from 'ahooks';
import { createStyles } from 'antd-style';
import { X } from 'lucide-react';
import { type ChangeEvent, memo, useCallback, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Flexbox } from 'react-layout-kit';

import { useActionSWR } from '@/libs/swr';
import { useSessionStore } from '@/store/session';
import { LobeAgentSession, LobeSessionType } from 'packages/types/src/session';

const { Text } = Typography;

const AvailableAgentItem = memo<{
  agent: LobeAgentSession;
  cx: any;
  isSelected: boolean;
  onToggle: (_agentId: string) => void;
  styles: any;
  t: any;
}>(({ agent, isSelected, onToggle, styles, cx, t }) => {
  const ref = useRef(null);
  const isHovering = useHover(ref);

  const _agentId = agent.config?.id;
  const title = agent.meta?.title || t('untitledAgent', { ns: 'chat' });
  const description = agent.meta?.description || '';
  const avatar = agent.meta?.avatar;
  const avatarBackground = agent.meta?.backgroundColor;

  if (!_agentId) return null;

  return (
    <AntdList.Item
      className={cx(styles.listItem)}
      onClick={() => onToggle(_agentId)}
      ref={ref}
    >
      <Flexbox align="center" gap={12} horizontal width="100%">
        <Checkbox
          checked={isSelected}
          onChange={(e) => {
            e.stopPropagation();
            onToggle(_agentId);
          }}
        />
        <Avatar
          animation={isHovering}
          avatar={avatar}
          background={avatarBackground}
          shape="circle"
          size={40}
        />
        <Flexbox flex={1} gap={2}>
          <Text className={styles.title}>{title}</Text>
          {description && (
            <Text className={styles.description} ellipsis>
              {description}
            </Text>
          )}
        </Flexbox>
      </Flexbox>
    </AntdList.Item>
  );
});

AvailableAgentItem.displayName = 'AvailableAgentItem';

const useStyles = createStyles(({ css, token }) => ({
  container: css`
    display: flex;
    flex-direction: row;
    height: 500px;
    border: 1px solid ${token.colorBorderSecondary};
    border-radius: ${token.borderRadius}px;
  `,
  description: css`
    color: ${token.colorTextSecondary};
    font-size: 11px;
    line-height: 1.2;
  `,
  leftColumn: css`
    flex: 1;
    overflow-y: auto;
    border-right: 1px solid ${token.colorBorderSecondary};
    padding: ${token.paddingSM}px;
    select: none;
  `,
  listItem: css`
    position: relative;
    margin-block: 2px;
    cursor: pointer;
    transition: all 0.2s ease;
    padding: ${token.paddingSM}px !important;
    border-radius: ${token.borderRadius}px;

    &:hover {
      background: ${token.colorFillTertiary};
    }
  `,
  rightColumn: css`
    flex: 1;
    overflow-y: auto;
    padding: ${token.paddingSM}px;
  `,
  selectedItem: css`
    background: ${token.colorFillQuaternary};
    opacity: 0.6;
  `,
  title: css`
    line-height: 1.2;
    font-size: 13px;
    font-weight: 500;
  `,
}));

export type MemberSelectionMode = 'create' | 'invite';

export interface MemberSelectionModalProps {
  /**
   * Group ID for invite mode (required when mode is 'invite')
   */
  groupId?: string;
  /**
   * The mode of the modal:
   * - 'create': For selecting initial members when creating a new group
   * - 'invite': For adding members to an existing group
   */
  mode: MemberSelectionMode;
  onCancel: () => void;
  onConfirm: (selectedAgents: string[]) => void | Promise<void>;
  open: boolean;
  /**
   * Pre-selected agent IDs (useful for editing existing groups)
   */
  preSelectedAgents?: string[];
}

const MemberSelectionModal = memo<MemberSelectionModalProps>(({
  mode,
  open,
  onCancel,
  onConfirm,
  preSelectedAgents = [],
  groupId
}) => {
  const { t } = useTranslation(['chat', 'common']);
  const { styles, cx } = useStyles();
  const [selectedAgents, setSelectedAgents] = useState<string[]>(preSelectedAgents);
  const [searchTerm, setSearchTerm] = useState('');

  const agentSessions = useSessionStore((s) => {
    const allSessions = s.sessions || [];
    return allSessions.filter((session) => session.type === LobeSessionType.Agent);
  });

  const currentSessionId = useSessionStore((s) => s.activeId);

  const handleAgentToggle = (agentId: string) => {
    setSelectedAgents((prev) =>
      prev.includes(agentId)
        ? prev.filter((id) => id !== agentId)
        : [...prev, agentId],
    );
  };

  const handleRemoveAgent = (agentId: string) => {
    setSelectedAgents((prev) => prev.filter((id) => id !== agentId));
  };

  const handleSearchChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      setSearchTerm(e.target.value);
    },
    [],
  );

  // Filter logic based on mode
  const availableAgents = useMemo(() => {
    if (mode === 'create') {
      // When creating a new group, all agents are available
      return agentSessions;
    } else {
      // When inviting to existing group, filter out the current session to avoid self-invitation
      return agentSessions.filter((agent) => agent.id !== currentSessionId);
    }
  }, [agentSessions, currentSessionId, mode]);

  // Filter available agents based on search term
  const filteredAvailableAgents = useMemo(() => {
    if (!searchTerm.trim()) return availableAgents;

    return availableAgents.filter((agent) => {
      const title = agent.meta?.title || '';
      const description = agent.meta?.description || '';
      const searchLower = searchTerm.toLowerCase();

      return title.toLowerCase().includes(searchLower) ||
        description.toLowerCase().includes(searchLower);
    });
  }, [availableAgents, searchTerm]);

  const selectedAgentListItems = useMemo(() => {
    return selectedAgents
      .map(agentId => {
        const agent = agentSessions.find(session => session.config.id === agentId);
        if (!agent) return null;

        const title = agent.meta?.title || t('untitledAgent', { ns: 'chat' });
        const avatar = agent.meta?.avatar;
        const avatarBackground = agent.meta?.backgroundColor;
        const description = agent.meta?.description || '';

        return {
          actions: (
            <ActionIcon
              icon={X}
              onClick={() => handleRemoveAgent(agentId)}
              size="small"
              style={{ color: '#999' }}
            />
          ),
          avatar: (
            <Avatar
              avatar={avatar}
              background={avatarBackground}
              shape="circle"
              size={40}
            />
          ),
          description,
          key: agentId,
          showAction: true,
          title,
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);
  }, [selectedAgents, agentSessions, t, handleRemoveAgent]);

  const handleReset = () => {
    setSelectedAgents(preSelectedAgents);
    setSearchTerm('');
  };

  const { mutate: confirmAction, isValidating: isInviting } = useActionSWR(
    ['memberSelectionModal.confirm', mode, groupId],
    async () => {
      await onConfirm(selectedAgents);
      handleReset();
    }
  );

  const handleConfirm = () => {
    confirmAction();
  };

  const handleCancel = () => {
    handleReset();
    onCancel();
  };

  // Dynamic content based on mode
  const modalTitle = mode === 'create'
    ? 'Select Initial Members'
    : t('inviteMembers', { ns: 'chat' });

  const confirmButtonText = mode === 'create'
    ? 'Create Group'
    : 'Invite';

  const minMembersRequired = mode === 'create' ? 1 : 0; // At least 1 member for group creation
  const isConfirmDisabled = selectedAgents.length < minMembersRequired || isInviting;

  return (
    <Modal
      allowFullscreen
      footer={
        <Flexbox gap={8} horizontal justify="end">
          <Button onClick={handleCancel}>
            {t('cancel', { ns: 'common' })}
          </Button>
          <Button
            disabled={isConfirmDisabled}
            loading={isInviting}
            onClick={handleConfirm}
            type="primary"
          >
            {confirmButtonText} ({selectedAgents.length})
          </Button>
        </Flexbox>
      }
      onCancel={handleCancel}
      open={open}
      title={modalTitle}
      width={800}
    >
      <Flexbox className={styles.container} horizontal>
        {/* Left Column - Available Agents */}
        <Flexbox className={styles.leftColumn} flex={1} gap={12}>
          <SearchBar
            allowClear
            onChange={handleSearchChange}
            placeholder={t('searchAgents', { ns: 'chat' })}
            value={searchTerm}
            variant="filled"
          />

          <Flexbox flex={1} style={{ overflowY: 'auto' }}>
            {filteredAvailableAgents.length === 0 ? (
              <Empty
                description={searchTerm ? t('noMatchingAgents', { ns: 'chat' }) : t('noAvailableAgents', { ns: 'chat' })}
                image={Empty.PRESENTED_IMAGE_SIMPLE}
              />
            ) : (
              <AntdList
                dataSource={filteredAvailableAgents}
                renderItem={(agent) => {
                  const agentId = agent.config?.id;
                  if (!agentId) return null;

                  const isSelected = selectedAgents.includes(agentId);

                  return (
                    <AvailableAgentItem
                      agent={agent}
                      cx={cx}
                      isSelected={isSelected}
                      key={agentId}
                      onToggle={handleAgentToggle}
                      styles={styles}
                      t={t}
                    />
                  );
                }}
                split={false}
              />
            )}
          </Flexbox>
        </Flexbox>

        {/* Right Column - Selected Agents */}
        <Flexbox className={styles.rightColumn} flex={1}>
          {selectedAgentListItems.length === 0 ? (
            <Flexbox align="center" flex={1} justify="center">
              <Empty
                description={mode === 'create'
                  ? 'No members selected'
                  : t('noSelectedAgents', { ns: 'chat' })
                }
                image={Empty.PRESENTED_IMAGE_SIMPLE}
              />
            </Flexbox>
          ) : (
            <List items={selectedAgentListItems} />
          )}
        </Flexbox>
      </Flexbox>
    </Modal>
  );
});

MemberSelectionModal.displayName = 'MemberSelectionModal';

export default MemberSelectionModal;