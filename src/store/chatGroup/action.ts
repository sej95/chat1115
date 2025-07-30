import { produce } from 'immer';
import { StateCreator } from 'zustand/vanilla';

import { ChatGroupItem, NewChatGroup } from '@/database/schemas/chatGroup';
import { chatGroupService } from '@/services/chatGroup';

import { ChatGroupState, initialChatGroupState } from './initialState';
import { ChatGroupReducer, chatGroupReducers } from './reducers';

export interface ChatGroupAction {
  // create
  createGroup: (group: Omit<NewChatGroup, 'userId'>) => Promise<string>;
  // delete
  deleteGroup: (id: string) => Promise<void>;
  // update
  updateGroup: (id: string, value: Partial<ChatGroupItem>) => Promise<void>;
  // query
  loadGroups: () => Promise<void>;
  addAgentsToGroup: (groupId: string, agentIds: string[]) => Promise<void>;

  // internal dispatch
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
}

export const chatGroupAction: StateCreator<
  ChatGroupState,
  [['zustand/devtools', never]],
  [],
  ChatGroupAction
> = (set, get) => {
  const dispatch: ChatGroupAction['internal_dispatchChatGroup'] = (payload) => {
    set(
      produce((draft: ChatGroupState) => {
        const reducer = chatGroupReducers[payload.type] as ChatGroupReducer;
        if (reducer) {
          // @ts-ignore
          draft = reducer(draft, payload);
        }
      }),
      false,
      payload,
    );
  };

  return {
    ...initialChatGroupState,

    createGroup: async (newGroup) => {
      const group = await chatGroupService.createGroup(newGroup);
      dispatch({ payload: group, type: 'addGroup' });
      return group.id;
    },

    deleteGroup: async (id) => {
      await chatGroupService.deleteGroup(id);
      dispatch({ payload: id, type: 'deleteGroup' });
    },

    updateGroup: async (id, value) => {
      await chatGroupService.updateGroup(id, value);
      dispatch({ payload: { id, value }, type: 'updateGroup' });
    },

    addAgentsToGroup: async (groupId, agentIds) => {
      await chatGroupService.addAgentsToGroup(groupId, agentIds);
      // after adding, we should reload the groups to get updated member list.
      await get().loadGroups();
    },

    loadGroups: async () => {
      dispatch({ payload: true, type: 'setGroupsLoading' });
      const groups = await chatGroupService.getGroups();
      dispatch({ payload: groups, type: 'loadGroups' });
    },

    internal_dispatchChatGroup: dispatch,
  };
};
