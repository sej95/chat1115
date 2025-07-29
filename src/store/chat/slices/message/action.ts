/* eslint-disable sort-keys-fix/sort-keys-fix, typescript-sort-keys/interface */
// Disable the auto sort key eslint rule to make the code more logic and readable
import { ChatErrorType, TraceEventType } from '@lobechat/types';
import { copyToClipboard } from '@lobehub/ui';
import isEqual from 'fast-deep-equal';
import { SWRResponse, mutate } from 'swr';
import { StateCreator } from 'zustand/vanilla';

import { useClientDataSWR } from '@/libs/swr';
import { messageService } from '@/services/message';
import { topicService } from '@/services/topic';
import { traceService } from '@/services/trace';
import { ChatStore } from '@/store/chat/store';
import { messageMapKey } from '@/store/chat/utils/messageMapKey';
import {
  ChatMessage,
  ChatMessageError,
  ChatMessagePluginError,
  CreateMessageParams,
  MessageMetadata,
  MessageToolCall,
  ModelReasoning,
} from '@/types/message';
import { ChatImageItem } from '@/types/message/image';
import { GroundingSearch } from '@/types/search';
import { TraceEventPayloads } from '@/types/trace';
import { Action, setNamespace } from '@/utils/storeDebug';
import { nanoid } from '@/utils/uuid';

import type { ChatStoreState } from '../../initialState';
import { chatSelectors } from '../../selectors';
import { preventLeavingFn, toggleBooleanList } from '../../utils';
import { MessageDispatch, messagesReducer } from './reducer';
import { GroupChatSupervisor, SupervisorContext, SupervisorDecision } from './supervisor';
import { ChatGroupModel } from '@/database/models/chatGroup';
import { ChatGroupAgentItem, ChatGroupItem } from '@/database/schemas/chatGroup';
import { clientDB } from '@/database/client/db';
import { getUserStoreState } from '@/store/user';
import { produce } from 'immer';

const n = setNamespace('m');

const SWR_USE_FETCH_MESSAGES = 'SWR_USE_FETCH_MESSAGES';

// Helper to get ChatGroupModel instance
const getChatGroupModel = () => {
  const userStore = getUserStoreState();
  const userId = userStore.user?.id || 'DEFAULT_LOBE_CHAT_USER';
  return new ChatGroupModel(clientDB as any, userId);
};

// Group chat supervisor instance
const supervisor = new GroupChatSupervisor();

export interface ChatMessageAction {
  // create
  addAIMessage: () => Promise<void>;
  // delete
  /**
   * clear message on the active session
   */
  clearMessage: () => Promise<void>;
  deleteMessage: (id: string) => Promise<void>;
  deleteToolMessage: (id: string) => Promise<void>;
  clearAllMessages: () => Promise<void>;
  // update
  updateInputMessage: (message: string) => void;
  modifyMessageContent: (id: string, content: string) => Promise<void>;
  toggleMessageEditing: (id: string, editing: boolean) => void;
  // query
  useFetchMessages: (
    enable: boolean,
    sessionId: string,
    topicId?: string,
  ) => SWRResponse<ChatMessage[]>;
  copyMessage: (id: string, content: string) => Promise<void>;
  refreshMessages: () => Promise<void>;

  // ******* Group Chat Actions ******* //
  /**
   * Send a message to group chat and trigger supervisor decision
   */
  sendGroupMessage: (params: {
    groupId: string;
    message: string;
    files?: any[];
  }) => Promise<void>;
  /**
   * Create a new group chat with agents
   */
  createGroupChat: (params: {
    title: string;
    agentIds: string[];
    description?: string;
  }) => Promise<string>;
  /**
   * Switch to a specific group
   */
  switchToGroup: (groupId: string) => Promise<void>;
  /**
   * Add an agent to existing group
   */
  addAgentToGroup: (groupId: string, agentId: string) => Promise<void>;
  /**
   * Remove an agent from group
   */
  removeAgentFromGroup: (groupId: string, agentId: string) => Promise<void>;
  /**
   * Refresh groups data
   */
  refreshGroups: () => Promise<void>;

