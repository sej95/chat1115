import { produce } from 'immer';
import { StateCreator } from 'zustand/vanilla';

import { ChatGroupItem, NewChatGroup } from '@/database/schemas/chatGroup';
import { chatGroupService } from '@/services/chatGroup';
import { getSessionStoreState } from '@/store/session';

import { ChatGroupState, initialChatGroupState } from './initialState';
import { ChatGroupReducer, chatGroupReducers } from './reducers';

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
  removeAgentFromGroup: (groupId: string, agentId: string) => Promise<void>;
  toggleGroupSetting: (open: boolean) => void;
  updateGroup: (id: string, value: Partial<ChatGroupItem>) => Promise<void>;
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

    createGroup: async (newGroup, agentIds) => {
      const group = await chatGroupService.createGroup(newGroup);

      if (agentIds) {
        await chatGroupService.addAgentsToGroup(group.id, agentIds);
      }

      dispatch({ payload: group, type: 'addGroup' });

      await get().loadGroups();
      await getSessionStoreState().refreshSessions();

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
      await get().loadGroups();
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

    removeAgentFromGroup: async (groupId, agentId) => {
      await chatGroupService.removeAgentsFromGroup(groupId, [agentId]);
      await get().internal_refreshGroups();
    },

    toggleGroupSetting: (open) => {
      set({ showGroupSetting: open }, false, 'toggleGroupSetting');
    },

    updateGroup: async (id, value) => {
      await chatGroupService.updateGroup(id, value);
      dispatch({ payload: { id, value }, type: 'updateGroup' });
      await get().internal_refreshGroups();
    },
  };
};
