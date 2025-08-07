import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TokenBasedTruncator } from '../TokenBasedTruncator';
import type { PipelineContext, ChatMessage, TokenCounter } from '../../types';

describe('TokenBasedTruncator', () => {
  let truncator: TokenBasedTruncator;
  let mockContext: PipelineContext;
  let mockTokenCounter: TokenCounter;

  beforeEach(() => {
    // Mock token counter that returns length / 4 as token count (approximation)
    mockTokenCounter = {
      count: vi.fn().mockImplementation(async (text: string) => {
        return Math.ceil(text.length / 4);
      }),
    };

    truncator = new TokenBasedTruncator(mockTokenCounter, {
      maxTokens: 1000,
      preserveSystemMessages: true,
      preserveLastUserMessage: true,
      bufferPercentage: 0.1,
    });
    
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

  describe('constructor and configuration', () => {
    it('should initialize with provided options', () => {
      const config = truncator.getConfig();
      
      expect(config.maxTokens).toBe(1000);
      expect(config.preserveSystemMessages).toBe(true);
      expect(config.preserveLastUserMessage).toBe(true);
      expect(config.bufferPercentage).toBe(0.1);
    });

    it('should use default options when not provided', () => {
      const defaultTruncator = new TokenBasedTruncator(mockTokenCounter, {
        maxTokens: 500,
      });
      
      const config = defaultTruncator.getConfig();
      expect(config.preserveSystemMessages).toBe(true);
      expect(config.preserveLastUserMessage).toBe(true);
      expect(config.bufferPercentage).toBe(0.1);
    });
  });


  describe('token calculation', () => {
    it('should calculate tokens for simple text messages', async () => {
      const messages: ChatMessage[] = [
        {
          id: 'msg1',
          role: 'user',
          content: 'Hello world',
          createdAt: Date.now(),
        },
      ];
      
      mockContext.messages = messages;
      
      const result = await truncator.process(mockContext);
      
      expect(mockTokenCounter.count).toHaveBeenCalledWith('Hello world');
    });

    it('should calculate tokens for multimodal content', async () => {
      const messages: any[] = [
        {
          id: 'msg1',
          role: 'user',
          content: [
            { type: 'text', text: 'Analyze this image' },
            { type: 'image_url', image_url: { url: 'https://example.com/image.jpg' } },
          ],
          createdAt: Date.now(),
        },
      ];
      
      mockContext.messages = messages;
      
      await truncator.process(mockContext);
      
      expect(mockTokenCounter.count).toHaveBeenCalledWith('Analyze this image');
    });

    it('should handle messages with non-text content gracefully', async () => {
      const messages: any[] = [
        {
          id: 'msg1',
          role: 'user',
          content: null,
          createdAt: Date.now(),
        },
        {
          id: 'msg2',
          role: 'user',
          content: [
            { type: 'image_url', image_url: { url: 'test.jpg' } },
          ],
          createdAt: Date.now(),
        },
      ];
      
      mockContext.messages = messages;
      
      const result = await truncator.process(mockContext);
      
      expect(mockTokenCounter.count).toHaveBeenCalledWith('\n');
    });
  });

  describe('truncation logic', () => {
    it('should not truncate when within token limits', async () => {
      const shortMessages: ChatMessage[] = [
        {
          id: 'msg1',
          role: 'user',
          content: 'Short message',
          createdAt: Date.now(),
        },
      ];
      
      mockContext.messages = shortMessages;
      
      const result = await truncator.process(mockContext);
      
      expect(result.messages).toEqual(shortMessages);
      expect(result.metadata.tokenBasedTruncation).toBeUndefined();
    });

    it('should truncate when exceeding token limits', async () => {
      const longContent = 'A'.repeat(5000); // 1250 tokens approximately
      const messages: ChatMessage[] = [
        {
          id: 'system1',
          role: 'system',
          content: 'You are helpful',
          createdAt: 1000,
        },
        {
          id: 'user1',
          role: 'user',
          content: longContent,
          createdAt: 2000,
        },
        {
          id: 'assistant1',
          role: 'assistant',
          content: 'I understand',
          createdAt: 3000,
        },
        {
          id: 'user2',
          role: 'user',
          content: 'Final message',
          createdAt: 4000,
        },
      ];
      
      mockContext.messages = messages;
      
      const result = await truncator.process(mockContext);
      
      expect(result.messages.length).toBeLessThan(messages.length);
      expect(result.metadata.tokenBasedTruncation).toBeDefined();
      expect(result.metadata.tokenBasedTruncation?.originalMessageCount).toBe(4);
      expect(result.metadata.tokenBasedTruncation?.finalMessageCount).toBeLessThan(4);
    });

    it('should preserve system messages when configured', async () => {
      const longContent = 'B'.repeat(4000);
      const messages: ChatMessage[] = [
        {
          id: 'system1',
          role: 'system',
          content: 'System message',
          createdAt: 1000,
        },
        {
          id: 'user1',
          role: 'user',
          content: longContent,
          createdAt: 2000,
        },
        {
          id: 'user2',
          role: 'user',
          content: 'Final message',
          createdAt: 3000,
        },
      ];
      
      mockContext.messages = messages;
      
      const result = await truncator.process(mockContext);
      
      const systemMessage = result.messages.find(msg => msg.role === 'system');
      expect(systemMessage).toBeDefined();
      expect(systemMessage?.content).toBe('System message');
    });

    it('should preserve last user message when configured', async () => {
      const longContent = 'C'.repeat(4000);
      const messages: ChatMessage[] = [
        {
          id: 'user1',
          role: 'user',
          content: longContent,
          createdAt: 1000,
        },
        {
          id: 'assistant1',
          role: 'assistant',
          content: 'Response',
          createdAt: 2000,
        },
        {
          id: 'user2',
          role: 'user',
          content: 'Final user message',
          createdAt: 3000,
        },
      ];
      
      mockContext.messages = messages;
      
      const result = await truncator.process(mockContext);
      
      const lastUserMessage = result.messages
        .filter(msg => msg.role === 'user')
        .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))[0];
      
      expect(lastUserMessage?.content).toBe('Final user message');
    });

    it('should maintain chronological order after truncation', async () => {
      const messages: ChatMessage[] = [
        { id: 'msg1', role: 'user', content: 'D'.repeat(1000), createdAt: 1000 },
        { id: 'msg2', role: 'assistant', content: 'Response 1', createdAt: 2000 },
        { id: 'msg3', role: 'user', content: 'E'.repeat(1000), createdAt: 3000 },
        { id: 'msg4', role: 'assistant', content: 'Response 2', createdAt: 4000 },
        { id: 'msg5', role: 'user', content: 'Final', createdAt: 5000 },
      ];
      
      mockContext.messages = messages;
      
      const result = await truncator.process(mockContext);
      
      // Check that remaining messages are in chronological order
      for (let i = 1; i < result.messages.length; i++) {
        const prev = result.messages[i - 1];
        const curr = result.messages[i];
        expect((curr.createdAt || 0)).toBeGreaterThanOrEqual(prev.createdAt || 0);
      }
    });
  });

  describe('message importance scoring', () => {
    it('should score system messages higher', async () => {
      const messages: any[] = [
        { id: 'sys1', role: 'system', content: 'F'.repeat(2000), createdAt: 1000 },
        { id: 'user1', role: 'user', content: 'G'.repeat(2000), createdAt: 2000 },
        { id: 'user2', role: 'user', content: 'Final', createdAt: 3000 },
      ];
      
      mockContext.messages = messages;
      
      const result = await truncator.process(mockContext);
      
      // System message should be preserved
      expect(result.messages.some(msg => msg.role === 'system')).toBe(true);
    });

    it('should score messages with tools higher', async () => {
      const messages: any[] = [
        {
          id: 'assistant1',
          role: 'assistant',
          content: 'H'.repeat(2000),
          tools: [{ id: 'tool1', name: 'test' }],
          createdAt: 1000,
        },
        {
          id: 'assistant2',
          role: 'assistant',
          content: 'I'.repeat(2000),
          createdAt: 2000,
        },
        {
          id: 'user1',
          role: 'user',
          content: 'Final',
          createdAt: 3000,
        },
      ];
      
      mockContext.messages = messages;
      
      const result = await truncator.process(mockContext);
      
      // Message with tools should have higher chance of being preserved
      const preservedMessages = result.messages.filter(msg => msg.id !== 'user1');
      expect(preservedMessages.some(msg => msg.tools)).toBe(true);
    });

    it('should score messages with images higher', async () => {
      const messages: any[] = [
        {
          id: 'user1',
          role: 'user',
          content: 'J'.repeat(2000),
          imageList: [{ id: 'img1', url: 'test.jpg' }],
          createdAt: 1000,
        },
        {
          id: 'user2',
          role: 'user',
          content: 'K'.repeat(2000),
          createdAt: 2000,
        },
        {
          id: 'user3',
          role: 'user',
          content: 'Final',
          createdAt: 3000,
        },
      ];
      
      mockContext.messages = messages;
      
      const result = await truncator.process(mockContext);
      
      // Message with images should have higher chance of being preserved
      const preservedMessages = result.messages.filter(msg => msg.id !== 'user3');
      expect(preservedMessages.some(msg => msg.imageList)).toBe(true);
    });

    it('should score messages with reasoning higher', async () => {
      const messages: any[] = [
        {
          id: 'assistant1',
          role: 'assistant',
          content: 'L'.repeat(2000),
          reasoning: { content: 'reasoning', signature: 'sig' },
          createdAt: 1000,
        },
        {
          id: 'assistant2',
          role: 'assistant',
          content: 'M'.repeat(2000),
          createdAt: 2000,
        },
        {
          id: 'user1',
          role: 'user',
          content: 'Final',
          createdAt: 3000,
        },
      ];
      
      mockContext.messages = messages;
      
      const result = await truncator.process(mockContext);
      
      // Message with reasoning should have higher chance of being preserved
      const preservedMessages = result.messages.filter(msg => msg.id !== 'user1');
      expect(preservedMessages.some(msg => msg.reasoning)).toBe(true);
    });
  });

  describe('message truncation', () => {
    it('should attempt to truncate individual messages when needed', async () => {
      const veryLongContent = 'N'.repeat(8000);
      const messages: ChatMessage[] = [
        {
          id: 'user1',
          role: 'user',
          content: veryLongContent,
          createdAt: 1000,
        },
        {
          id: 'user2',
          role: 'user',
          content: 'Final message',
          createdAt: 2000,
        },
      ];
      
      mockContext.messages = messages;
      
      const result = await truncator.process(mockContext);
      
      // Should have attempted truncation
      expect(result.metadata.tokenBasedTruncation).toBeDefined();
      
      // First message should be truncated or removed
      const firstMsg = result.messages.find(msg => msg.id === 'user1');
      if (firstMsg) {
        expect(firstMsg.content).toContain('...');
        expect(firstMsg.content.length).toBeLessThan(veryLongContent.length);
      }
    });

    it('should not truncate very short messages', async () => {
      const shortContent = 'O'.repeat(50);
      const messages: ChatMessage[] = [
        {
          id: 'user1',
          role: 'user',
          content: shortContent,
          createdAt: 1000,
        },
      ];
      
      // Mock low token limit to force truncation attempt
      const smallTruncator = new TokenBasedTruncator(mockTokenCounter, {
        maxTokens: 10,
      });
      
      mockContext.messages = messages;
      
      const result = await smallTruncator.process(mockContext);
      
      // Should preserve short messages even with low limits
      expect(result.messages).toHaveLength(1);
    });
  });

  describe('estimation functionality', () => {
    it('should estimate truncation when exceeding limits', async () => {
      const longContent = 'P'.repeat(8000);
      const messages: ChatMessage[] = [
        {
          id: 'user1',
          role: 'user',
          content: longContent,
          createdAt: Date.now(),
        },
      ];
      
      const estimation = await truncator.estimateTruncation(messages);
      
      expect(estimation.needsTruncation).toBe(true);
      expect(estimation.currentTokens).toBeGreaterThan(0);
      expect(estimation.estimatedFinalTokens).toBeLessThan(estimation.currentTokens);
      expect(estimation.estimatedSavedTokens).toBeGreaterThan(0);
    });

    it('should estimate no truncation when within limits', async () => {
      const shortContent = 'Short message';
      const messages: ChatMessage[] = [
        {
          id: 'user1',
          role: 'user',
          content: shortContent,
          createdAt: Date.now(),
        },
      ];
      
      const estimation = await truncator.estimateTruncation(messages);
      
      expect(estimation.needsTruncation).toBe(false);
      expect(estimation.estimatedSavedTokens).toBe(0);
    });
  });

  describe('configuration methods', () => {
    it('should update max tokens', () => {
      truncator.setMaxTokens(2000);
      
      expect(truncator.getConfig().maxTokens).toBe(2000);
    });

    it('should support method chaining', () => {
      const result = truncator.setMaxTokens(1500);
      
      expect(result).toBe(truncator);
      expect(truncator.getConfig().maxTokens).toBe(1500);
    });
  });

  describe('edge cases', () => {
    it('should handle empty messages array', async () => {
      mockContext.messages = [];
      
      const result = await truncator.process(mockContext);
      
      expect(result.messages).toEqual([]);
      expect(result.metadata.tokenBasedTruncation).toBeUndefined();
    });

    it('should handle messages without timestamps', async () => {
      const messages: any[] = [
        {
          id: 'msg1',
          role: 'user',
          content: 'Q'.repeat(4000),
          // No createdAt
        },
        {
          id: 'msg2',
          role: 'user',
          content: 'Final',
          createdAt: Date.now(),
        },
      ];
      
      mockContext.messages = messages;
      
      const result = await truncator.process(mockContext);
      
      // Should handle gracefully
      expect(result.messages.length).toBeGreaterThan(0);
    });

    it('should handle messages with null/undefined content', async () => {
      const messages: any[] = [
        {
          id: 'msg1',
          role: 'user',
          content: null,
          createdAt: 1000,
        },
        {
          id: 'msg2',
          role: 'user',
          content: undefined,
          createdAt: 2000,
        },
        {
          id: 'msg3',
          role: 'user',
          content: 'Valid content',
          createdAt: 3000,
        },
      ];
      
      mockContext.messages = messages;
      
      const result = await truncator.process(mockContext);
      
      // Should handle gracefully without errors
      expect(result.messages).toBeDefined();
    });

    it('should handle when preserved messages exceed token limit', async () => {
      const veryLongSystem = 'R'.repeat(5000);
      const messages: ChatMessage[] = [
        {
          id: 'system1',
          role: 'system',
          content: veryLongSystem,
          createdAt: 1000,
        },
        {
          id: 'user1',
          role: 'user',
          content: 'Final user message',
          createdAt: 2000,
        },
      ];
      
      // Small token limit
      const smallTruncator = new TokenBasedTruncator(mockTokenCounter, {
        maxTokens: 100,
        preserveSystemMessages: true,
        preserveLastUserMessage: true,
      });
      
      mockContext.messages = messages;
      
      const result = await smallTruncator.process(mockContext);
      
      // Should still preserve required messages even when exceeding limits
      expect(result.messages.some(msg => msg.role === 'system')).toBe(true);
      expect(result.messages.some(msg => msg.role === 'user' && msg.content === 'Final user message')).toBe(true);
    });

    it('should handle token counter errors gracefully', async () => {
      const errorTokenCounter: TokenCounter = {
        count: vi.fn().mockRejectedValue(new Error('Token counter error')),
      };
      
      const errorTruncator = new TokenBasedTruncator(errorTokenCounter, {
        maxTokens: 1000,
      });
      
      const messages: ChatMessage[] = [
        {
          id: 'msg1',
          role: 'user',
          content: 'Test message',
          createdAt: Date.now(),
        },
      ];
      
      mockContext.messages = messages;
      
      // Should handle errors gracefully (may throw or return original messages)
      await expect(async () => {
        await errorTruncator.process(mockContext);
      }).rejects.toThrow();
    });

    it('should handle buffer percentage correctly', async () => {
      const bufferTruncator = new TokenBasedTruncator(mockTokenCounter, {
        maxTokens: 1000,
        bufferPercentage: 0.2, // 20% buffer
      });
      
      // Create content that would fit in 1000 tokens but not with 20% buffer
      const content = 'S'.repeat(3500); // ~875 tokens
      const messages: ChatMessage[] = [
        {
          id: 'msg1',
          role: 'user',
          content: content,
          createdAt: Date.now(),
        },
      ];
      
      mockContext.messages = messages;
      
      const result = await bufferTruncator.process(mockContext);
      
      // Should trigger truncation due to buffer
      expect(result.metadata.tokenBasedTruncation).toBeDefined();
    });
  });
});