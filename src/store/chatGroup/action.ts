import { produce } from 'immer';
import { StateCreator } from 'zustand/vanilla';

import { ChatGroupItem, NewChatGroup } from '@/database/schemas/chatGroup';
import { chatGroupService } from '@/services/chatGroup';
import { getSessionStoreState } from '@/store/session';

import { ChatGroupState, initialChatGroupState } from './initialState';
import { ChatGroupReducer, chatGroupReducers } from './reducers';
import isEqual from 'fast-deep-equal';
import { mutate } from 'swr';
import { useClientDataSWR } from '@/libs/swr';
import { setNamespace } from '@/utils/storeDebug';
import { chatGroupSelectors } from './selectors';
import { LobeChatGroupConfig } from '@/types/chatGroup';

const n = setNamespace('chatGroup');

const FETCH_GROUPS_KEY = 'fetchGroups';
const FETCH_GROUP_DETAIL_KEY = 'fetchGroupDetail';

export interface ChatGroupAction {
  addAgentsToGroup: (groupId: string, agentIds: string[]) => Promise<void>;
  createGroup: (group: Omit<NewChatGroup, 'userId'>, agentIds?: string[]) => Promise<string>;
  deleteGroup: (id: string) => Promise<void>;
  internal_dispatchChatGroup: (
    payload:
      | {
        type: keyof typeof chatGroupReducers;
      }
      | {
        payload: any;
        type: keyof typeof chatGroupReducers;
      },
  ) => void;
  internal_refreshGroups: () => Promise<void>;

  loadGroups: () => Promise<void>;
  pinGroup: (id: string, pinned: boolean) => Promise<void>;
  refreshGroupDetail: (groupId: string) => Promise<void>;
  refreshGroups: () => Promise<void>;

  removeAgentFromGroup: (groupId: string, agentId: string) => Promise<void>;
  reorderGroupMembers: (groupId: string, orderedAgentIds: string[]) => Promise<void>;
  toggleGroupSetting: (open: boolean) => void;
  toggleThread: (agentId: string) => void;

  updateGroup: (id: string, value: Partial<ChatGroupItem>) => Promise<void>;
  updateGroupConfig: (config: Partial<LobeChatGroupConfig>) => Promise<void>;
  updateGroupMeta: (meta: Partial<ChatGroupItem>) => Promise<void>;
  useFetchGroupDetail: (enabled: boolean, groupId: string) => any;
  useFetchGroups: (enabled: boolean, isLogin: boolean) => any;
}

// Create combined store type for StateCreator
export type ChatGroupStore = ChatGroupState & ChatGroupAction;

export const chatGroupAction: StateCreator<
  ChatGroupStore,
  [['zustand/devtools', never]],
  [],
  ChatGroupAction
