'use client';

import { ModelProvider } from '@lobechat/model-runtime';
import { AutoComplete, Markdown } from '@lobehub/ui';
import { createStyles } from 'antd-style';
import { useTranslation } from 'react-i18next';

import { FormInput, FormPassword } from '@/components/FormInput';
import { AzureProviderCard } from '@/config/modelProviders';
import { aiModelSelectors, aiProviderSelectors, useAiInfraStore } from '@/store/aiInfra';

import { KeyVaultsConfigKey, LLMProviderApiTokenKey, LLMProviderBaseUrlKey } from '../../const';
import { SkeletonInput } from '../../features/ProviderConfig';
import { ProviderItem } from '../../type';
import ProviderDetail from '../[id]';

const useStyles = createStyles(({ css, token }) => ({
  markdown: css`
    p {
      color: ${token.colorTextDescription} !important;
    }
  `,
  tip: css`
    font-size: 12px;
    color: ${token.colorTextDescription};
  `,
}));

const providerKey = ModelProvider.Azure;

const useProviderCard = (): ProviderItem => {
  const { t } = useTranslation('modelProvider');
  const { styles } = useStyles();

  // Get the first model card's deployment name as the check model
  const checkModel = useAiInfraStore((s) => {
    const chatModelCards = aiModelSelectors.enabledAiProviderModelList(s);

    if (chatModelCards.length > 0 && chatModelCards[0].config?.deploymentName)
      return chatModelCards[0].config?.deploymentName;

    return 'gpt-4.1-mini';
  });

  const isLoading = useAiInfraStore(aiProviderSelectors.isAiProviderConfigLoading(providerKey));

  return {
    ...AzureProviderCard,
    apiKeyItems: [
      {
        children: isLoading ? (
          <SkeletonInput />
        ) : (
          <FormPassword autoComplete={'new-password'} placeholder={t('azure.token.placeholder')} />
        ),
        desc: t('azure.token.desc'),
        label: t('azure.token.title'),
        name: [KeyVaultsConfigKey, LLMProviderApiTokenKey],
      },
      {
        children: isLoading ? (
          <SkeletonInput />
        ) : (
          <FormInput allowClear placeholder={t('azure.endpoint.placeholder')} />
        ),
        desc: t('azure.endpoint.desc'),
        label: t('azure.endpoint.title'),
        name: [KeyVaultsConfigKey, LLMProviderBaseUrlKey],
      },
      {
        children: isLoading ? (
          <SkeletonInput />
        ) : (
          <AutoComplete
            options={[
              '2024-10-21',
              '2024-06-01',
              '2025-01-01-preview',
              '2024-09-01-preview',
              '2024-10-01-preview',
            ].map((i) => ({ label: i, value: i }))}
            placeholder={'20XX-XX-XX'}
          />
        ),
        desc: (
          <Markdown className={styles.markdown} fontSize={12} variant={'chat'}>
            {t('azure.azureApiVersion.desc')}
          </Markdown>
        ),
        label: t('azure.azureApiVersion.title'),
        name: [KeyVaultsConfigKey, 'apiVersion'],
      },
    ],
    checkModel,
    modelList: {
      azureDeployName: true,
      notFoundContent: t('azure.empty'),
      placeholder: t('azure.modelListPlaceholder'),
    },
  };
};

const Page = () => {
  const card = useProviderCard();

  return <ProviderDetail {...card} />;
};

export default Page;
