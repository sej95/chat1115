'use client';

import { Form, type FormGroupItemType, SliderWithInput } from '@lobehub/ui';
import { memo } from 'react';
import { useTranslation } from 'react-i18next';

import { FORM_STYLE } from '@/const/layoutTokens';

import { selectors, useStore } from './store';
import { Select } from 'antd';
import ModelSelect from '../ModelSelect';
import { isEqual } from 'lodash';

/**
 * Chat Settings for Group Chat
 */
const ChatGroupSettings = memo(() => {
  const { t } = useTranslation(['setting', 'common']);
  const [form] = Form.useForm();
  const updateConfig = useStore((s) => s.updateGroupConfig);
  const config = useStore(selectors.currentChatConfig, isEqual)

  const responseSpeedOptions = [
    { label: 'Slow', value: 'slow' },
    { label: 'Medium', value: 'medium' },
    { label: 'Fast', value: 'fast' },
  ];

  const chatSettings: FormGroupItemType = {
    children: [
      {
        children: <ModelSelect />,
        desc: "Choose the model to use for group conversations",
        label: "Orchestrator Model",
        name: '_modelConfig',
      },
      {
        children: (
          <Select 
            options={responseSpeedOptions}
            placeholder="Select response speed"
          />
        ),
        desc: "Choose how agents respond in group conversations",
        label: "Response Speed",
        name: 'responseSpeed',
      },
      {
        children: (
          <Select 
            options={[
              { label: 'Sequential', value: 'sequential' },
              { label: 'Natural', value: 'natural' },
            ]}
            placeholder="Select response order"
          />
        ),
        desc: "Agents will respond in the order they are set in the group",
        label: "Response Order",
        name: 'responseOrder',
      },
      {
        children: <SliderWithInput max={8} min={0} unlimitedInput={true} />,
        desc: "Choose how many messages members can respond in a row. This will reset after an user message.",
        divider: false,
        label: "Max Messages in a row",
        name: 'maxResponseInRow',
      },
    ],
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
      initialValues={{
        ...config,
        _modelConfig: {
          model: config?.orchestratorModel,
          provider: config?.orchestratorProvider,
        },
      }}
      items={[chatSettings]}
      itemsType={'group'}
      onFinish={({ _modelConfig, ...rest }) => {
        updateConfig({
          orchestratorModel: _modelConfig?.model,
          orchestratorProvider: _modelConfig?.provider,
          ...rest,
        });
      }}
      variant={'borderless'}
      {...FORM_STYLE}
    />
  );
});

export default ChatGroupSettings;
