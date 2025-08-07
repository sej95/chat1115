import { memo } from 'react';

import { GroupSettingsTabs } from '@/store/global/initialState';

import GroupChatSettings from './GroupChatSettings';
import GroupMembers from './GroupMembers';
import GroupSettingsForm from './GroupSettingsForm';

export interface GroupSettingsContentProps {
  tab: GroupSettingsTabs;
}

const GroupSettingsContent = memo<GroupSettingsContentProps>(({ tab }) => {
  return (
    <>
      {tab === GroupSettingsTabs.Settings && <GroupSettingsForm />}
      {tab === GroupSettingsTabs.Members && <GroupMembers />}
      {tab === GroupSettingsTabs.Chat && <GroupChatSettings />}
    </>
  );
});

export default GroupSettingsContent; 
