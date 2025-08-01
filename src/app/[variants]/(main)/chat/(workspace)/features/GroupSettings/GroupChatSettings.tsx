'use client';

import { Form, type FormGroupItemType, SliderWithInput } from '@lobehub/ui';
import { useUpdateEffect } from 'ahooks';
import { memo } from 'react';
import { useTranslation } from 'react-i18next';

import { FORM_STYLE } from '@/const/layoutTokens';
import { useChatGroupStore } from '@/store/chatGroup';
import { chatGroupSelectors } from '@/store/chatGroup/selectors';
import { useSessionStore } from '@/store/session';

const GroupChatSettings = memo(() => {
  const { t } = useTranslation(['setting', 'common']);
  const [form] = Form.useForm();
  
  const activeGroupId = useSessionStore((s) => s.activeId);
  const currentGroup = useChatGroupStore((s) =>
    activeGroupId ? chatGroupSelectors.getGroupById(activeGroupId)(s) : null,
  );
  
  const updateGroup = useChatGroupStore((s) => s.updateGroup);

  // Convert response order to numerical value for slider
  const getResponseSpeedValue = (responseOrder?: 'sequential' | 'random' | 'smart') => {
    switch (responseOrder) {
      case 'sequential':
        return 1;
      case 'smart':
        return 2;
      case 'random':
        return 3;
      default:
        return 2; // default to smart
    }
  };

  // Convert numerical value back to response order
  const getResponseOrder = (value: number): 'sequential' | 'random' | 'smart' => {
    switch (value) {
      case 1:
        return 'sequential';
      case 2:
        return 'smart';
      case 3:
        return 'random';
      default:
        return 'smart';
    }
  };

  const responseSpeedValue = getResponseSpeedValue(currentGroup?.config?.responseOrder);

  const chatData = {
    responseSpeed: responseSpeedValue,
  };

  useUpdateEffect(() => {
    form.setFieldsValue(chatData);
  }, [chatData]);

  const handleFinish = async (values: { responseSpeed: number }) => {
    if (!activeGroupId) return;
    
    const responseOrder = getResponseOrder(values.responseSpeed);
    const newConfig = {
      ...currentGroup?.config,
      responseOrder,
    };
    
    await updateGroup(activeGroupId, { config: newConfig });
  };

  const responseSpeedMarks = {
    1: 'Sequential',
    2: 'Smart',
    3: 'Random',
  };

  const chatSettings: FormGroupItemType = {
    children: [
      {
        children: (
          <SliderWithInput
            marks={responseSpeedMarks}
            max={3}
            min={1}
            step={1}
          />
        ),
        desc: "Choose how agents respond in group conversations",
        label: "Response Speed",
        name: 'responseSpeed',
      },
    ],
    extra: (
      <div style={{ fontSize: '12px', color: '#666', marginTop: '8px' }}>
        <strong>Sequential:</strong> Agents respond one by one in order<br />
        <strong>Smart:</strong> AI determines the best agent to respond<br />
        <strong>Random:</strong> Agents respond in random order
      </div>
    ),
    title: 'Chat Settings',
  };

  return (
    <Form
      footer={
        <Form.SubmitFooter
          texts={{
            reset: t('submitFooter.reset'),
            submit: 'Update Settings',
            unSaved: t('submitFooter.unSaved'),
            unSavedWarning: t('submitFooter.unSavedWarning'),
          }}
        />
      }
      form={form}
      initialValues={chatData}
      items={[chatSettings]}
      itemsType={'group'}
      onFinish={handleFinish}
      variant={'borderless'}
      {...FORM_STYLE}
    />
  );
});

GroupChatSettings.displayName = 'GroupChatSettings';

export default GroupChatSettings; 
