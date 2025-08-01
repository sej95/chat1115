'use client';

import { Form, FormItem } from '@lobehub/ui';
import { Input } from 'antd';
import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { Flexbox } from 'react-layout-kit';

import { useChatGroupStore } from '@/store/chatGroup';
import { chatGroupSelectors } from '@/store/chatGroup/selectors';
import { useSessionStore } from '@/store/session';

const { TextArea } = Input;

const GroupSettingsContent = memo(() => {
  const { t } = useTranslation(['setting', 'common']);
  
  const activeGroupId = useSessionStore((s) => s.activeId);
  const currentGroup = useChatGroupStore((s) =>
    activeGroupId ? chatGroupSelectors.getGroupById(activeGroupId)(s) : null,
  );
  
  const updateGroup = useChatGroupStore((s) => s.updateGroup);

  const handleUpdateName = async (title: string) => {
    if (!activeGroupId) return;
    await updateGroup(activeGroupId, { title });
  };

  const handleUpdateDescription = async (description: string) => {
    if (!activeGroupId) return;
    await updateGroup(activeGroupId, { description });
  };

  return (
    <Flexbox gap={24} paddingInline={24}>
      <Form>
        <FormItem label={t('common:name')} minWidth={undefined}>
          <Input
            onBlur={(e) => {
              const newTitle = e.target.value.trim();
              if (newTitle !== currentGroup?.title) {
                handleUpdateName(newTitle);
              }
            }}
            placeholder={t('common:name')}
            value={currentGroup?.title || ''}
            onChange={(e) => {
              // For immediate UI feedback, we could dispatch a local state update here
              // But for simplicity, we'll handle it on blur
            }}
          />
        </FormItem>

        <FormItem label={t('common:description')} minWidth={undefined}>
          <TextArea
            autoSize={{ minRows: 3, maxRows: 8 }}
            onBlur={(e) => {
              const newDescription = e.target.value.trim();
              if (newDescription !== currentGroup?.description) {
                handleUpdateDescription(newDescription);
              }
            }}
            placeholder="Group description..."
            rows={4}
            value={currentGroup?.description || ''}
            onChange={(e) => {
              // For immediate UI feedback, we could dispatch a local state update here
              // But for simplicity, we'll handle it on blur
            }}
          />
        </FormItem>
      </Form>
    </Flexbox>
  );
});

GroupSettingsContent.displayName = 'GroupSettingsContent';

export default GroupSettingsContent; 
