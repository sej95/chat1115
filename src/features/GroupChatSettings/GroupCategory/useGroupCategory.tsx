import { Icon } from '@lobehub/ui';
import { MenuItemType } from 'antd/es/menu/interface';
import { MessagesSquare, Settings, Users } from 'lucide-react';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import type { MenuProps } from '@/components/Menu';
import { GroupSettingsTabs } from '@/store/global/initialState';

interface UseGroupCategoryOptions {
  mobile?: boolean;
}

export const useGroupCategory = ({ mobile }: UseGroupCategoryOptions = {}) => {
  const { t } = useTranslation('setting');
  const iconSize = mobile ? 20 : undefined;

  const cateItems: MenuProps['items'] = useMemo(
    () =>
      [
        {
          icon: <Icon icon={Settings} size={iconSize} />,
          key: GroupSettingsTabs.Settings,
          label: t('groupTab.settings'),
        },
        {
          icon: <Icon icon={Users} size={iconSize} />,
          key: GroupSettingsTabs.Members,
          label: t('groupTab.members'),
        },
        {
          icon: <Icon icon={MessagesSquare} size={iconSize} />,
          key: GroupSettingsTabs.Chat,
          label: t('groupTab.chat'),
        },
      ].filter(Boolean) as MenuProps['items'],
    [t, iconSize],
  );

  return cateItems;
};