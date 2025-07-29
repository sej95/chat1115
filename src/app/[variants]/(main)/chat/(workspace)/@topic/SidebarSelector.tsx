'use client';

import { memo } from 'react';

import { useSessionStore } from '@/store/session';
import { sessionSelectors } from '@/store/session/selectors';

import GroupChat from './features/GroupChat';
import SystemRole from './features/SystemRole';
import TopicListContent from './features/TopicListContent';

const SidebarSelector = memo(() => {
  const isGroupSession = useSessionStore(sessionSelectors.isCurrentSessionGroupSession);

  if (isGroupSession) {
    // Completely different sidebar for group sessions
    return <GroupChat />;
  }

  // Original sidebar for agent sessions (maintains exact original structure)
  return (
    <>
      <SystemRole />
      <TopicListContent />
    </>
  );
});

SidebarSelector.displayName = 'SidebarSelector';

export default SidebarSelector; 
