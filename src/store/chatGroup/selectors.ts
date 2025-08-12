import { ChatStoreState } from '@/store/chat/initialState';
import { ChatGroupItem } from '@/database/schemas/chatGroup';
import { useSessionStore } from '@/store/session';
import { sessionSelectors } from '@/store/session/selectors';
import { ChatGroupState } from './initialState';
import { ChatGroupStore } from './store';
import { DEFAULT_CHAT_GROUP_CHAT_CONFIG } from '@/const/settings';

const getGroupById = (id: string) => (s: ChatGroupState): ChatGroupItem | undefined =>
  s.groupMap[id];

const getAllGroups = (s: ChatGroupState): ChatGroupItem[] => Object.values(s.groupMap);

const isGroupsLoading = (s: ChatGroupState): boolean => s.isGroupsLoading;

const isGroupsInitialized = (s: ChatGroupState): boolean => s.groupsInit;

const getCurrentSessionInfo = () => {
  const sessionStore = useSessionStore.getState();
  const session = sessionSelectors.currentSession(sessionStore);
  return {
    isGroupSession: session?.type === 'group',
    sessionId: sessionStore.activeId,
    sessionType: session?.type as 'agent' | 'group' | undefined,
  };
};

const activeGroupId = (): string | undefined => {
  const { sessionId, sessionType } = getCurrentSessionInfo();
  return sessionType === 'group' ? sessionId : undefined;
};

const currentGroup = (s: ChatGroupStore): ChatGroupItem | undefined => {
  const groupId = activeGroupId();
  return groupId && s.groupMap ? s.groupMap[groupId] : undefined;
};

const getGroupByIdFromChatStore = (groupId: string) => (s: ChatStoreState): ChatGroupItem | undefined =>
  s.groupMaps?.[groupId];

const allGroups = (s: ChatStoreState): ChatGroupItem[] =>
  s.groupMaps ? Object.values(s.groupMaps) : [];

const groupsInitialized = (s: ChatStoreState): boolean => s.groupsInit;

const getGroupConfig = (groupId: string) => (s: ChatGroupStore) =>
  s.groupMap?.[groupId]?.config || DEFAULT_CHAT_GROUP_CHAT_CONFIG;

const currentGroupConfig = (s: ChatGroupStore) => {
  const groupId = activeGroupId();
  return groupId ? getGroupConfig(groupId)(s) : DEFAULT_CHAT_GROUP_CHAT_CONFIG;
};

export const chatGroupSelectors = {
  activeGroupId,
  allGroups,
  currentGroup,
  currentGroupConfig,
  getAllGroups,
  getGroupById,
  getGroupByIdFromChatStore,
  groupsInitialized,
  isGroupsInitialized,
  isGroupsLoading,
};
