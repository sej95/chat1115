'use client';

import { Form, type FormGroupItemType } from '@lobehub/ui';
import { Input } from 'antd';
import { useUpdateEffect } from 'ahooks';
import { memo } from 'react';
import { useTranslation } from 'react-i18next';

import { FORM_STYLE } from '@/const/layoutTokens';
import { useChatGroupStore } from '@/store/chatGroup';
import { chatGroupSelectors } from '@/store/chatGroup/selectors';
import { useSessionStore } from '@/store/session';

const { TextArea } = Input;

/**
 * General Settings for Group Chat
 */
const GroupSettingsForm = memo(() => {
  const { t } = useTranslation(['setting', 'common']);
  const [form] = Form.useForm();

  const activeGroupId = useSessionStore((s) => s.activeId);
  const currentGroup = useChatGroupStore((s) =>
    activeGroupId ? chatGroupSelectors.getGroupById(activeGroupId)(s) : null,
  );

  const updateGroup = useChatGroupStore((s) => s.updateGroup);

  const groupData = {
    description: currentGroup?.description || '',
    title: currentGroup?.title || '',
  };

  useUpdateEffect(() => {
    form.setFieldsValue(groupData);
  }, [groupData]);

  const handleFinish = async (values: { title: string; description: string }) => {
    if (!activeGroupId) return;

    const updates: { description?: string; title?: string } = {};

    if (values.description !== currentGroup?.description) {
      updates.description = values.description;
    }

    if (values.title !== currentGroup?.title) {
      updates.title = values.title;
    }

    if (Object.keys(updates).length > 0) {
      await updateGroup(activeGroupId, updates);
    }
  };

  const groupSettings: FormGroupItemType = {
    children: [
      {
        children: <Input placeholder={t('settingGroup.name.placeholder')} />,
        label: t('settingGroup.name.title'),
        name: 'title',
      },
      {
        children: (
          <TextArea
            autoSize={{ maxRows: 8, minRows: 3 }}
            placeholder={t('settingGroup.description.placeholder')}
            rows={4}
          />
        ),
        label: t('settingGroup.description.title'),
        name: 'description',
      },
    ],
    title: t('settingGroup.title'),
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

GroupSettingsForm.displayName = 'GroupSettingsForm';

export default GroupSettingsForm;