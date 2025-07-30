import { ChatGroupStore } from '@/store/chatGroup/store';

const getGroupById = (id: string) => (state: ChatGroupStore) => {
  return state.groups.find((g) => g.id === id);
};

const getGroupAgents = (id: string) => (state: ChatGroupStore) => {
  const group = getGroupById(id)(state);
  return group?.members || [];
};

export const chatGroupSelectors = {
  getGroupAgents,
  getGroupById,
}; 