> = (set, get) => {
  const dispatch: ChatGroupAction['internal_dispatchChatGroup'] = (payload) => {
    set(
      produce((draft: ChatGroupState) => {
        const reducer = chatGroupReducers[payload.type] as ChatGroupReducer;
        if (reducer) {
          // Apply the reducer and return the new state
          return reducer(draft, payload);
        }
      }),
      false,
      payload,
    );
  };

  return {
    ...initialChatGroupState,

    addAgentsToGroup: async (groupId, agentIds) => {
      await chatGroupService.addAgentsToGroup(groupId, agentIds);
      await get().internal_refreshGroups();
    },

    /**
     * @param silent - if true, do not switch to the new group session
     */
    createGroup: async (newGroup, agentIds, silent = false) => {
      const { switchSession } = getSessionStoreState();

      const group = await chatGroupService.createGroup(newGroup);

      if (agentIds && agentIds.length > 0) {
        await chatGroupService.addAgentsToGroup(group.id, agentIds);

        // Wait a brief moment to ensure database transactions are committed
        // This prevents race condition where loadGroups() executes before member addition is fully persisted
        await new Promise<void>((resolve) => {
          setTimeout(resolve, 100);
        });
      }

      dispatch({ payload: group, type: 'addGroup' });

      await get().loadGroups();
      await getSessionStoreState().refreshSessions();

      if (!silent) {
        switchSession(group.id);
      }

      return group.id;
    },
    deleteGroup: async (id) => {
      await chatGroupService.deleteGroup(id);
      dispatch({ payload: id, type: 'deleteGroup' });

      await get().loadGroups();
      await getSessionStoreState().refreshSessions();
    },

    internal_dispatchChatGroup: dispatch,

    internal_refreshGroups: async () => {
      // Reload groups list first
      await get().loadGroups();

      // Also rebuild and update groupMap to keep it in sync
      const groups = await chatGroupService.getGroups();
      const nextGroupMap = groups.reduce((map, group) => {
        map[group.id] = group;
        return map;
      }, {} as Record<string, ChatGroupItem>);

      if (!isEqual(get().groupMap, nextGroupMap)) {
        set(
          {
            groupMap: nextGroupMap,
            groupsInit: true,
            isGroupsLoading: false,
          },
          false,
          n('internal_refreshGroups/updateGroupMap'),
        );
      }

      // Refresh sessions so session-related group info stays up to date
      await getSessionStoreState().refreshSessions();
    },

    loadGroups: async () => {
      dispatch({ payload: true, type: 'setGroupsLoading' });
      const groups = await chatGroupService.getGroups();
      dispatch({ payload: groups, type: 'loadGroups' });
    },

    pinGroup: async (id, pinned) => {
      await chatGroupService.updateGroup(id, { pinned });
      dispatch({ payload: { id, pinned }, type: 'updateGroup' });
      await get().internal_refreshGroups();
    },

    refreshGroupDetail: async (groupId: string) => {
      await mutate([FETCH_GROUP_DETAIL_KEY, groupId]);
    },

    refreshGroups: async () => {
      await mutate([FETCH_GROUPS_KEY, true]);
    },

    removeAgentFromGroup: async (groupId, agentId) => {
      await chatGroupService.removeAgentsFromGroup(groupId, [agentId]);
      await get().internal_refreshGroups();
    },

    reorderGroupMembers: async (groupId, orderedAgentIds) => {
      console.log("REORDER GROUP MEMBERS", groupId, orderedAgentIds);

      await Promise.all(
        orderedAgentIds.map((agentId, index) =>
          chatGroupService.updateAgentInGroup(groupId, agentId, { order: index.toString() }),
        ),
      );

      await get().internal_refreshGroups();
    },

    toggleGroupSetting: (open) => {
      set({ showGroupSetting: open }, false, 'toggleGroupSetting');
    },

    toggleThread: (agentId) => {
      set({ activeThreadAgentId: agentId }, false, 'toggleThread');
    },

    updateGroup: async (id, value) => {
      await chatGroupService.updateGroup(id, value);
      dispatch({ payload: { id, value }, type: 'updateGroup' });
      await get().internal_refreshGroups();
    },

    updateGroupConfig: async (config) => {
      const group = chatGroupSelectors.currentGroup(get());
      if (!group) return;

      await chatGroupService.updateGroup(group.id, { config });
      dispatch({ payload: { config, id: group.id }, type: 'updateGroup' });
      await get().internal_refreshGroups();
    },

    updateGroupMeta: async (meta) => {
      const group = chatGroupSelectors.currentGroup(get());
      if (!group) return;

      const id = group.id;

      await chatGroupService.updateGroup(id, meta);
      dispatch({ payload: { id, meta }, type: 'updateGroup' });
      await get().internal_refreshGroups();
    },

    useFetchGroupDetail: (enabled, groupId) =>
      useClientDataSWR<ChatGroupItem>(
        enabled && groupId ? [FETCH_GROUP_DETAIL_KEY, groupId] : null,
        async ([, id]) => {
          const group = await chatGroupService.getGroup(id as string);
          if (!group) throw new Error(`Group ${id} not found`);
          return group;
        },
        {
          onSuccess: (group) => {
            // Update groupMap with detailed group info
            const currentGroup = get().groupMap[group.id];
            if (isEqual(currentGroup, group)) return;

            set({
              groupMap: {
                ...get().groupMap,
                [group.id]: group,
              },
            }, false, n('useFetchGroupDetail/onSuccess', { groupId: group.id }));
          },
        },
      ),

    // SWR Hooks for data fetching
    // This is not used for now, as we are combining group in the session lambda's response
    useFetchGroups: (enabled, isLogin) =>
      useClientDataSWR<ChatGroupItem[]>(
        enabled ? [FETCH_GROUPS_KEY, isLogin] : null,
        async () => chatGroupService.getGroups(),
        {
          fallbackData: [],
          onSuccess: (groups) => {
            // Update both groups list and groupMap
            const groupMap = groups.reduce((map, group) => {
              map[group.id] = group;
              return map;
            }, {} as Record<string, ChatGroupItem>);

            if (get().groupsInit && isEqual(get().groupMap, { ...get().groupMap, ...groupMap })) {
              return;
            }

            set({
              groupMap: { ...get().groupMap, ...groupMap },
              groupsInit: true,
              isGroupsLoading: false,
            }, false, n('useFetchGroups/onSuccess'));
          },
          suspense: true,
        },
      ),
  };
};
