'use client';

import { memo } from 'react';

import Menu from '@/components/Menu';
import { GroupSettingsTabs } from '@/store/global/initialState';

import { useGroupCategory } from './useGroupCategory';

interface GroupCategoryProps {
  setTab: (tab: GroupSettingsTabs) => void;
  tab: string;
}

const GroupCategory = memo<GroupCategoryProps>(({ setTab, tab }) => {
  const cateItems = useGroupCategory();
  return (
    <Menu
      compact
      items={cateItems}
      onClick={({ key }) => {
        setTab(key as GroupSettingsTabs);
      }}
      selectable
      selectedKeys={[tab as any]}
    />
  );
});

export default GroupCategory; 
