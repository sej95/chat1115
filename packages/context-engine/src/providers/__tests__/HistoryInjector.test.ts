import { describe, it, expect, beforeEach } from 'vitest';
import { HistoryInjector } from '../HistoryInjector';
import type { PipelineContext, ChatMessage } from '../../types';

describe('HistoryInjector', () => {
  let injector: HistoryInjector;
  let mockContext: PipelineContext;

  beforeEach(() => {
    injector = new HistoryInjector();
    
    mockContext = {
      messages: [],
      metadata: {},
      initialState: {
        messages: [],
        agent: {},
        session: { id: 'test-session' },
      },
      executionInfo: {
        executedProcessors: [],
        totalExecutionTime: 0,
        errors: [],
      },
    };
  });


  describe('doProcess method', () => {
    it('should return context unchanged when no history messages', async () => {
      mockContext.initialState.messages = [];
      
      const result = await injector.process(mockContext);
      
      expect(result.messages).toEqual([]);
      expect(result.metadata.historyMessagesCount).toBeUndefined();
      expect(result.executionInfo.executedProcessors).toContain('HistoryInjector');
    });

    it('should inject valid history messages', async () => {
      const historyMessages: ChatMessage[] = [
        {
          id: 'msg1',
          role: 'user',
          content: '用户消息1',
          createdAt: 1000,
        },
        {
          id: 'msg2',
          role: 'assistant',
          content: '助手回复1',
          createdAt: 2000,
        },
        {
          id: 'msg3',
          role: 'user',
          content: '用户消息2',
          createdAt: 3000,
        },
      ];
      
      mockContext.initialState.messages = historyMessages;
      
      const result = await injector.process(mockContext);
      
      expect(result.messages).toHaveLength(3);
      expect(result.messages).toEqual(historyMessages);
      expect(result.metadata.historyMessagesCount).toBe(3);
      expect(result.metadata.totalHistoryLength).toBe(21); // 总字符长度
    });

    it('should filter out invalid messages', async () => {
      const mixedMessages = [
        {
          id: 'msg1',
          role: 'user',
          content: '有效消息',
          createdAt: 1000,
        },
        {
          // 缺少 id
          role: 'user',
          content: '无效消息1',
          createdAt: 2000,
        },
        {
          id: 'msg2',
          // 缺少 role
          content: '无效消息2',
          createdAt: 3000,
        },
        {
          id: 'msg3',
          role: 'user',
          // 缺少 content
          createdAt: 4000,
        },
        {
          id: 'msg4',
          role: 'assistant',
          content: '另一个有效消息',
          createdAt: 5000,
        },
      ];
      
      mockContext.initialState.messages = mixedMessages;
      
      const result = await injector.process(mockContext);
      
      expect(result.messages).toHaveLength(2);
      expect(result.messages[0].content).toBe('有效消息');
      expect(result.messages[1].content).toBe('另一个有效消息');
      expect(result.metadata.historyMessagesCount).toBe(2);
    });

    it('should sort messages by creation time', async () => {
      const unorderedMessages: ChatMessage[] = [
        {
          id: 'msg3',
          role: 'user',
          content: '第三条消息',
          createdAt: 3000,
        },
        {
          id: 'msg1',
          role: 'user',
          content: '第一条消息',
          createdAt: 1000,
        },
        {
          id: 'msg2',
          role: 'assistant',
          content: '第二条消息',
          createdAt: 2000,
        },
      ];
      
      mockContext.initialState.messages = unorderedMessages;
      
      const result = await injector.process(mockContext);
      
      expect(result.messages).toHaveLength(3);
      expect(result.messages[0].content).toBe('第一条消息');
      expect(result.messages[1].content).toBe('第二条消息');
      expect(result.messages[2].content).toBe('第三条消息');
    });

    it('should handle messages without creation time', async () => {
      const messagesWithoutTime: ChatMessage[] = [
        {
          id: 'msg1',
          role: 'user',
          content: '消息1',
        },
        {
          id: 'msg2',
          role: 'assistant',
          content: '消息2',
        },
      ];
      
      mockContext.initialState.messages = messagesWithoutTime;
      
      const result = await injector.process(mockContext);
      
      expect(result.messages).toHaveLength(2);
      expect(result.metadata.historyMessagesCount).toBe(2);
    });

    it('should update message type statistics', async () => {
      const mixedTypeMessages: ChatMessage[] = [
        { id: 'msg1', role: 'system', content: '系统消息' },
        { id: 'msg2', role: 'user', content: '用户消息1' },
        { id: 'msg3', role: 'user', content: '用户消息2' },
        { id: 'msg4', role: 'assistant', content: '助手消息1' },
        { id: 'msg5', role: 'assistant', content: '助手消息2' },
        { id: 'msg6', role: 'assistant', content: '助手消息3' },
        { id: 'msg7', role: 'tool', content: '工具消息' },
      ];
      
      mockContext.initialState.messages = mixedTypeMessages;
      
      const result = await injector.process(mockContext);
      
      expect(result.metadata.historyMessageTypes).toEqual({
        system: 1,
        user: 2,
        assistant: 3,
        tool: 1,
        other: 0,
      });
    });

    it('should handle unknown message roles', async () => {
      const messagesWithUnknownRole: any[] = [
        { id: 'msg1', role: 'user', content: '正常消息' },
        { id: 'msg2', role: 'unknown', content: '未知角色消息' },
        { id: 'msg3', role: 'custom', content: '自定义角色消息' },
      ];
      
      mockContext.initialState.messages = messagesWithUnknownRole;
      
      const result = await injector.process(mockContext);
      
      expect(result.messages).toHaveLength(1); // 只有有效角色的消息被保留
      expect(result.messages[0].role).toBe('user');
      expect(result.metadata.historyMessageTypes?.user).toBe(1);
    });
  });

  describe('message validation', () => {
    it('should validate message structure correctly', async () => {
      const invalidMessages = [
        null,
        undefined,
        'string',
        123,
        {},
        { id: 'msg1' }, // 缺少 role 和 content
        { role: 'user' }, // 缺少 id 和 content
        { content: 'test' }, // 缺少 id 和 role
        { id: '', role: 'user', content: 'test' }, // 空 id
        { id: 'msg1', role: '', content: 'test' }, // 空 role
        { id: 'msg1', role: 'user', content: null }, // null content
      ];
      
      mockContext.initialState.messages = invalidMessages;
      
      const result = await injector.process(mockContext);
      
      expect(result.messages).toHaveLength(0);
      expect(result.metadata.historyMessagesCount).toBeUndefined();
    });

    it('should accept messages with content of 0 or false', async () => {
      const edgeCaseMessages: any[] = [
        { id: 'msg1', role: 'user', content: 0 },
        { id: 'msg2', role: 'user', content: false },
        { id: 'msg3', role: 'user', content: '' },
      ];
      
      mockContext.initialState.messages = edgeCaseMessages;
      
      const result = await injector.process(mockContext);
      
      expect(result.messages).toHaveLength(3);
      expect(result.messages[0].content).toBe(0);
      expect(result.messages[1].content).toBe(false);
      expect(result.messages[2].content).toBe('');
    });
  });

  describe('static utility methods', () => {
    it('should get history stats correctly', () => {
      const contextWithStats: PipelineContext = {
        ...mockContext,
        metadata: {
          historyMessagesCount: 5,
          totalHistoryLength: 150,
          historyMessageTypes: {
            user: 2,
            assistant: 2,
            system: 1,
            tool: 0,
            other: 0,
          },
        },
      };
      
      const stats = HistoryInjector.getHistoryStats(contextWithStats);
      
      expect(stats).toEqual({
        total: 5,
        totalLength: 150,
        types: {
          user: 2,
          assistant: 2,
          system: 1,
          tool: 0,
          other: 0,
        },
      });
    });

    it('should handle missing metadata gracefully', () => {
      const stats = HistoryInjector.getHistoryStats(mockContext);
      
      expect(stats).toEqual({
        total: 0,
        totalLength: 0,
        types: {},
      });
    });
  });

  describe('edge cases', () => {
    it('should handle empty messages array gracefully', async () => {
      mockContext.initialState.messages = [];
      
      const result = await injector.process(mockContext);
      
      expect(result.messages).toEqual([]);
      expect(result.executionInfo.executedProcessors).toContain('HistoryInjector');
    });

    it('should handle undefined messages property', async () => {
      mockContext.initialState.messages = undefined as any;
      
      const result = await injector.process(mockContext);
      
      expect(result.messages).toEqual([]);
      expect(result.executionInfo.executedProcessors).toContain('HistoryInjector');
    });

    it('should preserve existing context messages', async () => {
      const existingMessage: ChatMessage = {
        id: 'existing',
        role: 'user',
        content: '现有消息',
        createdAt: Date.now(),
      };
      
      const historyMessage: ChatMessage = {
        id: 'history',
        role: 'assistant',
        content: '历史消息',
        createdAt: Date.now() - 1000,
      };
      
      mockContext.messages = [existingMessage];
      mockContext.initialState.messages = [historyMessage];
      
      const result = await injector.process(mockContext);
      
      expect(result.messages).toHaveLength(2);
      expect(result.messages[0]).toEqual(existingMessage);
      expect(result.messages[1]).toEqual(historyMessage);
    });

    it('should calculate total length correctly with various content types', async () => {
      const historyMessages: any[] = [
        { id: 'msg1', role: 'user', content: 'Hello' }, // 5 chars
        { id: 'msg2', role: 'user', content: '' }, // 0 chars
        { id: 'msg3', role: 'user', content: 'World!' }, // 6 chars
      ];
      
      mockContext.initialState.messages = historyMessages;
      
      const result = await injector.process(mockContext);
      
      expect(result.metadata.totalHistoryLength).toBe(11);
    });

    it('should handle very large number of messages efficiently', async () => {
      const largeMessageSet: ChatMessage[] = Array.from({ length: 1000 }, (_, i) => ({
        id: `msg${i}`,
        role: i % 2 === 0 ? 'user' : 'assistant',
        content: `Message ${i}`,
        createdAt: i * 1000,
      }));
      
      mockContext.initialState.messages = largeMessageSet;
      
      const result = await injector.process(mockContext);
      
      expect(result.messages).toHaveLength(1000);
      expect(result.metadata.historyMessagesCount).toBe(1000);
      expect(result.metadata.historyMessageTypes?.user).toBe(500);
      expect(result.metadata.historyMessageTypes?.assistant).toBe(500);
    });
  });
});