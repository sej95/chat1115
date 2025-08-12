import { ChatGroupItem } from "@/database/schemas";

export interface ChatGroupState {
  groupMap: Record<string, ChatGroupItem>;
  groupsInit: boolean;
  isGroupsLoading: boolean;
  showGroupSetting: boolean;
}

export const initialChatGroupState: ChatGroupState = {
  groupMap: {},
  groupsInit: false,
  isGroupsLoading: true,
  showGroupSetting: false,
}; 
