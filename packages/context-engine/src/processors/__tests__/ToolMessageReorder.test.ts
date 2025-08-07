import { describe, it, expect, beforeEach } from 'vitest';
import { ToolMessageReorder } from '../ToolMessageReorder';
import type { PipelineContext, ChatMessage } from '../../types';

describe('ToolMessageReorder', () => {
  let reorder: ToolMessageReorder;
  let mockContext: PipelineContext;

  beforeEach(() => {
    reorder = new ToolMessageReorder();
    
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


  describe('message reordering', () => {
    it('should maintain correct order for valid tool call sequences', async () => {
      const messages: any[] = [
        {
          id: 'user1',
          role: 'user',
          content: '请查询天气',
        },
        {
          id: 'assistant1',
          role: 'assistant',
          content: '我来为您查询天气',
          tools: [{ id: 'call_123' }],
        },
        {
          id: 'tool1',
          role: 'tool',
          content: '{"temperature": 25}',
          tool_call_id: 'call_123',
        },
        {
          id: 'assistant2',
          role: 'assistant',
          content: '根据查询结果，今天气温是25度',
        },
      ];
      
      mockContext.messages = messages;
      
      const result = await reorder.process(mockContext);
      
      expect(result.messages).toEqual(messages);
      expect(result.metadata.toolMessageReorder?.originalCount).toBe(4);
      expect(result.metadata.toolMessageReorder?.reorderedCount).toBe(4);
      expect(result.metadata.toolMessageReorder?.removedInvalidTools).toBe(0);
    });

    it('should reorder tool messages to follow their corresponding assistant messages', async () => {
      const messages: any[] = [
        {
          id: 'user1',
          role: 'user',
          content: '请查询天气和计算',
        },
        {
          id: 'tool1',
          role: 'tool',
          content: '{"temperature": 25}',
          tool_call_id: 'call_weather',
        },
        {
          id: 'assistant1',
          role: 'assistant',
          content: '我需要查询天气和计算',
          tools: [{ id: 'call_weather' }, { id: 'call_calc' }],
        },
        {
          id: 'tool2',
          role: 'tool',
          content: '{"result": 42}',
          tool_call_id: 'call_calc',
        },
      ];
      
      mockContext.messages = messages;
      
      const result = await reorder.process(mockContext);
      
      // 工具消息应该紧跟在对应的assistant消息之后
      expect(result.messages).toEqual([
        messages[0], // user1
        messages[2], // assistant1
        messages[1], // tool1 (call_weather)
        messages[3], // tool2 (call_calc)
      ]);
    });

    it('should remove invalid tool messages without corresponding calls', async () => {
      const messages: any[] = [
        {
          id: 'user1',
          role: 'user',
          content: '请查询天气',
        },
        {
          id: 'assistant1',
          role: 'assistant',
          content: '我来查询天气',
          tools: [{ id: 'call_123' }],
        },
        {
          id: 'tool1',
          role: 'tool',
          content: '{"temperature": 25}',
          tool_call_id: 'call_123', // 有效
        },
        {
          id: 'tool2',
          role: 'tool',
          content: '{"error": "invalid"}',
          tool_call_id: 'call_nonexistent', // 无效 - 没有对应的调用
        },
        {
          id: 'tool3',
          role: 'tool',
          content: '{"data": "orphaned"}',
          // 无效 - 没有 tool_call_id
        },
      ];
      
      mockContext.messages = messages;
      
      const result = await reorder.process(mockContext);
      
      expect(result.messages).toHaveLength(3); // 移除了2个无效的工具消息
      expect(result.messages).toEqual([
        messages[0], // user1
        messages[1], // assistant1
        messages[2], // tool1 (valid)
      ]);
      
      expect(result.metadata.toolMessageReorder?.removedInvalidTools).toBe(2);
    });

    it('should handle multiple tool calls with correct pairing', async () => {
      const messages: any[] = [
        {
          id: 'user1',
          role: 'user',
          content: '请查询多个信息',
        },
        {
          id: 'assistant1',
          role: 'assistant',
          content: '我需要调用多个工具',
          tools: [
            { id: 'call_weather' },
            { id: 'call_stock' },
            { id: 'call_news' },
          ],
        },
        {
          id: 'tool_news',
          role: 'tool',
          content: '{"news": "latest"}',
          tool_call_id: 'call_news',
        },
        {
          id: 'tool_weather',
          role: 'tool',
          content: '{"temp": 25}',
          tool_call_id: 'call_weather',
        },
        {
          id: 'tool_stock',
          role: 'tool',
          content: '{"price": 100}',
          tool_call_id: 'call_stock',
        },
      ];
      
      mockContext.messages = messages;
      
      const result = await reorder.process(mockContext);
      
      // 工具消息应该按照tools数组的顺序排列在assistant消息后
      expect(result.messages).toEqual([
        messages[0], // user1
        messages[1], // assistant1
        messages[3], // tool_weather (第一个tool)
        messages[4], // tool_stock (第二个tool)  
        messages[2], // tool_news (第三个tool)
      ]);
    });

    it('should handle duplicate tool messages correctly', async () => {
      const messages: any[] = [
        {
          id: 'user1',
          role: 'user',
          content: '测试',
        },
        {
          id: 'assistant1',
          role: 'assistant',
          content: '调用工具',
          tools: [{ id: 'call_123' }],
        },
        {
          id: 'tool1',
          role: 'tool',
          content: '第一个响应',
          tool_call_id: 'call_123',
        },
        {
          id: 'tool1_duplicate',
          role: 'tool',
          content: '重复的响应',
          tool_call_id: 'call_123',
        },
      ];
      
      mockContext.messages = messages;
      
      const result = await reorder.process(mockContext);
      
      // 应该只保留第一个工具响应
      expect(result.messages).toHaveLength(3);
      expect(result.messages).toEqual([
        messages[0], // user1
        messages[1], // assistant1
        messages[2], // tool1 (第一个)
      ]);
    });
  });

  describe('message validation', () => {
    it('should validate complete tool message sequences', () => {
      const validMessages: any[] = [
        {
          id: 'assistant1',
          role: 'assistant',
          tools: [{ id: 'call_123' }, { id: 'call_456' }],
        },
        {
          id: 'tool1',
          role: 'tool',
          tool_call_id: 'call_123',
        },
        {
          id: 'tool2',
          role: 'tool',
          tool_call_id: 'call_456',
        },
      ];
      
      const validation = reorder.validateToolMessages(validMessages);
      
      expect(validation.valid).toBe(true);
      expect(validation.issues).toEqual([]);
    });

    it('should detect orphaned tool calls', () => {
      const messagesWithOrphanedCalls: any[] = [
        {
          id: 'assistant1',
          role: 'assistant',
          tools: [{ id: 'call_123' }, { id: 'call_456' }],
        },
        {
          id: 'tool1',
          role: 'tool',
          tool_call_id: 'call_123',
        },
        // 缺少 call_456 的响应
      ];
      
      const validation = reorder.validateToolMessages(messagesWithOrphanedCalls);
      
      expect(validation.valid).toBe(false);
      expect(validation.issues).toContain('工具调用 call_456 没有对应的响应');
    });

    it('should detect orphaned tool responses', () => {
      const messagesWithOrphanedResponses: any[] = [
        {
          id: 'assistant1',
          role: 'assistant',
          tools: [{ id: 'call_123' }],
        },
        {
          id: 'tool1',
          role: 'tool',
          tool_call_id: 'call_123',
        },
        {
          id: 'tool2',
          role: 'tool',
          tool_call_id: 'call_orphaned', // 没有对应的调用
        },
      ];
      
      const validation = reorder.validateToolMessages(messagesWithOrphanedResponses);
      
      expect(validation.valid).toBe(false);
      expect(validation.issues).toContain('工具响应 call_orphaned 没有对应的调用');
    });
  });

  describe('tool statistics', () => {
    it('should calculate tool message statistics correctly', () => {
      const messages: any[] = [
        {
          id: 'assistant1',
          role: 'assistant',
          tools: [{ id: 'call_1' }, { id: 'call_2' }],
        },
        {
          id: 'assistant2',
          role: 'assistant',
          tools: [{ id: 'call_3' }],
        },
        {
          id: 'tool1',
          role: 'tool',
          tool_call_id: 'call_1',
        },
        {
          id: 'tool2',
          role: 'tool',
          tool_call_id: 'call_2',
        },
        {
          id: 'tool3',
          role: 'tool',
          tool_call_id: 'call_orphaned',
        },
        // 缺少 call_3 的响应
      ];
      
      const stats = ToolMessageReorder.getToolStats(messages);
      
      expect(stats).toEqual({
        toolCalls: 3,
        toolResponses: 3,
        assistantWithTools: 2,
        orphanedCalls: 1, // call_3 没有响应
        orphanedResponses: 1, // call_orphaned 没有调用
      });
    });

    it('should handle messages without tools', () => {
      const messages: any[] = [
        { id: 'user1', role: 'user', content: '用户消息' },
        { id: 'assistant1', role: 'assistant', content: '助手消息' },
      ];
      
      const stats = ToolMessageReorder.getToolStats(messages);
      
      expect(stats).toEqual({
        toolCalls: 0,
        toolResponses: 0,
        assistantWithTools: 0,
        orphanedCalls: 0,
        orphanedResponses: 0,
      });
    });
  });

  describe('edge cases', () => {
    it('should handle empty messages array', async () => {
      mockContext.messages = [];
      
      const result = await reorder.process(mockContext);
      
      expect(result.messages).toEqual([]);
      expect(result.metadata.toolMessageReorder?.originalCount).toBe(0);
      expect(result.metadata.toolMessageReorder?.reorderedCount).toBe(0);
    });

    it('should handle messages without any tool calls', async () => {
      const messages: any[] = [
        { id: 'user1', role: 'user', content: '普通对话' },
        { id: 'assistant1', role: 'assistant', content: '普通回复' },
        { id: 'user2', role: 'user', content: '继续对话' },
      ];
      
      mockContext.messages = messages;
      
      const result = await reorder.process(mockContext);
      
      expect(result.messages).toEqual(messages);
      expect(result.metadata.toolMessageReorder?.removedInvalidTools).toBe(0);
    });

    it('should handle tool messages without tool_call_id', async () => {
      const messages: any[] = [
        {
          id: 'user1',
          role: 'user',
          content: '测试',
        },
        {
          id: 'assistant1',
          role: 'assistant',
          content: '调用工具',
          tools: [{ id: 'call_123' }],
        },
        {
          id: 'tool1',
          role: 'tool',
          content: '工具响应',
          // 缺少 tool_call_id
        },
      ];
      
      mockContext.messages = messages;
      
      const result = await reorder.process(mockContext);
      
      expect(result.messages).toHaveLength(2); // 移除了无效的工具消息
      expect(result.metadata.toolMessageReorder?.removedInvalidTools).toBe(1);
    });

    it('should handle assistant messages with empty tools array', async () => {
      const messages: any[] = [
        {
          id: 'user1',
          role: 'user',
          content: '测试',
        },
        {
          id: 'assistant1',
          role: 'assistant',
          content: '回复',
          tools: [],
        },
        {
          id: 'tool1',
          role: 'tool',
          content: '孤立的工具消息',
          tool_call_id: 'call_nonexistent',
        },
      ];
      
      mockContext.messages = messages;
      
      const result = await reorder.process(mockContext);
      
      expect(result.messages).toHaveLength(2);
      expect(result.metadata.toolMessageReorder?.removedInvalidTools).toBe(1);
    });

    it('should handle tools with missing or invalid IDs', async () => {
      const messages: any[] = [
        {
          id: 'user1',
          role: 'user',
          content: '测试',
        },
        {
          id: 'assistant1',
          role: 'assistant',
          content: '工具调用',
          tools: [
            { id: 'call_valid' },
            { id: '' }, // 空ID
            { name: 'tool_without_id' }, // 没有ID
            { id: null }, // null ID
          ],
        },
        {
          id: 'tool1',
          role: 'tool',
          content: '有效响应',
          tool_call_id: 'call_valid',
        },
        {
          id: 'tool2',
          role: 'tool',
          content: '无效响应',
          tool_call_id: '',
        },
      ];
      
      mockContext.messages = messages;
      
      const result = await reorder.process(mockContext);
      
      // 应该只保留有效的工具调用和响应
      expect(result.messages).toHaveLength(3);
      expect(result.messages).toEqual([
        messages[0], // user1
        messages[1], // assistant1
        messages[2], // tool1 (valid)
      ]);
      
      expect(result.metadata.toolMessageReorder?.removedInvalidTools).toBe(1);
    });

    it('should handle complex conversation with mixed valid and invalid tools', async () => {
      const messages: any[] = [
        { id: 'user1', role: 'user', content: '开始对话' },
        {
          id: 'assistant1',
          role: 'assistant',
          content: '第一次工具调用',
          tools: [{ id: 'call_1' }],
        },
        {
          id: 'tool1',
          role: 'tool',
          content: '第一个工具响应',
          tool_call_id: 'call_1',
        },
        { id: 'user2', role: 'user', content: '继续对话' },
        {
          id: 'assistant2',
          role: 'assistant',
          content: '第二次工具调用',
          tools: [{ id: 'call_2' }, { id: 'call_3' }],
        },
        {
          id: 'tool_orphaned',
          role: 'tool',
          content: '孤立的工具响应',
          tool_call_id: 'call_orphaned',
        },
        {
          id: 'tool2',
          role: 'tool',
          content: '第二个工具响应',
          tool_call_id: 'call_2',
        },
        // 缺少 call_3 的响应
        { id: 'user3', role: 'user', content: '结束对话' },
      ];
      
      mockContext.messages = messages;
      
      const result = await reorder.process(mockContext);
      
      // 验证消息顺序和数量
      expect(result.messages).toHaveLength(7); // 移除了1个孤立的工具消息
      expect(result.messages[0]).toEqual(messages[0]); // user1
      expect(result.messages[1]).toEqual(messages[1]); // assistant1
      expect(result.messages[2]).toEqual(messages[2]); // tool1
      expect(result.messages[3]).toEqual(messages[3]); // user2
      expect(result.messages[4]).toEqual(messages[4]); // assistant2
      expect(result.messages[5]).toEqual(messages[6]); // tool2
      expect(result.messages[6]).toEqual(messages[7]); // user3
      
      expect(result.metadata.toolMessageReorder?.removedInvalidTools).toBe(1);
    });
  });
});