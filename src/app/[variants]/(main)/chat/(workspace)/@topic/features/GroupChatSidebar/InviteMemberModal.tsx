'use client';

import { Avatar, Modal } from '@lobehub/ui';
import { Button, Empty, Input, List, Typography } from 'antd';
import { Search, X } from 'lucide-react';
import { memo, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Flexbox } from 'react-layout-kit';

import { useSessionStore } from '@/store/session';
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
  const [searchTerm, setSearchTerm] = useState('');

  const agentSessions = useSessionStore((s) => {
    const allSessions = s.sessions || [];
    return allSessions.filter((session) => session.type === LobeSessionType.Agent);
  });

  const currentSessionId = useSessionStore((s) => s.activeId);

  // Filter out the current session to avoid self-invitation
  const availableAgents = agentSessions.filter((agent) => agent.id !== currentSessionId);

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

  const handleConfirm = () => {
    onConfirm(selectedAgents);
    setSelectedAgents([]);
    setSearchTerm('');
    onCancel();
  };

  const handleCancel = () => {
    setSelectedAgents([]);
    setSearchTerm('');
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
            Invite ({selectedAgents.length})
          </Button>
        </Flexbox>
      }
      onCancel={handleCancel}
      open={open}
      title={t('inviteMembers', { ns: 'chat' })}
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
                  const title = agent.meta?.title || t('untitledAgent', { ns: 'chat' });
                  const description = agent.meta?.description || '';
                  const avatar = agent.meta?.avatar;

                  return (
                    <List.Item
                      onClick={() => handleAgentToggle(agentId)}
                      style={{
                        borderRadius: '6px',
                        cursor: 'pointer',
                        margin: '4px 0',
                        opacity: isSelected ? 0.6 : 1,
                        padding: '12px 8px',
                        transition: 'all 0.2s ease',
                      }}
                    >
                      <Flexbox align="center" gap={12} horizontal width="100%">
                        <Avatar
                          avatar={avatar}
                          size={32}
                          style={{
                            border: isSelected ? '2px solid #1890ff' : '2px solid transparent',
                            transition: 'border-color 0.2s ease',
                          }}
                        />
                        <Flexbox flex={1} gap={2}>
                          <Text strong style={{ fontSize: '13px' }}>{title}</Text>
                          {description && (
                            <Text
                              ellipsis
                              style={{ color: '#666', fontSize: '11px' }}
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
                              fontSize: '10px',
                              height: 16,
                              lineHeight: '16px',
                              textAlign: 'center',
                              width: 16,
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
        </Flexbox>

        {/* Right Column - Selected Agents */}
        <Flexbox flex={1} gap={12} style={{ padding: 16 }}>
          <Flexbox flex={1} style={{ overflowY: 'auto' }}>
            {selectedAgentSessions.length === 0 ? (
              <Empty
                description={t('noSelectedAgents', { ns: 'chat' })}
                image={Empty.PRESENTED_IMAGE_SIMPLE}
              />
            ) : (
              <List
                dataSource={selectedAgentSessions}
                renderItem={(agent) => {
                  const agentId = agent.config?.id;
                  if (!agentId) return null;

                  const title = agent.meta?.title || t('untitledAgent', { ns: 'chat' });
                  const description = agent.meta?.description || '';
                  const avatar = agent.meta?.avatar;

                  return (
                    <List.Item
                      style={{
                        background: '#f8f9fa',
                        borderRadius: '6px',
                        margin: '4px 0',
                        padding: '12px 8px',
                      }}
                    >
                      <Flexbox align="center" gap={12} horizontal width="100%">
                        <Avatar avatar={avatar} size={32} />
                        <Flexbox flex={1} gap={2}>
                          <Text strong style={{ fontSize: '13px' }}>{title}</Text>
                          {description && (
                            <Text
                              ellipsis
                              style={{ color: '#666', fontSize: '11px' }}
                            >
                              {description}
                            </Text>
                          )}
                        </Flexbox>
                        <Button
                          icon={<X size={14} />}
                          onClick={() => handleRemoveAgent(agentId)}
                          size="small"
                          style={{ color: '#999' }}
                          type="text"
                        />
                      </Flexbox>
                    </List.Item>
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

InviteMemberModal.displayName = 'InviteMemberModal';

export default InviteMemberModal; 
