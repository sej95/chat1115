import { ChatGroupItem } from '@/database/schemas/chatGroup';

export interface ChatGroupState {
  // loading status
  isGroupsLoading: boolean;

  // groups list
  groups: ChatGroupItem[];
  // current group
  currentGroupId?: string;
}

export const initialChatGroupState: ChatGroupState = {
  groups: [],
  isGroupsLoading: true,
}; 
