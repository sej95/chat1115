import { ChatMessage } from '@/types/message';
import { ChatGroupAgentItem, ChatGroupItem } from '@/database/schemas/chatGroup';

export interface ChatMessageState {
  /**
   * @title 当前活动的会话
   * @description 当前正在编辑或查看的会话
   */
  activeId: string;

  isCreatingMessage: boolean;
  /**
   * is the message is editing
   */
  messageEditingIds: string[];
  /**
   * is the message is creating or updating in the service
   */
  messageLoadingIds: string[];
  /**
   * whether messages have fetched
   */
  messagesInit: boolean;
  messagesMap: Record<string, ChatMessage[]>;

  // ******* Group Chat State ******* //
  /**
   * Currently active group chat ID
   */
  activeGroupId?: string;
  /**
   * Group data maps by group ID
   */
  groupMaps: Record<string, ChatGroupItem>;
  /**
   * Group agents maps by group ID  
   */
  groupAgentMaps: Record<string, ChatGroupAgentItem[]>;
  /**
   * Supervisor decision loading states
   */
  supervisorDecisionLoading: string[];
  /**
   * Agent speaking status per group
   */
  agentSpeakingStatus: Record<string, Record<string, boolean>>;
  /**
   * Groups initialization status
   */
  groupsInit: boolean;
}

export const initialMessageState: ChatMessageState = {
  activeId: 'inbox',
  isCreatingMessage: false,
  messageEditingIds: [],
  messageLoadingIds: [],
  messagesInit: false,
  messagesMap: {},

  // Group Chat Initial State
  activeGroupId: undefined,
  groupMaps: {},
  groupAgentMaps: {},
  supervisorDecisionLoading: [],
  agentSpeakingStatus: {},
  groupsInit: false,
};
