import { produce } from 'immer';
import { StateCreator } from 'zustand/vanilla';

import { DEFAULT_GROUP_LOBE_SESSION } from '@/const/session';
import { ChatGroupItem, NewChatGroup } from '@/database/schemas/chatGroup';
import { chatGroupService } from '@/services/chatGroup';
import { sessionService } from '@/services/session';
import { getSessionStoreState } from '@/store/session';
import { LobeSessionType } from '@/types/session';

import { ChatGroupState, initialChatGroupState } from './initialState';
import { ChatGroupReducer, chatGroupReducers } from './reducers';

export interface ChatGroupAction {
  addAgentsToGroup: (groupId: string, agentIds: string[]) => Promise<void>;
  createGroup: (group: Omit<NewChatGroup, 'userId'>) => Promise<string>;
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

  loadGroups: () => Promise<void>;
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
      await get().loadGroups();
    },

    createGroup: async (newGroup) => {
      const group = await chatGroupService.createGroup(newGroup);

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

    loadGroups: async () => {
      dispatch({ payload: true, type: 'setGroupsLoading' });
      const groups = await chatGroupService.getGroups();
      dispatch({ payload: groups, type: 'loadGroups' });
    },

    updateGroup: async (id, value) => {
      await chatGroupService.updateGroup(id, value);
      dispatch({ payload: { id, value }, type: 'updateGroup' });
    },
  };
};
