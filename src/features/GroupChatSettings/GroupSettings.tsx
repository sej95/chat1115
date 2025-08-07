import { Skeleton } from 'antd';
import { Suspense, memo } from 'react';

import { GroupSettingsTabs } from '@/store/global/initialState';
import { useServerConfigStore } from '@/store/serverConfig';

import GroupSettingsContent from './GroupSettingsContent';

export interface GroupSettingsProps {
  tab: GroupSettingsTabs;
}

const GroupSettings = memo<GroupSettingsProps>(({ tab = GroupSettingsTabs.Settings }) => {
  const isMobile = useServerConfigStore((s) => s.isMobile);
  const loadingSkeleton = (
    <Skeleton active paragraph={{ rows: 6 }} style={{ padding: isMobile ? 16 : 0 }} title={false} />
  );

  return (
    <Suspense fallback={loadingSkeleton}>
      <GroupSettingsContent loadingSkeleton={loadingSkeleton} tab={tab} />
    </Suspense>
  );
});

export default GroupSettings;