  // =========  ↓ Internal Method ↓  ========== //
  // ========================================== //
  // ========================================== //

  /**
   * update message at the frontend
   * this method will not update messages to database
   */
  internal_dispatchMessage: (payload: MessageDispatch) => void;

  /**
   * update the message content with optimistic update
   * a method used by other action
   */
  internal_updateMessageContent: (
    id: string,
    content: string,
    extra?: {
      toolCalls?: MessageToolCall[];
      reasoning?: ModelReasoning;
      search?: GroundingSearch;
      metadata?: MessageMetadata;
      imageList?: ChatImageItem[];
      model?: string;
      provider?: string;
    },
  ) => Promise<void>;
  /**
   * update the message error with optimistic update
   */
  internal_updateMessageError: (id: string, error: ChatMessageError | null) => Promise<void>;
  internal_updateMessagePluginError: (
    id: string,
    error: ChatMessagePluginError | null,
  ) => Promise<void>;
  /**
   * create a message with optimistic update
   */
  internal_createMessage: (
    params: CreateMessageParams,
    context?: { tempMessageId?: string; skipRefresh?: boolean },
  ) => Promise<string | undefined>;
  /**
   * create a temp message for optimistic update
   * otherwise the message will be too slow to show
   */
  internal_createTmpMessage: (params: CreateMessageParams) => string;
  /**
   * delete the message content with optimistic update
   */
  internal_deleteMessage: (id: string) => Promise<void>;

  internal_fetchMessages: () => Promise<void>;
  internal_traceMessage: (id: string, payload: TraceEventPayloads) => Promise<void>;

  /**
   * method to toggle message create loading state
   * the AI message status is creating -> generating
   * other message role like user and tool , only this method need to be called
   */
  internal_toggleMessageLoading: (loading: boolean, id: string) => void;

  /**
   * helper to toggle the loading state of the array,used by these three toggleXXXLoading
   */
  internal_toggleLoadingArrays: (
    key: keyof ChatStoreState,
    loading: boolean,
    id?: string,
    action?: Action,
  ) => AbortController | undefined;

  // ******* Group Chat Internal Actions ******* //
  /**
   * Trigger supervisor decision for group chat
   */
  internal_triggerSupervisorDecision: (groupId: string) => Promise<void>;
  /**
   * Execute agent responses for selected agents
   */
  internal_executeAgentResponses: (groupId: string, agentIds: string[]) => Promise<void>;
  /**
   * Process individual agent message response
   */
  internal_processAgentMessage: (groupId: string, agentId: string, userMessageId: string) => Promise<void>;
  /**
   * Toggle supervisor loading state
   */
  internal_toggleSupervisorLoading: (loading: boolean, groupId?: string) => void;
  /**
   * Update agent speaking status
   */
  internal_updateAgentSpeakingStatus: (groupId: string, agentId: string, speaking: boolean) => void;
  /**
   * Set active group
   */
  internal_setActiveGroup: (groupId: string) => void;
  /**
   * Update group maps
   */
  internal_updateGroupMaps: (groups: ChatGroupItem[]) => void;
  /**
   * Update group agent maps
   */
  internal_updateGroupAgentMaps: (groupId: string, agents: ChatGroupAgentItem[]) => void;
}

export const chatMessage: StateCreator<
  ChatStore,
  [['zustand/devtools', never]],
  [],
  ChatMessageAction
