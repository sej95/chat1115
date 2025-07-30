import { Icon, Tag, Tooltip } from '@lobehub/ui';
import { Users } from 'lucide-react';
import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { Flexbox } from 'react-layout-kit';

import { useSessionStore } from '@/store/session';
import { sessionSelectors } from '@/store/session/selectors';
import { LobeGroupSession } from '@/types/session';

const MemberCountTag = memo(() => {
  const { t } = useTranslation('chat');
  const currentSession = useSessionStore(sessionSelectors.currentSession);

  const memberCount = (currentSession as LobeGroupSession).members?.length || 0;

  if (memberCount === 0) return null;

  return (
    <Tooltip
      title={
        t('groupChat.memberTooltip', { count: memberCount }) ||
        `${memberCount} members in this group chat`
      }
    >
      <Flexbox height={22}>
        <Tag>
          <Icon icon={Users} />
          <span>
            {memberCount + 1} {t('members')}
          </span>
        </Tag>
      </Flexbox>
    </Tooltip>
  );
});

export default MemberCountTag;
