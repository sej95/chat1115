'use client';

import { ActionIcon, ScrollShadow } from '@lobehub/ui';
import { EditableMessage } from '@lobehub/ui/chat';
import { Skeleton } from 'antd';
import { Edit } from 'lucide-react';
import { MouseEvent, memo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Flexbox } from 'react-layout-kit';
import useMergeState from 'use-merge-value';

import SidebarHeader from '@/components/SidebarHeader';
import { useGlobalStore } from '@/store/global';
import { systemStatusSelectors } from '@/store/global/selectors';
import { useSessionStore } from '@/store/session';

const useStyles = () => ({
  promptBox: {
    cursor: 'pointer',
  },
  animatedContainer: {
    transition: 'all 0.3s ease',
  },
  prompt: {
    fontSize: '14px',
  },
});

const GroupDescriptionContent = memo(() => {
  const [editing, setEditing] = useState(false);
  const styles = useStyles();
  const sessionId = useSessionStore((s) => s.activeId);

  const { t } = useTranslation('common');

  // Placeholder state - replace with actual group description logic later
  const isLoading = false;
  const groupDescription =
    'This is a placeholder group description. Replace with actual group description logic.';

  const handleOpenWithEdit = (e: MouseEvent) => {
    if (isLoading) return;

    e.stopPropagation();
    setEditing(true);
    setOpen(true);
  };

  const handleOpen = () => {
    if (isLoading) return;

    setOpen(true);
  };

  const [expanded, toggleGroupDescriptionExpand] = useGlobalStore((s) => [
    systemStatusSelectors.getAgentSystemRoleExpanded(sessionId)(s), // TODO: Replace with group description expanded selector
    s.toggleAgentSystemRoleExpand, // TODO: Replace with group description toggle action
  ]);

  const [open, setOpen] = useMergeState(false, {
    defaultValue: false,
    onChange: () => {}, // TODO: Implement actual toggle logic
    value: false,
  });

  const toggleExpanded = () => {
    if (sessionId) {
      toggleGroupDescriptionExpand(sessionId); // TODO: Replace with actual group description toggle
    }
  };

  const handleUpdateDescription = (newDescription: string) => {
    // TODO: Implement actual group description update logic
    console.log('Updating group description:', newDescription);
  };

  return (
    <Flexbox height={'fit-content'}>
      <SidebarHeader
        actions={
          <ActionIcon icon={Edit} onClick={handleOpenWithEdit} size={'small'} title={t('edit')} />
        }
        onClick={toggleExpanded}
        style={{ cursor: 'pointer' }}
        title={t('Description')}
      />
      <ScrollShadow
        className={`${styles.promptBox} ${styles.animatedContainer}`}
        height={expanded ? 200 : 0}
        onClick={handleOpen}
        onDoubleClick={(e) => {
          if (e.altKey) handleOpenWithEdit(e);
        }}
        paddingInline={16}
        size={25}
        style={{
          opacity: expanded ? 1 : 0,
          overflow: 'hidden',
          transition: 'height 0.3s ease',
        }}
      >
        {isLoading ? (
          <Skeleton active avatar={false} title={false} />
        ) : (
          <EditableMessage
            classNames={{ markdown: styles.prompt }}
            editing={editing}
            markdownProps={{ enableLatex: false, enableMermaid: false }}
            onChange={handleUpdateDescription}
            onEditingChange={setEditing}
            onOpenChange={setOpen}
            openModal={open}
            placeholder="Enter group description..."
            styles={{
              markdown: { opacity: groupDescription ? undefined : 0.5, overflow: 'visible' },
            }}
            text={{
              cancel: t('cancel'),
              confirm: t('ok'),
              edit: t('edit'),
              title: t('Description'),
            }}
            value={groupDescription}
          />
        )}
      </ScrollShadow>
    </Flexbox>
  );
});

GroupDescriptionContent.displayName = 'GroupDescriptionContent';

export default GroupDescriptionContent;
