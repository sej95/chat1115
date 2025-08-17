import { ChatGroupItem } from "@/database/schemas";

export interface ChatGroupState {
  groups: ChatGroupItem[];
  groupMap: Record<string, ChatGroupItem>;
  groupsInit: boolean;
  isGroupsLoading: boolean;
  showGroupSetting: boolean;
}

export const initialChatGroupState: ChatGroupState = {
  groups: [],
  groupMap: {},
  groupsInit: false,
  isGroupsLoading: true,
  showGroupSetting: false,
}; 
