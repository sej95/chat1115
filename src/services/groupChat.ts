import debug from 'debug';
import { useChatStore } from '@/store/chat';
import { chatSelectors } from '@/store/chat/selectors';

// Create debug logger
const log = debug('lobe-group-chat:service');

export class GroupChatService {
  /**
   * Send a message to a group chat
   */
  public sendMessage = async (groupId: string, message: string, files?: any[]) => {
    log('Sending message to group %s: %s', groupId, message);
    
    const store = useChatStore.getState();
    await store.sendGroupMessage({ groupId, message, files });
  };

  /**
   * Create a new group chat with agents
   */
  public createGroup = async (title: string, agentIds: string[], description?: string) => {
    log('Creating group chat: %s with agents: %O', title, agentIds);
    
    const store = useChatStore.getState();
    return store.createGroupChat({ title, agentIds, description });
  };

  /**
   * Add an agent to an existing group
   */
  public addAgent = async (groupId: string, agentId: string) => {
    log('Adding agent %s to group %s', agentId, groupId);
    
    const store = useChatStore.getState();
    await store.addAgentToGroup(groupId, agentId);
  };

  /**
   * Remove an agent from a group
   */
  public removeAgent = async (groupId: string, agentId: string) => {
    log('Removing agent %s from group %s', agentId, groupId);
    
    const store = useChatStore.getState();
    await store.removeAgentFromGroup(groupId, agentId);
  };

  /**
   * Switch to a specific group
   */
  public switchToGroup = async (groupId: string) => {
    log('Switching to group %s', groupId);
    
    const store = useChatStore.getState();
    await store.switchToGroup(groupId);
  };

  /**
   * Get current group information
   */
  public getCurrentGroup = () => {
    const store = useChatStore.getState();
    return chatSelectors.currentGroup(store);
  };

  /**
   * Get current group agents
   */
  public getCurrentGroupAgents = () => {
    const store = useChatStore.getState();
    return chatSelectors.currentGroupAgents(store);
  };

  /**
   * Get current group messages
   */
  public getCurrentGroupMessages = () => {
    const store = useChatStore.getState();
    return chatSelectors.currentGroupMessages(store);
  };

  /**
   * Check if group is busy (supervisor deciding or agents responding)
   */
  public isGroupBusy = () => {
    const store = useChatStore.getState();
    return chatSelectors.isCurrentGroupBusy(store);
  };

  /**
   * Get group conversation statistics
   */
  public getGroupStats = () => {
    const store = useChatStore.getState();
    return chatSelectors.currentGroupStats(store);
  };
}
