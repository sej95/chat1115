'use client';

import { Drawer } from '@lobehub/ui';
import isEqual from 'fast-deep-equal';
import { memo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Flexbox } from 'react-layout-kit';

import BrandWatermark from '@/components/BrandWatermark';
import PanelTitle from '@/components/PanelTitle';
import { isDesktop } from '@/const/version';
import { TITLE_BAR_HEIGHT } from '@/features/ElectronTitlebar';
import { GroupCategory, GroupSettings } from '@/features/GroupChatSettings';
import { useChatGroupStore } from '@/store/chatGroup';
import { chatGroupSelectors } from '@/store/chatGroup/selectors';
import { GroupSettingsTabs } from '@/store/global/initialState';
import { useSessionStore } from '@/store/session';
import { sessionSelectors } from '@/store/session/selectors';
import Footer from '@/features/Setting/Footer';

const GroupChatSettings = memo(() => {
  const { t } = useTranslation('setting');
  const id = useSessionStore((s) => s.activeId);
  const currentSession = useSessionStore(sessionSelectors.currentSession, isEqual);
  const currentGroup = useChatGroupStore((s) => 
    id ? chatGroupSelectors.getGroupById(id)(s) : null, isEqual
  );
  
  const [showGroupSetting] = useChatGroupStore((s) => [s.showGroupSetting]);
  const [updateGroupConfig] = useChatGroupStore((s) => [
    s.updateGroup,
  ]);
  const [updateSessionMeta] = useSessionStore((s) => [
    s.updateSessionMeta,
  ]);
  
  const [tab, setTab] = useState(GroupSettingsTabs.Settings);

  // Prepare props for the provider
  const config = currentGroup?.config;
  const meta = {
    description: currentGroup?.description || '',
    title: currentGroup?.title || '',
    // Add any other meta fields from currentSession if needed
    ...currentSession?.meta,
  };
  const loading = false; // TODO: Add loading state when needed
  
  const handleConfigChange = async (newConfig: any) => {
    if (!id) return;
    await updateGroupConfig(id, { config: newConfig });
  };
  
  const handleMetaChange = async (newMeta: any) => {
    if (!id) return;
    // Update the group directly since title/description are stored in the group
    const updates: { description?: string; title?: string } = {};
    if (newMeta.title !== undefined) updates.title = newMeta.title;
    if (newMeta.description !== undefined) updates.description = newMeta.description;
    
    if (Object.keys(updates).length > 0) {
      await updateGroupConfig(id, updates);
    }
    
    // Also update session meta for other fields if needed
    const sessionMetaUpdates = { ...newMeta };
    delete sessionMetaUpdates.title;
    delete sessionMetaUpdates.description;
    
    if (Object.keys(sessionMetaUpdates).length > 0) {
      await updateSessionMeta(sessionMetaUpdates);
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
          <PanelTitle desc={t('header.groupDesc', 'Manage your group settings')} title={t('header.group', 'Group Settings')} />
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
      <GroupSettings
        config={config}
        id={id}
        loading={loading}
        meta={meta}
        onConfigChange={handleConfigChange}
        onMetaChange={handleMetaChange}
        tab={tab}
      />
      <Footer />
    </Drawer>
  );
});

export default GroupChatSettings;