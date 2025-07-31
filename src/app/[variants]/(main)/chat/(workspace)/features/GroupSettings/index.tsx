'use client';

import { Drawer } from '@lobehub/ui';
import isEqual from 'fast-deep-equal';
import { memo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Flexbox } from 'react-layout-kit';

import HeaderContent from '@/app/[variants]/(main)/chat/settings/features/HeaderContent';
import BrandWatermark from '@/components/BrandWatermark';
import PanelTitle from '@/components/PanelTitle';
import { isDesktop } from '@/const/version';
import { AgentCategory, AgentSettings as Settings } from '@/features/AgentSetting';
import { AgentSettingsProvider } from '@/features/AgentSetting/AgentSettingsProvider';
import { TITLE_BAR_HEIGHT } from '@/features/ElectronTitlebar';
import Footer from '@/features/Setting/Footer';
import { useInitAgentConfig } from '@/hooks/useInitAgentConfig';
import { useAgentStore } from '@/store/agent';
import { agentSelectors } from '@/store/agent/slices/chat';
import { useChatGroupStore } from '@/store/chatGroup';
import { ChatSettingsTabs } from '@/store/global/initialState';
import { useSessionStore } from '@/store/session';
import { sessionMetaSelectors } from '@/store/session/selectors';

const GroupSettings = memo(() => {
  const { t } = useTranslation('setting');

  const [showGroupSetting] = useChatGroupStore((s) => [s.showGroupSetting]);

  return (
    <Drawer
      containerMaxWidth={1280}
      height={isDesktop ? `calc(100vh - ${TITLE_BAR_HEIGHT}px)` : '100vh'}
      noHeader
      onClose={() => useChatGroupStore.setState({ showGroupSetting: false })}
      open={showGroupSetting}
      placement={'bottom'}
      sidebar={
        <Flexbox
          gap={20}
          style={{
            minHeight: '100%',
          }}
        >
          <PanelTitle desc={t('header.sessionDesc')} title={t('header.session')} />
          <Flexbox align={'center'} gap={8} paddingInline={8} width={'100%'}>
            <HeaderContent modal />
          </Flexbox>
          <BrandWatermark paddingInline={12} />
        </Flexbox>
      }
      sidebarWidth={280}
      styles={{
        sidebarContent: {
          gap: 48,
          justifyContent: 'space-between',
          minHeight: isDesktop ? `calc(100% - ${TITLE_BAR_HEIGHT}px)` : '100%',
          paddingBlock: 24,
          paddingInline: 48,
        },
      }}
    >
      TODO
    </Drawer>
  );
});

export default GroupSettings;
