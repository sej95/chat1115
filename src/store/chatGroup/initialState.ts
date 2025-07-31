import { ChatGroupItem } from '@/types/chatGroup';

export interface ChatGroupState {
  groups: ChatGroupItem[];
  isGroupsLoading: boolean;
  showGroupSetting: boolean;
}

export const initialChatGroupState: ChatGroupState = {
  groups: [],
  isGroupsLoading: true,
  showGroupSetting: false,
}; 
