import { ChatGroupState } from './initialState';

const getGroupById = (id: string) => (state: ChatGroupState) => {
  const group = state.groups.find((group) => group.id === id);
  if (!group) return;
  return group;
};

export const chatGroupSelectors = {
  getGroupById,
}; 
