'use client';

import { Form, type FormGroupItemType } from '@lobehub/ui';
import { Input } from 'antd';
import { useUpdateEffect } from 'ahooks';
import isEqual from 'fast-deep-equal';
import { memo } from 'react';
import { useTranslation } from 'react-i18next';

import { FORM_STYLE } from '@/const/layoutTokens';

import { selectors, useStore } from './store';

const { TextArea } = Input;

/**
 * General Settings for Group Chat
 */
const GroupMeta = memo(() => {
  const { t } = useTranslation(['setting', 'common']);
  const [form] = Form.useForm();

  const updateMeta = useStore((s) => s.updateGroupMeta);
  const meta = useStore(selectors.meta, isEqual) || {};

  const groupData = {
    description: meta.description || '',
    title: meta.title || '',
  };

  useUpdateEffect(() => {
    form.setFieldsValue(groupData);
  }, [groupData]);

  const handleFinish = async (values: { description: string; title: string }) => {
    await updateMeta(values);
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

export default GroupMeta;