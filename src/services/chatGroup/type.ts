import {
  ChatGroupAgentItem,
  ChatGroupItem,
  NewChatGroup,
} from '@/database/schemas/chatGroup';

export interface IChatGroupService {
  // Group management
  createGroup(params: Omit<NewChatGroup, 'userId'>): Promise<ChatGroupItem>;
  updateGroup(id: string, value: Partial<ChatGroupItem>): Promise<ChatGroupItem>;
  deleteGroup(id: string): Promise<any>;
  deleteAllGroups(): Promise<any>;
  getGroup(id: string): Promise<ChatGroupItem | undefined>;
  getGroups(): Promise<ChatGroupItem[]>;

  // Agent management in a group
  addAgentsToGroup(groupId: string, agentIds: string[]): Promise<ChatGroupAgentItem[]>;
  removeAgentsFromGroup(groupId: string, agentIds: string[]): Promise<any>;
  updateAgentInGroup(
    groupId: string,
    agentId: string,
    updates: Partial<Pick<ChatGroupAgentItem, 'enabled' | 'order' | 'role'>>,
  ): Promise<ChatGroupAgentItem>;
  getGroupAgents(groupId: string): Promise<ChatGroupAgentItem[]>;
} 