> = (set, get) => ({
  deleteMessage: async (id) => {
    const message = chatSelectors.getMessageById(id)(get());
    if (!message) return;

    let ids = [message.id];

    // if the message is a tool calls, then delete all the related messages
    if (message.tools) {
      const toolMessageIds = message.tools.flatMap((tool) => {
        const messages = chatSelectors
          .activeBaseChats(get())
          .filter((m) => m.tool_call_id === tool.id);

        return messages.map((m) => m.id);
      });
      ids = ids.concat(toolMessageIds);
    }

    get().internal_dispatchMessage({ type: 'deleteMessages', ids });
    await messageService.removeMessages(ids);
    await get().refreshMessages();
  },

  deleteToolMessage: async (id) => {
    const message = chatSelectors.getMessageById(id)(get());
    if (!message || message.role !== 'tool') return;

    const removeToolInAssistantMessage = async () => {
      if (!message.parentId) return;
      await get().internal_removeToolToAssistantMessage(message.parentId, message.tool_call_id);
    };

    await Promise.all([
      // 1. remove tool message
      get().internal_deleteMessage(id),
      // 2. remove the tool item in the assistant tools
      removeToolInAssistantMessage(),
    ]);
  },

  clearMessage: async () => {
    const { activeId, activeTopicId, refreshMessages, refreshTopic, switchTopic } = get();

    await messageService.removeMessagesByAssistant(activeId, activeTopicId);

    if (activeTopicId) {
      await topicService.removeTopic(activeTopicId);
    }
    await refreshTopic();
    await refreshMessages();

    // after remove topic , go back to default topic
    switchTopic();
  },
  clearAllMessages: async () => {
    const { refreshMessages } = get();
    await messageService.removeAllMessages();
    await refreshMessages();
  },
  addAIMessage: async () => {
    const { internal_createMessage, updateInputMessage, activeTopicId, activeId, inputMessage } =
      get();
    if (!activeId) return;

    await internal_createMessage({
      content: inputMessage,
      role: 'assistant',
      sessionId: activeId,
      // if there is activeTopicId，then add topicId to message
      topicId: activeTopicId,
    });

    updateInputMessage('');
  },
  copyMessage: async (id, content) => {
    await copyToClipboard(content);

    get().internal_traceMessage(id, { eventType: TraceEventType.CopyMessage });
  },
  toggleMessageEditing: (id, editing) => {
    set(
      { messageEditingIds: toggleBooleanList(get().messageEditingIds, id, editing) },
      false,
      'toggleMessageEditing',
    );
  },

  updateInputMessage: (message) => {
    if (isEqual(message, get().inputMessage)) return;

    set({ inputMessage: message }, false, n('updateInputMessage', message));
  },
  modifyMessageContent: async (id, content) => {
    // tracing the diff of update
    // due to message content will change, so we need send trace before update,or will get wrong data
    get().internal_traceMessage(id, {
      eventType: TraceEventType.ModifyMessage,
      nextContent: content,
    });

    await get().internal_updateMessageContent(id, content);
  },
  useFetchMessages: (enable, sessionId, activeTopicId) =>
    useClientDataSWR<ChatMessage[]>(
      enable ? [SWR_USE_FETCH_MESSAGES, sessionId, activeTopicId] : null,
      async ([, sessionId, topicId]: [string, string, string | undefined]) =>
        messageService.getMessages(sessionId, topicId),
      {
        onSuccess: (messages, key) => {
          const nextMap = {
            ...get().messagesMap,
            [messageMapKey(sessionId, activeTopicId)]: messages,
          };
          // no need to update map if the messages have been init and the map is the same
          if (get().messagesInit && isEqual(nextMap, get().messagesMap)) return;

          set(
            { messagesInit: true, messagesMap: nextMap },
            false,
            n('useFetchMessages', { messages, queryKey: key }),
          );
        },
      },
    ),
  refreshMessages: async () => {
    await mutate([SWR_USE_FETCH_MESSAGES, get().activeId, get().activeTopicId]);
  },

  // the internal process method of the AI message
  internal_dispatchMessage: (payload) => {
    const { activeId } = get();

    if (!activeId) return;

    const messages = messagesReducer(chatSelectors.activeBaseChats(get()), payload);

    const nextMap = { ...get().messagesMap, [chatSelectors.currentChatKey(get())]: messages };

    if (isEqual(nextMap, get().messagesMap)) return;

    set({ messagesMap: nextMap }, false, { type: `dispatchMessage/${payload.type}`, payload });
  },

  internal_updateMessageError: async (id, error) => {
    get().internal_dispatchMessage({ id, type: 'updateMessage', value: { error } });
    await messageService.updateMessage(id, { error });
    await get().refreshMessages();
  },

  internal_updateMessagePluginError: async (id, error) => {
    await messageService.updateMessagePluginError(id, error);
    await get().refreshMessages();
  },

  internal_updateMessageContent: async (id, content, extra) => {
    const { internal_dispatchMessage, refreshMessages, internal_transformToolCalls } = get();

    // Due to the async update method and refresh need about 100ms
    // we need to update the message content at the frontend to avoid the update flick
    // refs: https://medium.com/@kyledeguzmanx/what-are-optimistic-updates-483662c3e171
    if (extra?.toolCalls) {
      internal_dispatchMessage({
        id,
        type: 'updateMessage',
        value: { tools: internal_transformToolCalls(extra?.toolCalls) },
      });
    } else {
      internal_dispatchMessage({
        id,
        type: 'updateMessage',
        value: { content },
      });
    }

    await messageService.updateMessage(id, {
      content,
      tools: extra?.toolCalls ? internal_transformToolCalls(extra?.toolCalls) : undefined,
      reasoning: extra?.reasoning,
      search: extra?.search,
      metadata: extra?.metadata,
      model: extra?.model,
      provider: extra?.provider,
      imageList: extra?.imageList,
    });
    await refreshMessages();
  },

  internal_createMessage: async (message, context) => {
    const {
      internal_createTmpMessage,
      refreshMessages,
      internal_toggleMessageLoading,
      internal_dispatchMessage,
    } = get();
    let tempId = context?.tempMessageId;
    if (!tempId) {
      // use optimistic update to avoid the slow waiting
      tempId = internal_createTmpMessage(message);

      internal_toggleMessageLoading(true, tempId);
    }

    try {
      const id = await messageService.createMessage(message);
      if (!context?.skipRefresh) {
        internal_toggleMessageLoading(true, tempId);
        await refreshMessages();
      }

      internal_toggleMessageLoading(false, tempId);
      return id;
    } catch (e) {
      internal_toggleMessageLoading(false, tempId);
      internal_dispatchMessage({
        id: tempId,
        type: 'updateMessage',
        value: {
          error: { type: ChatErrorType.CreateMessageError, message: (e as Error).message, body: e },
        },
      });
    }
  },

  internal_fetchMessages: async () => {
    const messages = await messageService.getMessages(get().activeId, get().activeTopicId);
    const nextMap = { ...get().messagesMap, [chatSelectors.currentChatKey(get())]: messages };
    // no need to update map if the messages have been init and the map is the same
    if (get().messagesInit && isEqual(nextMap, get().messagesMap)) return;

    set(
      { messagesInit: true, messagesMap: nextMap },
      false,
      n('internal_fetchMessages', { messages }),
    );
  },
  internal_createTmpMessage: (message) => {
    const { internal_dispatchMessage } = get();

    // use optimistic update to avoid the slow waiting
    const tempId = 'tmp_' + nanoid();
    internal_dispatchMessage({ type: 'createMessage', id: tempId, value: message });

    return tempId;
  },
  internal_deleteMessage: async (id: string) => {
    get().internal_dispatchMessage({ type: 'deleteMessage', id });
    await messageService.removeMessage(id);
    await get().refreshMessages();
  },
  internal_traceMessage: async (id, payload) => {
    // tracing the diff of update
    const message = chatSelectors.getMessageById(id)(get());
    if (!message) return;

    const traceId = message?.traceId;
    const observationId = message?.observationId;

    if (traceId && message?.role === 'assistant') {
      traceService
        .traceEvent({ traceId, observationId, content: message.content, ...payload })
        .catch();
    }
  },

  // ----- Loading ------- //
  internal_toggleMessageLoading: (loading, id) => {
    set(
      {
        messageLoadingIds: toggleBooleanList(get().messageLoadingIds, id, loading),
      },
      false,
      `internal_toggleMessageLoading/${loading ? 'start' : 'end'}`,
    );
  },
  internal_toggleLoadingArrays: (key, loading, id, action) => {
    const abortControllerKey = `${key}AbortController`;
    if (loading) {
      window.addEventListener('beforeunload', preventLeavingFn);

      const abortController = new AbortController();
      set(
        {
          [abortControllerKey]: abortController,
          [key]: toggleBooleanList(get()[key] as string[], id!, loading),
        },
        false,
        action,
      );

      return abortController;
    } else {
      if (!id) {
        set({ [abortControllerKey]: undefined, [key]: [] }, false, action);
      } else
        set(
          {
            [abortControllerKey]: undefined,
            [key]: toggleBooleanList(get()[key] as string[], id, loading),
          },
          false,
          action,
        );

      window.removeEventListener('beforeunload', preventLeavingFn);
    }
  },

  // ******* Group Chat Actions Implementation ******* //

  sendGroupMessage: async ({ groupId, message, files }) => {
    const {
      internal_createMessage,
      internal_triggerSupervisorDecision,
      internal_setActiveGroup,
    } = get();

    if (!message.trim() && (!files || files.length === 0)) return;

    // Set active group
    internal_setActiveGroup(groupId);

    set({ isCreatingMessage: true }, false, n('creatingGroupMessage/start'));

    try {
      // Add user message to group - reuse existing message creation
      const userMessage: CreateMessageParams = {
        content: message,
        files: files?.map((f) => f.id),
        role: 'user',
        sessionId: groupId, // Use groupId as sessionId for group messages
        // No agentId for user messages
      };

      const messageId = await internal_createMessage(userMessage);

      // Trigger supervisor decision for group
      if (messageId) {
        await internal_triggerSupervisorDecision(groupId);
      }
    } catch (error) {
      console.error('Failed to send group message:', error);
    } finally {
      set({ isCreatingMessage: false }, false, n('creatingGroupMessage/end'));
    }
  },

  createGroupChat: async ({ title, agentIds, description }) => {
    try {
      const chatGroupModel = getChatGroupModel();
      const { group } = await chatGroupModel.createWithAgents(
        {
          title,
          description,
          config: {
            autoResponse: true,
            maxAgents: 5,
            responseOrder: 'smart',
          },
        },
        agentIds,
      );

      // Refresh groups to update state
      await get().refreshGroups();

      return group.id;
    } catch (error) {
      console.error('Failed to create group chat:', error);
      throw error;
    }
  },

  switchToGroup: async (groupId: string) => {
    const { internal_setActiveGroup, refreshMessages } = get();

    internal_setActiveGroup(groupId);
    await refreshMessages();
  },

  addAgentToGroup: async (groupId: string, agentId: string) => {
    try {
      const chatGroupModel = getChatGroupModel();
      await chatGroupModel.addAgentToGroup(groupId, agentId);

      // Refresh group agents
      const agents = await chatGroupModel.getGroupAgents(groupId);
      get().internal_updateGroupAgentMaps(groupId, agents);
    } catch (error) {
      console.error('Failed to add agent to group:', error);
      throw error;
    }
  },

  removeAgentFromGroup: async (groupId: string, agentId: string) => {
    try {
      const chatGroupModel = getChatGroupModel();
      await chatGroupModel.removeAgentFromGroup(groupId, agentId);

      // Refresh group agents
      const agents = await chatGroupModel.getGroupAgents(groupId);
      get().internal_updateGroupAgentMaps(groupId, agents);
    } catch (error) {
      console.error('Failed to remove agent from group:', error);
      throw error;
    }
  },

  refreshGroups: async () => {
    try {
      const chatGroupModel = getChatGroupModel();
      const groups = await chatGroupModel.query();
      get().internal_updateGroupMaps(groups);

      set({ groupsInit: true }, false, n('refreshGroups'));
    } catch (error) {
      console.error('Failed to refresh groups:', error);
    }
  },

  // ******* Group Chat Internal Actions ******* //

  internal_triggerSupervisorDecision: async (groupId: string) => {
    const {
      messagesMap,
      groupAgentMaps,
      internal_toggleSupervisorLoading,
      internal_executeAgentResponses,
    } = get();

    const messages = messagesMap[groupId] || [];
    const agents = groupAgentMaps[groupId] || [];

    if (messages.length === 0 || agents.length === 0) return;

    internal_toggleSupervisorLoading(true, groupId);

    try {
      // Create supervisor context
      const context: SupervisorContext = {
        availableAgents: agents.filter((a) => a.enabled),
        groupId,
        messages,
      };

      // Make supervisor decision
      const decision: SupervisorDecision = await supervisor.makeDecision(context);

      // Validate decision
      if (!supervisor.validateDecision(decision, context)) {
        console.warn('Invalid supervisor decision:', decision);
        return;
      }

      console.log('Supervisor decision:', decision);

      // Execute agent responses if any agents selected
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
    const { messagesMap, internal_processAgentMessage } = get();

    const messages = messagesMap[groupId] || [];
    const lastUserMessage = messages.filter((m) => m.role === 'user').pop();

    if (!lastUserMessage) return;

    // Process each agent response in parallel
    const responsePromises = agentIds.map((agentId) =>
      internal_processAgentMessage(groupId, agentId, lastUserMessage.id),
    );

    try {
      await Promise.all(responsePromises);
    } catch (error) {
      console.error('Failed to execute agent responses:', error);
    }
  },

  internal_processAgentMessage: async (
    groupId: string,
    agentId: string,
    userMessageId: string,
  ) => {
    const {
      messagesMap,
      internal_createMessage,
      internal_updateAgentSpeakingStatus,
      internal_coreProcessMessage,
    } = get();

    internal_updateAgentSpeakingStatus(groupId, agentId, true);

    try {
      // Create assistant message placeholder for this specific agent
      const assistantMessage: CreateMessageParams = {
        role: 'assistant',
        content: '',
        sessionId: groupId,
        parentId: userMessageId,
        agentId, // Mark which agent is responding
        fromModel: agentId, // TODO: Get actual model from agent config
        fromProvider: 'openai', // TODO: Get from agent config
      };

      const messageId = await internal_createMessage(assistantMessage, { skipRefresh: true });

      if (messageId) {
        // Get group messages for context
        const messages = messagesMap[groupId] || [];

        // Reuse existing core processing logic
        await internal_coreProcessMessage(messages, messageId, {
          // Pass group-specific context
          groupId,
          agentId,
        });
      }
    } catch (error) {
      console.error(`Failed to process message for agent ${agentId}:`, error);
    } finally {
      internal_updateAgentSpeakingStatus(groupId, agentId, false);
    }
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

  internal_updateAgentSpeakingStatus: (
    groupId: string,
    agentId: string,
    speaking: boolean,
  ) => {
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

  internal_setActiveGroup: (groupId: string) => {
    if (get().activeGroupId === groupId) return;

    set({ activeGroupId: groupId }, false, n('setActiveGroup'));
  },

  internal_updateGroupMaps: (groups: ChatGroupItem[]) => {
    const nextGroupMaps = groups.reduce(
      (acc, group) => {
        acc[group.id] = group;
        return acc;
      },
      {} as Record<string, ChatGroupItem>,
    );

    if (isEqual(nextGroupMaps, get().groupMaps)) return;

    set({ groupMaps: nextGroupMaps }, false, n('updateGroupMaps'));
  },

  internal_updateGroupAgentMaps: (groupId: string, agents: ChatGroupAgentItem[]) => {
    set(
      produce((state: ChatStoreState) => {
        state.groupAgentMaps[groupId] = agents;
      }),
      false,
      n(`updateGroupAgentMaps/${groupId}`),
    );
  },
});
