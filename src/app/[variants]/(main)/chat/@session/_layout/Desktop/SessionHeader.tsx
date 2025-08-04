'use client';

import { ActionIcon, Dropdown } from '@lobehub/ui';
import { createStyles } from 'antd-style';
import { MessageSquarePlus } from 'lucide-react';
import { memo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Flexbox } from 'react-layout-kit';

import { ProductLogo } from '@/components/Branding';
import { MemberSelectionModal } from '@/components/MemberSelectionModal';
import { DESKTOP_HEADER_ICON_SIZE } from '@/const/layoutTokens';
import SyncStatusTag from '@/features/SyncStatusInspector';
import { useActionSWR } from '@/libs/swr';
import { useChatGroupStore } from '@/store/chatGroup';
import { featureFlagsSelectors, useServerConfigStore } from '@/store/serverConfig';
import { useSessionStore } from '@/store/session';

import TogglePanelButton from '../../../features/TogglePanelButton';
import SessionSearchBar from '../../features/SessionSearchBar';

export const useStyles = createStyles(({ css, token }) => ({
  logo: css`
    color: ${token.colorText};
    fill: ${token.colorText};
  `,
  top: css`
    position: sticky;
    inset-block-start: 0;
    padding-block-start: 10px;
  `,
}));

const Header = memo(() => {
  const { styles } = useStyles();
  const { t } = useTranslation('chat');
  const [createSession] = useSessionStore((s) => [s.createSession]);
  const createGroup = useChatGroupStore((s) => s.createGroup);
  const { enableWebrtc, showCreateSession } = useServerConfigStore(featureFlagsSelectors);
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);

  const { mutate: mutateAgent, isValidating: isValidatingAgent } = useActionSWR(
    'session.createSession',
    () => createSession(),
  );

  const { mutate: mutateGroup, isValidating: isValidatingGroup } = useActionSWR(
    'chatGroup.createGroup',
    () => createGroup({
      title: 'New Group Chat'
    }),
  );

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleCreateGroupWithMembers = async (_selectedAgents: string[]) => {
    setIsGroupModalOpen(false);
    mutateGroup();
  };

  const handleGroupModalCancel = () => {
    setIsGroupModalOpen(false);
  };

  return (
    <Flexbox className={styles.top} gap={16} paddingInline={8}>
      <Flexbox align={'flex-start'} horizontal justify={'space-between'}>
        <Flexbox
          align={'center'}
          gap={4}
          horizontal
          style={{
            paddingInlineStart: 4,
            paddingTop: 2,
          }}
        >
          <ProductLogo className={styles.logo} size={36} type={'text'} />
          {enableWebrtc && <SyncStatusTag />}
        </Flexbox>
        <Flexbox align={'center'} gap={4} horizontal>
          <TogglePanelButton />
          {showCreateSession && (
            <Dropdown
              menu={{
                items: [
                  {
                    key: 'newAgent',
                    label: t('newAgent'),
                    onClick: () => {
                      mutateAgent();
                    },
                  },
                  {
                    key: 'newGroup',
                    label: 'Create Group Chat',
                    onClick: () => {
                      setIsGroupModalOpen(true);
                    },
                  },
                ],
              }}
              trigger={['click']}
            >
              <ActionIcon
                icon={MessageSquarePlus}
                loading={isValidatingAgent || isValidatingGroup}
                size={DESKTOP_HEADER_ICON_SIZE}
                style={{ flex: 'none' }}
              />
            </Dropdown>
          )}
        </Flexbox>
      </Flexbox>
      <SessionSearchBar />

      <MemberSelectionModal
        mode="create"
        onCancel={handleGroupModalCancel}
        onConfirm={handleCreateGroupWithMembers}
        open={isGroupModalOpen}
      />
    </Flexbox>
  );
});

export default Header;
