'use client';

import { Drawer } from '@lobehub/ui';
import { memo, useState } from 'react';
import { Flexbox } from 'react-layout-kit';

import BrandWatermark from '@/components/BrandWatermark';
import PanelTitle from '@/components/PanelTitle';
import { isDesktop } from '@/const/version';
import { TITLE_BAR_HEIGHT } from '@/features/ElectronTitlebar';
import { GroupCategory } from '@/features/GroupSetting';
import { useChatGroupStore } from '@/store/chatGroup';
import { GroupSettingsTabs } from '@/store/global/initialState';

import GroupChatSettings from './GroupChatSettings';
import GroupMembers from './GroupMembers';
import GroupSettingsContent from './GroupSettingsContent';

const GroupSettings = memo(() => {

  const [showGroupSetting] = useChatGroupStore((s) => [s.showGroupSetting]);

  const [tab, setTab] = useState(GroupSettingsTabs.Settings);

  const renderTabContent = () => {
    switch (tab) {
      case GroupSettingsTabs.Settings:
        return <GroupSettingsContent />;
      case GroupSettingsTabs.Members:
        return <GroupMembers />;
      case GroupSettingsTabs.Chat:
        return <GroupChatSettings />;
      default:
        return <GroupSettingsContent />;
    }
  };

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
          <PanelTitle desc="Manage your group settings" title="Group Settings" />
          <GroupCategory setTab={setTab} tab={tab} />
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
      {renderTabContent()}
    </Drawer>
  );
});

export default GroupSettings;
