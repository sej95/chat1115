import { describe, it, expect, beforeEach, vi } from 'vitest';
import { HistoryTruncator } from '../HistoryTruncator';
import type { PipelineContext, AgentState, TokenCounter } from '../../types';

// Mock token counter
const mockTokenCounter: TokenCounter = {
  count: vi.fn().mockImplementation((content: string) => {
    // Simple mock: 1 token per character
    return Promise.resolve(content.length);
  }),
};

describe('HistoryTruncator', () => {
  let truncator: HistoryTruncator;
  let mockContext: PipelineContext;

  beforeEach(() => {
    truncator = new HistoryTruncator({ keepLatestN: 3 });
    mockContext = {
      initialState: { messages: [] } as AgentState,
      messages: [
        { id: '1', role: 'system', content: 'System message' },
        { id: '2', role: 'user', content: 'Message 1' },
        { id: '3', role: 'assistant', content: 'Response 1' },
        { id: '4', role: 'user', content: 'Message 2' },
        { id: '5', role: 'assistant', content: 'Response 2' },
        { id: '6', role: 'user', content: 'Message 3' },
      ],
      metadata: { model: 'gpt-4', maxTokens: 1000 },
      isAborted: false,
    };
  });

  describe('constructor', () => {
    it('should create truncator with default config', () => {
      const defaultTruncator = new HistoryTruncator();
      const config = defaultTruncator.getConfig();
      
      expect(config.keepLatestN).toBe(10);
      expect(config.includeNewUserMessage).toBe(true);
    });

    it('should create truncator with custom config', () => {
      const customTruncator = new HistoryTruncator({
        keepLatestN: 5,
        maxTokens: 2000,
        tokenCounter: mockTokenCounter,
      });
      
      const config = customTruncator.getConfig();
      expect(config.keepLatestN).toBe(5);
      expect(config.maxTokens).toBe(2000);
      expect(config.tokenCounter).toBe(mockTokenCounter);
    });
  });

  describe('count-based truncation', () => {
    it('should truncate messages when exceeding count limit', async () => {
      const result = await truncator.process(mockContext);

      // Should keep system message + 3 latest non-system messages
      expect(result.messages).toHaveLength(4);
      expect(result.messages[0].role).toBe('system');
      expect(result.messages[1].id).toBe('4'); // Message 2
      expect(result.messages[2].id).toBe('5'); // Response 2
      expect(result.messages[3].id).toBe('6'); // Message 3
    });

    it('should not truncate when within limit', async () => {
      const smallContext = {
        ...mockContext,
        messages: [
          { id: '1', role: 'system', content: 'System message' },
          { id: '2', role: 'user', content: 'Hello' },
        ],
      };

      const result = await truncator.process(smallContext);
      expect(result.messages).toHaveLength(2);
    });

    it('should handle includeNewUserMessage option', async () => {
      const truncatorWithNewUser = new HistoryTruncator({
        keepLatestN: 2,
        includeNewUserMessage: true,
      });

      const result = await truncatorWithNewUser.process(mockContext);

      // Should keep system + 2 + 1 (new user) = 4 messages
      expect(result.messages).toHaveLength(4);
    });

    it('should return empty when keepLatestN is 0', async () => {
      const zeroTruncator = new HistoryTruncator({ keepLatestN: 0 });
      
      const result = await zeroTruncator.process(mockContext);
      
      // Should only keep system messages
      expect(result.messages).toHaveLength(1);
      expect(result.messages[0].role).toBe('system');
    });
  });

  describe('token-based truncation', () => {
    beforeEach(() => {
      truncator = new HistoryTruncator({
        maxTokens: 50,
        tokenCounter: mockTokenCounter,
      });
    });

    it('should truncate based on token limit', async () => {
      const result = await truncator.process(mockContext);

      expect(result.messages.length).toBeLessThan(mockContext.messages.length);
      expect(result.metadata.historyTruncation?.truncationMethod).toContain('tokens');
    });

    it('should preserve system messages in token calculation', async () => {
      const result = await truncator.process(mockContext);

      const hasSystemMessage = result.messages.some(msg => msg.role === 'system');
      expect(hasSystemMessage).toBe(true);
    });

    it('should handle empty messages', async () => {
      const emptyContext = {
        ...mockContext,
        messages: [],
      };

      const result = await truncator.process(emptyContext);
      expect(result.messages).toHaveLength(0);
    });
  });

  describe('combined truncation', () => {
    it('should apply both count and token limits', async () => {
      const combinedTruncator = new HistoryTruncator({
        keepLatestN: 10,
        maxTokens: 30,
        tokenCounter: mockTokenCounter,
      });

      const result = await combinedTruncator.process(mockContext);
      
      // Should be limited by both constraints
      expect(result.messages.length).toBeLessThanOrEqual(mockContext.messages.length);
    });
  });

  describe('utility methods', () => {
    it('should set configuration options', () => {
      truncator
        .setKeepLatestN(5)
        .setMaxTokens(2000)
        .setTokenCounter(mockTokenCounter)
        .setIncludeNewUserMessage(false);

      const config = truncator.getConfig();
      expect(config.keepLatestN).toBe(5);
      expect(config.maxTokens).toBe(2000);
      expect(config.tokenCounter).toBe(mockTokenCounter);
      expect(config.includeNewUserMessage).toBe(false);
    });

    it('should estimate truncated count', async () => {
      const messages = mockContext.messages;
      const estimate = await truncator.estimateTruncatedCount(messages);

      expect(estimate.countBased).toBeGreaterThan(0);
      expect(estimate.countBased).toBeLessThanOrEqual(messages.length);
    });

    it('should check if truncation is needed', () => {
      expect(truncator.needsTruncation(10)).toBe(true);
      expect(truncator.needsTruncation(2)).toBe(false);
    });
  });

  describe('metadata tracking', () => {
    it('should track truncation metadata', async () => {
      const result = await truncator.process(mockContext);

      expect(result.metadata.historyTruncation).toBeDefined();
      expect(result.metadata.historyTruncation?.originalCount).toBe(mockContext.messages.length);
      expect(result.metadata.historyTruncation?.finalCount).toBe(result.messages.length);
      expect(result.metadata.historyTruncation?.removedCount).toBeGreaterThan(0);
    });

    it('should track truncation method', async () => {
      const result = await truncator.process(mockContext);

      expect(result.metadata.historyTruncation?.truncationMethod).toContain('count');
    });
  });

  describe('edge cases', () => {
    it('should handle messages without content', async () => {
      const contextWithEmptyContent = {
        ...mockContext,
        messages: [
          { id: '1', role: 'user', content: '' },
          { id: '2', role: 'assistant', content: null as any },
          { id: '3', role: 'user', content: undefined as any },
        ],
      };

      const result = await truncator.process(contextWithEmptyContent);
      expect(result.messages.length).toBeLessThanOrEqual(3);
    });

    it('should handle very large messages', async () => {
      const largeMessage = 'A'.repeat(10000);
      const contextWithLargeMessage = {
        ...mockContext,
        messages: [
          { id: '1', role: 'user', content: largeMessage },
          { id: '2', role: 'assistant', content: 'Short response' },
        ],
      };

      const tokenTruncator = new HistoryTruncator({
        maxTokens: 100,
        tokenCounter: mockTokenCounter,
      });

      const result = await tokenTruncator.process(contextWithLargeMessage);
      expect(result.messages.length).toBeGreaterThan(0);
    });
  });

  describe('error handling', () => {
    it('should handle token counter errors gracefully', async () => {
      const failingTokenCounter: TokenCounter = {
        count: vi.fn().mockRejectedValue(new Error('Token counting failed')),
      };

      const failingTruncator = new HistoryTruncator({
        maxTokens: 100,
        tokenCounter: failingTokenCounter,
      });

      // Should not throw, might fall back to count-based truncation
      await expect(failingTruncator.process(mockContext)).resolves.toBeDefined();
    });
  });
});