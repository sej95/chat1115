'use client';

import { Avatar, Modal } from '@lobehub/ui';
import { Button, Empty, Input, List, Typography } from 'antd';
import { useHover } from 'ahooks';
import { createStyles } from 'antd-style';
import { Search, X } from 'lucide-react';
import { memo, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Flexbox } from 'react-layout-kit';

import { useSessionStore } from '@/store/session';
import { LobeAgentSession, LobeSessionType } from '@/types/session';

const { Text } = Typography;

// Separate component for available agent items to properly use hooks
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
    <List.Item
      className={cx(styles.listItem, isSelected && styles.selectedItem)}
      onClick={() => onToggle(_agentId)}
      ref={ref}
    >
      <Flexbox align="center" gap={12} horizontal width="100%">
        <Avatar
          animation={isHovering}
          avatar={avatar}
          background={avatarBackground}
          shape="circle"
          size={40}
          style={{
            border: isSelected ? '2px solid #1890ff' : '2px solid transparent',
            transition: 'border-color 0.2s ease',
          }}
        />
        <Flexbox flex={1} gap={2}>
          <Text className={styles.title}>{title}</Text>
          {description && (
            <Text className={styles.description} ellipsis>
              {description}
            </Text>
          )}
        </Flexbox>
        {isSelected && (
          <div className={styles.selectedIndicator}>
            ✓
          </div>
        )}
      </Flexbox>
    </List.Item>
  );
});

AvailableAgentItem.displayName = 'AvailableAgentItem';

// Separate component for selected agent items to properly use hooks
const SelectedAgentItem = memo<{
  agent: LobeAgentSession;
  onRemove: (_agentId: string) => void;
  styles: any;
  t: any;
}>(({ agent, onRemove, styles, t }) => {
  const ref = useRef(null);
  const isHovering = useHover(ref);
  
  const _agentId = agent.config?.id;
  const title = agent.meta?.title || t('untitledAgent', { ns: 'chat' });
  const description = agent.meta?.description || '';
  const avatar = agent.meta?.avatar;
  const avatarBackground = agent.meta?.backgroundColor;

  if (!_agentId) return null;

  return (
    <List.Item className={styles.memberCard} ref={ref}>
      <Flexbox align="center" gap={12} horizontal width="100%">
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
        <Button
          icon={<X size={14} />}
          onClick={() => onRemove(_agentId)}
          size="small"
          style={{ color: '#999' }}
          type="text"
        />
      </Flexbox>
    </List.Item>
  );
});

SelectedAgentItem.displayName = 'SelectedAgentItem';

const useStyles = createStyles(({ css, token }) => ({
  description: css`
    color: ${token.colorTextSecondary};
    font-size: 11px;
    line-height: 1.2;
  `,
  listItem: css`
    position: relative;
    margin-block: 2px;
    padding: 12px 8px;
    border-radius: ${token.borderRadius}px;
    cursor: pointer;
    transition: all 0.2s ease;

    &:hover {
      background: ${token.colorFillTertiary};
    }
  `,
  memberCard: css`
    background: ${token.colorFillQuaternary};
    border-radius: ${token.borderRadius}px;
    margin: 4px 0;
    padding: 12px 8px;
  `,
  selectedIndicator: css`
    background: ${token.colorPrimary};
    border-radius: 50%;
    color: white;
    font-size: 10px;
    height: 16px;
    line-height: 16px;
    text-align: center;
    width: 16px;
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
   * The mode of the modal:
   * - 'create': For selecting initial members when creating a new group
   * - 'invite': For adding members to an existing group
   */
  mode: MemberSelectionMode;
  onCancel: () => void;
  onConfirm: (selectedAgents: string[]) => void;
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
  preSelectedAgents = []
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

  // Get selected agent sessions
  const selectedAgentSessions = useMemo(() => {
    return selectedAgents.map(agentId =>
      agentSessions.find(agent => agent.config.id === agentId)
    ).filter(Boolean) as LobeAgentSession[];
  }, [selectedAgents, agentSessions]);

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

  const handleReset = () => {
    setSelectedAgents(preSelectedAgents);
    setSearchTerm('');
  };

  const handleConfirm = () => {
    onConfirm(selectedAgents);
    handleReset();
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
  const isConfirmDisabled = selectedAgents.length < minMembersRequired;

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
      <Flexbox gap={16} horizontal style={{ border: '1px solid #f0f0f0', borderRadius: 8, height: 500 }}>
        {/* Left Column - Available Agents */}
        <Flexbox flex={1} gap={12} style={{ borderRight: '1px solid #f0f0f0', padding: 16 }}>
          <Flexbox gap={8}>
            <Input
              allowClear
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={t('searchAgents', { ns: 'chat' })}
              prefix={<Search size={16} />}
              value={searchTerm}
            />
          </Flexbox>

          <Flexbox flex={1} style={{ overflowY: 'auto' }}>
            {filteredAvailableAgents.length === 0 ? (
              <Empty
                description={searchTerm ? t('noMatchingAgents', { ns: 'chat' }) : t('noAvailableAgents', { ns: 'chat' })}
                image={Empty.PRESENTED_IMAGE_SIMPLE}
              />
            ) : (
              <List
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
        <Flexbox flex={1} style={{ padding: 16 }}>
          <Flexbox flex={1} style={{ overflowY: 'auto' }}>
            {selectedAgentSessions.length === 0 ? (
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
              <List
                dataSource={selectedAgentSessions}
                renderItem={(agent) => {
                  const agentId = agent.config?.id;
                  if (!agentId) return null;

                  return (
                    <SelectedAgentItem
                      agent={agent}
                      key={agentId}
                      onRemove={handleRemoveAgent}
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
      </Flexbox>
    </Modal>
  );
});

MemberSelectionModal.displayName = 'MemberSelectionModal';

export default MemberSelectionModal;