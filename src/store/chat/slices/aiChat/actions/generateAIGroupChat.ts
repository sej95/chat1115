/* eslint-disable sort-keys-fix/sort-keys-fix, typescript-sort-keys/interface */
// Disable the auto sort key eslint rule to make the code more logic and readable
import { produce } from 'immer';
import { StateCreator } from 'zustand/vanilla';

import { LOADING_FLAT } from '@/const/message';
import { ChatErrorType } from '@/types/fetch';
import { agentSelectors } from '@/store/agent/selectors';
import { getAgentStoreState } from '@/store/agent/store';
import { ChatStore } from '@/store/chat/store';
import { messageMapKey } from '@/store/chat/utils/messageMapKey';
import { useSessionStore } from '@/store/session';
import { sessionSelectors } from '@/store/session/selectors';
import { ChatMessage, CreateMessageParams, SendGroupMessageParams } from '@/types/message';
import { setNamespace } from '@/utils/storeDebug';
import { chatGroupSelectors } from '@/store/chatGroup/selectors';

import { GroupChatSupervisor, SupervisorContext, SupervisorDecision } from '../../message/supervisor';
import { buildGroupChatSystemPrompt, GroupMemberInfo } from '@/prompts/groupChat';

import { toggleBooleanList } from '../../../utils';
import type { ChatStoreState } from '../../../initialState';
import { useChatGroupStore } from '@/store/chatGroup/store';

const n = setNamespace('aiGroupChat');

const supervisor = new GroupChatSupervisor();

const getDebounceThreshold = (responseSpeed?: 'slow' | 'medium' | 'fast'): number => {
  switch (responseSpeed) {
    case 'fast': {
      return 1000;
    }
    case 'medium': {
      return 2000;
    }
    case 'slow': {
      return 5000;
    }
    default: {
      return 3000;
    }
  }
};

export interface AIGroupChatAction {
  /**
   * Sends a new message to a group chat and triggers agent responses
   */
  sendGroupMessage: (params: SendGroupMessageParams) => Promise<void>;

  // =========  ↓ Internal Group Chat Methods ↓  ========== //

  /**
   * Triggers supervisor decision for group chat
   */
  internal_triggerSupervisorDecision: (groupId: string) => Promise<void>;

  /**
   * Triggers supervisor decision with debounce logic (dynamic threshold based on group responseSpeed setting)
   * Fast: 1s, Medium: 2s, Slow: 5s, Default: 3s
   * Cancels previous pending decisions and schedules a new one
   */
  internal_triggerSupervisorDecisionDebounced: (groupId: string) => void;

  /**
   * Cancels pending supervisor decision for a group
   */
  internal_cancelSupervisorDecision: (groupId: string) => void;

  /**
   * Cancels all pending supervisor decisions (cleanup method)
   */
  internal_cancelAllSupervisorDecisions: () => void;

  /**
   * Executes agent responses for group chat
   */
  internal_executeAgentResponses: (groupId: string, agentIds: string[]) => Promise<void>;

  /**
   * Processes a single agent message in group chat
   */
  internal_processAgentMessage: (groupId: string, agentId: string) => Promise<void>;

  /**
   * Updates agent speaking status in group chat
   */
  internal_updateAgentSpeakingStatus: (groupId: string, agentId: string, speaking: boolean) => void;

  /**
   * Sets the active group
   */
  internal_setActiveGroup: (groupId: string) => void;

  /**
   * Toggles supervisor loading state for group chat
   */
  internal_toggleSupervisorLoading: (loading: boolean, groupId?: string) => void;
}

export const generateAIGroupChat: StateCreator<
  ChatStore,
  [['zustand/devtools', never]],
  [],
  AIGroupChatAction
