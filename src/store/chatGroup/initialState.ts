import { ChatGroupItem } from '@/types/chatGroup';

export interface ChatGroupState {
  groups: ChatGroupItem[];
  isGroupsLoading: boolean;
}

export const initialChatGroupState: ChatGroupState = {
  groups: [],
  isGroupsLoading: true,
}; 
