import { memo, ReactNode } from 'react';

import { GroupSettingsTabs } from '@/store/global/initialState';

import GroupChatSettings from './GroupChatSettings';
import GroupMembers from './GroupMembers';
import GroupMeta from './GroupMeta';

export interface GroupSettingsContentProps {
  loadingSkeleton?: ReactNode;
  tab: GroupSettingsTabs;
}

const GroupSettingsContent = memo<GroupSettingsContentProps>(({ tab }) => {
  return (
    <>
      {tab === GroupSettingsTabs.Settings && <GroupMeta />}
      {tab === GroupSettingsTabs.Members && <GroupMembers />}
      {tab === GroupSettingsTabs.Chat && <GroupChatSettings />}
    </>
  );
});

export default GroupSettingsContent; 