> = (set, get) => ({
  sendGroupMessage: async ({ groupId, message, files, onlyAddUserMessage }) => {
    const { internal_createMessage, internal_triggerSupervisorDecisionDebounced, internal_setActiveGroup } = get();

    if (!message.trim() && (!files || files.length === 0)) return;

    console.log("generateAIGroupChat: Start send group message", groupId, message, files, onlyAddUserMessage);

    internal_setActiveGroup(groupId);

    set({ isCreatingMessage: true }, false, n('creatingGroupMessage/start'));

    try {
      const userMessage: CreateMessageParams = {
        content: message,
        files: files?.map((f) => f.id),
        role: 'user',
        groupId,
      };

      const messageId = await internal_createMessage(userMessage);

      // if only add user message, then stop
      if (onlyAddUserMessage) {
        set({ isCreatingMessage: false }, false, n('creatingGroupMessage/onlyUser'));
        return;
      }

      if (messageId) {
        internal_triggerSupervisorDecisionDebounced(groupId);
      }
    } catch (error) {
      console.error('Failed to send group message:', error);
    } finally {
      set({ isCreatingMessage: false }, false, n('creatingGroupMessage/end'));
    }
  },

  // ========= ↓ Group Chat Internal Methods ↓ ========== //

  internal_triggerSupervisorDecision: async (groupId: string) => {
    const {
      messagesMap,
      internal_toggleSupervisorLoading,
      internal_executeAgentResponses,
    } = get();

    const messages = messagesMap[messageMapKey(groupId, null)] || [];
    const agents = sessionSelectors.currentGroupAgents(useSessionStore.getState());

    if (messages.length === 0) return;

    internal_toggleSupervisorLoading(true, groupId);

    const groupConfig = chatGroupSelectors.currentGroupConfig(useChatGroupStore.getState());

    try {
      const context: SupervisorContext = {
        availableAgents: agents!,
        groupId,
        messages,
        model: groupConfig.orchestratorModel || 'gemini-2.5-flash',
        provider: groupConfig.orchestratorProvider || 'google',
      };

      const decision: SupervisorDecision = await supervisor.makeDecision(context);

      console.log('Supervisor decision:', decision);

      if (decision.nextSpeakers.length > 0) {
        await internal_executeAgentResponses(groupId, decision.nextSpeakers);
      }
    } catch (error) {
      console.error('Supervisor decision failed:', error);
    } finally {
      internal_toggleSupervisorLoading(false, groupId);
    }
  },

  internal_executeAgentResponses: async (groupId: string, agentIds: string[]) => {
    const { internal_processAgentMessage } = get();

    const responsePromises = agentIds.map((agentId) =>
      internal_processAgentMessage(groupId, agentId),
    );

    try {
      await Promise.all(responsePromises);
    } catch (error) {
      console.error('Failed to execute agent responses:', error);
    }
  },

  // For group member responsing
  internal_processAgentMessage: async (groupId: string, agentId: string) => {
    const {
      messagesMap,
      internal_updateAgentSpeakingStatus,
      internal_createMessage,
      internal_fetchAIChatMessage,
      refreshMessages,
      activeTopicId,
      internal_dispatchMessage,
      internal_toggleChatLoading,
    } = get();

    internal_updateAgentSpeakingStatus(groupId, agentId, true);

    try {
      const messages = messagesMap[messageMapKey(groupId, activeTopicId)] || [];
      // if (messages.length === 0) return;

      const agentStoreState = getAgentStoreState();
      const agentConfig = agentSelectors.getAgentConfigById(agentId)(agentStoreState);
      const { provider: providerFromConfig } = agentConfig;

      console.log("AGENT CONFIG", agentConfig);

      if (!providerFromConfig) {
        console.error(`No provider configured for agent ${agentId}`);
        return;
      }

      // TODO: [Group Chat] Replace with real user name
      const agents = sessionSelectors.currentGroupAgents(useSessionStore.getState());
      const agentTitleMap: GroupMemberInfo[] = [
        { id: 'user', title: 'Rene Wang' },
        ...((agents || []).map((agent) => ({ id: agent.id, title: agent.title })))
      ];

      console.log("AGENT TITLE MAP", agentTitleMap);

      const baseSystemRole = agentConfig.systemRole || '';
      const members: GroupMemberInfo[] = agentTitleMap as GroupMemberInfo[];
      const groupChatSystemPrompt = buildGroupChatSystemPrompt({
        agentId,
        baseSystemRole,
        groupMembers: members,
        messages,
      });

      // TODO: [Group Chat] Use real agent config
      const assistantMessage: CreateMessageParams = {
        role: 'assistant',
        content: LOADING_FLAT,
        fromModel: "gemini-2.5-flash",
        fromProvider: "google",
        groupId,
        agentId,
        topicId: activeTopicId,
      };

      const assistantId = await internal_createMessage(assistantMessage);

      const systemMessage: ChatMessage = {
        id: 'group-system',
        role: 'system',
        content: groupChatSystemPrompt,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        meta: {},
      };

      const messagesForAPI = [systemMessage, ...messages];

      if (assistantId) {
        await internal_fetchAIChatMessage({
          messages: messagesForAPI,
          messageId: assistantId,
          model: "gemini-2.5-flash",
          provider: "google",
          params: {
            traceId: `group-${groupId}-agent-${agentId}`,
          },
        });
      }

      await refreshMessages();

      // After successful agent response, trigger debounced supervisor decision
      get().internal_triggerSupervisorDecisionDebounced(groupId);

    } catch (error) {
      console.error(`Failed to process message for agent ${agentId}:`, error);

      // Update error state if we have an assistant message
      const currentMessages = get().messagesMap[groupId] || [];
      const errorMessage = currentMessages.find(m =>
        m.role === 'assistant' &&
        m.groupId === groupId &&
        m.content === LOADING_FLAT
      );

      if (errorMessage) {
        internal_dispatchMessage({
          id: errorMessage.id,
          type: 'updateMessage',
          value: {
            content: `Error: Failed to generate response. ${error instanceof Error ? error.message : 'Unknown error'}`,
            error: {
              type: ChatErrorType.CreateMessageError,
              message: error instanceof Error ? error.message : 'Unknown error'
            }
          },
        });
      }
    } finally {
      internal_toggleChatLoading(false, undefined, n('processAgentMessage(end)'));
      internal_updateAgentSpeakingStatus(groupId, agentId, false);
    }
  },

  internal_updateAgentSpeakingStatus: (groupId: string, agentId: string, speaking: boolean) => {
    set(
      produce((state: ChatStoreState) => {
        if (!state.agentSpeakingStatus[groupId]) {
          state.agentSpeakingStatus[groupId] = {};
        }
        state.agentSpeakingStatus[groupId][agentId] = speaking;
      }),
      false,
      n(`updateAgentSpeakingStatus/${groupId}/${agentId}`),
    );
  },

  internal_setActiveGroup: () => {
    // Update the active session type to 'group' when setting an active group
    get().internal_updateActiveSessionType('group');
  },

  internal_toggleSupervisorLoading: (loading: boolean, groupId?: string) => {
    set(
      {
        supervisorDecisionLoading: groupId
          ? toggleBooleanList(get().supervisorDecisionLoading, groupId, loading)
          : loading
            ? get().supervisorDecisionLoading
            : [],
      },
      false,
      n(`toggleSupervisorLoading/${loading ? 'start' : 'end'}`),
    );
  },

  internal_triggerSupervisorDecisionDebounced: (groupId: string) => {
    const { internal_cancelSupervisorDecision, internal_triggerSupervisorDecision } = get();

    console.log("Supervisor decision debounced triggered for group", groupId);

    internal_cancelSupervisorDecision(groupId);

    const groupConfig = chatGroupSelectors.currentGroupConfig(useChatGroupStore.getState());
    const responseSpeed = groupConfig?.responseSpeed;
    const debounceThreshold = getDebounceThreshold(responseSpeed);

    console.log(`Using debounce threshold: ${debounceThreshold}ms for responseSpeed: ${responseSpeed}`);

    // Set a new timer with dynamic debounce based on group settings
    const timerId = setTimeout(async () => {
      console.log(`Debounced supervisor decision triggered for group ${groupId}`);

      // Clean up the timer from state before executing
      set(
        produce((state: ChatStoreState) => {
          delete state.supervisorDebounceTimers[groupId];
        }),
        false,
        n(`cleanupSupervisorTimer/${groupId}`),
      );

      try {
        await internal_triggerSupervisorDecision(groupId);
      } catch (error) {
        console.error(`Failed to execute supervisor decision for group ${groupId}:`, error);
      }
    }, debounceThreshold);

    // Store the timer in state
    set(
      produce((state: ChatStoreState) => {
        state.supervisorDebounceTimers[groupId] = timerId;
      }),
      false,
      n(`setSupervisorTimer/${groupId}`),
    );
  },

  internal_cancelSupervisorDecision: (groupId: string) => {
    const { supervisorDebounceTimers } = get();
    const existingTimer = supervisorDebounceTimers[groupId];

    if (existingTimer) {
      clearTimeout(existingTimer);
      console.log(`Cancelled pending supervisor decision for group ${groupId}`);

      // Remove timer from state
      set(
        produce((state: ChatStoreState) => {
          delete state.supervisorDebounceTimers[groupId];
        }),
        false,
        n(`cancelSupervisorTimer/${groupId}`),
      );
    }
  },

  internal_cancelAllSupervisorDecisions: () => {
    const { supervisorDebounceTimers } = get();
    const groupIds = Object.keys(supervisorDebounceTimers);

    if (groupIds.length > 0) {
      console.log('Cancelling all pending supervisor decisions for session change/cleanup');

      // Cancel all timers
      groupIds.forEach(groupId => {
        const timer = supervisorDebounceTimers[groupId];
        if (timer) {
          clearTimeout(timer);
        }
      });

      // Clear all timers from state
      set(
        { supervisorDebounceTimers: {} },
        false,
        n('cancelAllSupervisorTimers'),
      );
    }
  },
});
