'use client';

import { Form, type FormGroupItemType } from '@lobehub/ui';
import { Input } from 'antd';
import { useUpdateEffect } from 'ahooks';
import isEqual from 'fast-deep-equal';
import { memo } from 'react';
import { useTranslation } from 'react-i18next';

import { FORM_STYLE } from '@/const/layoutTokens';
import { useChatGroupStore } from '@/store/chatGroup';
import { chatGroupSelectors } from '@/store/chatGroup/selectors';
import { useSessionStore } from '@/store/session';

const { TextArea } = Input;

const GroupSettingsContent = memo(() => {
  const { t } = useTranslation(['setting', 'common']);
  const [form] = Form.useForm();
  
  const activeGroupId = useSessionStore((s) => s.activeId);
  const currentGroup = useChatGroupStore((s) =>
    activeGroupId ? chatGroupSelectors.getGroupById(activeGroupId)(s) : null,
  );
  
  const updateGroup = useChatGroupStore((s) => s.updateGroup);

  const groupData = {
    title: currentGroup?.title || '',
    description: currentGroup?.description || '',
  };

  useUpdateEffect(() => {
    form.setFieldsValue(groupData);
  }, [groupData]);

  const handleFinish = async (values: { title: string; description: string }) => {
    if (!activeGroupId) return;
    
    const updates: { title?: string; description?: string } = {};
    
    if (values.title !== currentGroup?.title) {
      updates.title = values.title;
    }
    
    if (values.description !== currentGroup?.description) {
      updates.description = values.description;
    }
    
    if (Object.keys(updates).length > 0) {
      await updateGroup(activeGroupId, updates);
    }
  };

  const groupSettings: FormGroupItemType = {
    children: [
      {
        children: <Input placeholder={t('common:name')} />,
        label: t('common:name'),
        name: 'title',
      },
      {
        children: (
          <TextArea
            autoSize={{ minRows: 3, maxRows: 8 }}
            placeholder="Group description..."
            rows={4}
          />
        ),
        label: t('common:description'),
        name: 'description',
      },
    ],
    title: 'Group Settings',
  };

  return (
    <Form
      footer={
        <Form.SubmitFooter
          texts={{
            reset: t('submitFooter.reset'),
            submit: 'Update Group',
            unSaved: t('submitFooter.unSaved'),
            unSavedWarning: t('submitFooter.unSavedWarning'),
          }}
        />
      }
      form={form}
      initialValues={groupData}
      items={[groupSettings]}
      itemsType={'group'}
      onFinish={handleFinish}
      variant={'borderless'}
      {...FORM_STYLE}
    />
  );
});

GroupSettingsContent.displayName = 'GroupSettingsContent';

export default GroupSettingsContent; 
