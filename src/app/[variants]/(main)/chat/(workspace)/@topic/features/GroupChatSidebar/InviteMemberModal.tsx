'use client';

import { Avatar, Modal } from '@lobehub/ui';
import { Button, Empty, List, Typography } from 'antd';
import { memo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Flexbox } from 'react-layout-kit';

import { useSessionStore } from '@/store/session';
import { sessionSelectors } from '@/store/session/selectors';
import { LobeAgentSession, LobeSessionType } from '@/types/session';

const { Text } = Typography;

export interface InviteMemberModalProps {
  onCancel: () => void;
  onConfirm: (selectedAgents: string[]) => void;
  open: boolean;
}

const InviteMemberModal = memo<InviteMemberModalProps>(({ open, onCancel, onConfirm }) => {
  const { t } = useTranslation(['chat', 'common']);
  const [selectedAgents, setSelectedAgents] = useState<string[]>([]);

  // Get all agent sessions (excluding group sessions)
  const agentSessions = useSessionStore((s) => {
    const allSessions = s.sessions || [];
    return allSessions.filter((session) => session.type === LobeSessionType.Agent);
  });

  const currentSessionId = useSessionStore((s) => s.activeId);

  // Filter out the current session to avoid self-invitation
  const availableAgents = agentSessions.filter((agent) => agent.id !== currentSessionId);

  const handleAgentToggle = (agentId: string) => {
    setSelectedAgents((prev) =>
      prev.includes(agentId)
        ? prev.filter((id) => id !== agentId)
        : [...prev, agentId]
    );
  };

  const handleConfirm = () => {
    onConfirm(selectedAgents);
    setSelectedAgents([]);
    onCancel();
  };

  const handleCancel = () => {
    setSelectedAgents([]);
    onCancel();
  };

  return (
    <Modal
      allowFullscreen
      footer={
        <Flexbox gap={8} horizontal justify="end">
          <Button onClick={handleCancel}>
            {t('cancel', { ns: 'common' })}
          </Button>
          <Button
            disabled={selectedAgents.length === 0}
            onClick={handleConfirm}
            type="primary"
          >
            {t('invite', { ns: 'common' })} ({selectedAgents.length})
          </Button>
        </Flexbox>
      }
      onCancel={handleCancel}
      open={open}
      title={t('inviteMembers', { ns: 'chat' })}
      width={500}
    >
      <Flexbox gap={16} style={{ maxHeight: 400, overflowY: 'auto' }}>
        {availableAgents.length === 0 ? (
          <Empty
            description={t('noAvailableAgents', { ns: 'chat' })}
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          />
        ) : (
          <List
            dataSource={availableAgents}
            renderItem={(agent) => {
              const isSelected = selectedAgents.includes(agent.id);
              const title = agent.meta?.title || t('untitledAgent', { ns: 'chat' });
              const description = agent.meta?.description || '';
              const avatar = agent.meta?.avatar;

              return (
                <List.Item
                  style={{
                    cursor: 'pointer',
                    opacity: isSelected ? 0.8 : 1,
                    padding: '12px 16px',
                    transition: 'all 0.2s ease',
                  }}
                  onClick={() => handleAgentToggle(agent.id)}
                >
                  <Flexbox align="center" gap={12} horizontal width="100%">
                    <Avatar
                      avatar={avatar}
                      size={40}
                      style={{
                        border: isSelected ? '2px solid #1890ff' : '2px solid transparent',
                        transition: 'border-color 0.2s ease',
                      }}
                    />
                    <Flexbox flex={1} gap={4}>
                      <Text strong>{title}</Text>
                      {description && (
                        <Text
                          ellipsis={{ rows: 2 }}
                          style={{ color: '#666', fontSize: '12px' }}
                        >
                          {description}
                        </Text>
                      )}
                    </Flexbox>
                    {isSelected && (
                      <div
                        style={{
                          background: '#1890ff',
                          borderRadius: '50%',
                          color: 'white',
                          fontSize: '12px',
                          height: 20,
                          lineHeight: '20px',
                          textAlign: 'center',
                          width: 20,
                        }}
                      >
                        ✓
                      </div>
                    )}
                  </Flexbox>
                </List.Item>
              );
            }}
            split={false}
          />
        )}
      </Flexbox>
    </Modal>
  );
});

InviteMemberModal.displayName = 'InviteMemberModal';

export default InviteMemberModal; 
