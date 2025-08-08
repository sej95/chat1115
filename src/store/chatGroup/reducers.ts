import { produce } from 'immer';

import { ChatGroupItem } from '@/database/schemas/chatGroup';

import { ChatGroupState } from './initialState';

export type ChatGroupReducer = (
  state: ChatGroupState,
  payload: any,
) => ChatGroupState;

export const chatGroupReducers = {
  // Add a new group to the list
  addGroup: (state, { payload }: { payload: ChatGroupItem }) =>
    produce(state, (draft) => {
      draft.groups.push(payload);
    }),

  // Delete a group from the list
  deleteGroup: (state, { payload: id }: { payload: string }) =>
    produce(state, (draft) => {
      draft.groups = draft.groups.filter((group) => group.id !== id);
    }),

  // Load groups into the state
  loadGroups: (state, { payload }: { payload: ChatGroupItem[] }) =>
    produce(state, (draft) => {
      draft.groups = payload;
      draft.isGroupsLoading = false;
    }),

  // Set the loading state for groups
  setGroupsLoading: (state, { payload }) => {
    return { ...state, isGroupsLoading: payload };
  },

  // Update a group in the list
  updateGroup: (
    state,
    { payload }: { payload: { id: string; value: Partial<ChatGroupItem> } },
  ) =>
    produce(state, (draft) => {
      const group = draft.groups.find((g) => g.id === payload.id);
      if (group) {
        Object.assign(group, payload.value);
      }
    }),
};

export type ChatGroupDispatchPayloads = {
  addGroup: ChatGroupItem;
  deleteGroup: string;
  loadGroups: ChatGroupItem[];
  setGroupsLoading: boolean;
  updateGroup: { id: string; value: Partial<ChatGroupItem> };
}; 
