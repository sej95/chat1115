'use client';

import { Form, type FormGroupItemType, type FormItemProps } from '@lobehub/ui';
import { Input, Select, Skeleton, Slider } from 'antd';
import isEqual from 'fast-deep-equal';
import { memo } from 'react';
import { useTranslation } from 'react-i18next';

import { FORM_STYLE } from '@/const/layoutTokens';
import { useUserStore } from '@/store/user';
import { settingsSelectors } from '@/store/user/selectors';

import { searchProviders } from '../constants';

const SearchProvider = memo(() => {
  const { t } = useTranslation('setting');
  const [form] = Form.useForm();

  const settings = useUserStore(settingsSelectors.currentSettings, isEqual);
  const [setSettings, isUserStateInit] = useUserStore((s) => [s.setSettings, s.isUserStateInit]);

  if (!isUserStateInit) return <Skeleton active paragraph={{ rows: 5 }} title={false} />;

  const searchProviderItems: FormItemProps[] = [
    {
      children: (
        <Select
          options={searchProviders.map((provider) => ({
            label: provider.name,
            value: provider.id,
          }))}
          placeholder={t('search.service.search.desc')}
        />
      ),
      desc: t('search.service.search.desc'),
      label: t('search.service.search.title'),
      name: ['search', 'searchProvider'],
    },
    {
      children: <Input.Password placeholder={t('search.apiKey.placeholder')} />,
      desc: t('search.apiKey.desc'),
      label: t('search.apiKey.title'),
      name: ['search', 'searchApiKey'],
    },
    {
      children: <Input placeholder={t('search.endpoint.placeholder')} />,
      desc: t('search.endpoint.desc'),
      label: t('search.endpoint.title'),
      name: ['search', 'searchEndpoint'],
    },
  ];

  const searchConfigItems: FormItemProps[] = [
    {
      children: <Slider max={50} min={1} />,
      desc: t('search.config.maxResults.desc'),
      label: t('search.config.maxResults.title'),
      name: ['search', 'searchConfig', 'maxResults'],
    },
    {
      children: (
        <Input.TextArea placeholder={t('search.config.excludeDomains.placeholder')} rows={3} />
      ),
      desc: t('search.config.excludeDomains.desc'),
      label: t('search.config.excludeDomains.title'),
      name: ['search', 'searchConfig', 'excludeDomains'],
    },
  ];

  const searchProviderGroup: FormGroupItemType = {
    children: searchProviderItems,
    title: t('search.service.title'),
  };

  const searchConfigGroup: FormGroupItemType = {
    children: searchConfigItems,
    title: t('search.config.title'),
  };

  return (
    <Form
      form={form}
      initialValues={settings}
      items={[searchProviderGroup, searchConfigGroup]}
      itemsType={'group'}
      onValuesChange={setSettings}
      variant={'borderless'}
      {...FORM_STYLE}
    />
  );
});

SearchProvider.displayName = 'SearchProvider';

export default SearchProvider;
