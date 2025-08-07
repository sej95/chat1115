import { describe, it, expect, beforeEach } from 'vitest';
import { RAGContextInjector, type RAGContextConfig } from '../RAGContextInjector';
import type { PipelineContext, ChatMessage, RetrievalChunk } from '../../types';

describe('RAGContextInjector', () => {
  let injector: RAGContextInjector;
  let mockContext: PipelineContext;
  let mockChunks: RetrievalChunk[];

  beforeEach(() => {
    mockChunks = [
      {
        id: 'chunk1',
        content: '这是第一个检索块的内容，包含相关信息。',
        similarity: 0.9,
        metadata: { source: 'doc1.pdf', page: 1 },
      },
      {
        id: 'chunk2', 
        content: '这是第二个检索块，也包含有用信息。',
        similarity: 0.8,
        metadata: { source: 'doc2.pdf', page: 2 },
      },
      {
        id: 'chunk3',
        content: '第三个检索块的相关内容。',
        similarity: 0.7,
        metadata: { source: 'doc1.pdf', page: 3 },
      },
    ];

    const config: RAGContextConfig = {
      chunks: mockChunks,
      queryId: 'test-query-123',
      rewriteQuery: '优化后的查询内容',
    };

    injector = new RAGContextInjector(config);
    
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
    it('should initialize with provided config', () => {
      const config = injector.getConfig();
      expect(config.chunks).toHaveLength(3);
      expect(config.queryId).toBe('test-query-123');
      expect(config.rewriteQuery).toBe('优化后的查询内容');
    });
  });


  describe('doProcess method', () => {
    it('should return context unchanged when no chunks provided', async () => {
      const emptyConfig: RAGContextConfig = { chunks: [] };
      const emptyInjector = new RAGContextInjector(emptyConfig);
      
      const userMessage: ChatMessage = {
        id: 'user1',
        role: 'user',
        content: '用户问题',
        createdAt: Date.now(),
      };
      
      mockContext.messages = [userMessage];
      
      const result = await emptyInjector.process(mockContext);
      
      expect(result.messages[0].content).toBe('用户问题');
      expect(result.executionInfo.executedProcessors).toContain('RAGContextInjector');
    });

    it('should inject RAG context to last user message', async () => {
      const messages: ChatMessage[] = [
        { id: 'sys1', role: 'system', content: '系统消息', createdAt: Date.now() },
        { id: 'user1', role: 'user', content: '第一个用户问题', createdAt: Date.now() },
        { id: 'assistant1', role: 'assistant', content: '助手回复', createdAt: Date.now() },
        { id: 'user2', role: 'user', content: '最后的用户问题', createdAt: Date.now() },
      ];
      
      mockContext.messages = messages;
      
      const result = await injector.process(mockContext);
      
      // 前面的消息保持不变
      expect(result.messages[0].content).toBe('系统消息');
      expect(result.messages[1].content).toBe('第一个用户问题');
      expect(result.messages[2].content).toBe('助手回复');
      
      // 最后的用户消息被注入RAG上下文
      const lastMessage = result.messages[3];
      expect(lastMessage.content).toContain('最后的用户问题');
      expect(lastMessage.content).toContain('以下是相关的背景信息');
      expect(lastMessage.content).toContain('[参考资料 1]');
      expect(lastMessage.content).toContain('这是第一个检索块的内容');
    });

    it('should handle case with no user messages', async () => {
      const messages: ChatMessage[] = [
        { id: 'sys1', role: 'system', content: '系统消息', createdAt: Date.now() },
        { id: 'assistant1', role: 'assistant', content: '助手消息', createdAt: Date.now() },
      ];
      
      mockContext.messages = messages;
      
      const result = await injector.process(mockContext);
      
      expect(result.messages).toHaveLength(2);
      expect(result.messages[0].content).toBe('系统消息');
      expect(result.messages[1].content).toBe('助手消息');
    });

    it('should update metadata correctly', async () => {
      const userMessage: ChatMessage = {
        id: 'user1',
        role: 'user',
        content: '用户问题',
        createdAt: Date.now(),
      };
      
      mockContext.messages = [userMessage];
      
      const result = await injector.process(mockContext);
      
      expect(result.metadata.ragContext).toBeDefined();
      expect(result.metadata.ragContext.chunksCount).toBe(3);
      expect(result.metadata.ragContext.queryId).toBe('test-query-123');
      expect(result.metadata.ragContext.rewriteQuery).toBe('优化后的查询内容');
      expect(result.metadata.ragContext.minSimilarity).toBe(0.7);
      expect(result.metadata.ragContext.maxSimilarity).toBe(0.9);
      expect(result.metadata.ragContext.avgSimilarity).toBeCloseTo(0.8);
    });
  });

  describe('chunk processing and filtering', () => {
    it('should filter chunks by minimum similarity', async () => {
      const config: RAGContextConfig = {
        chunks: mockChunks,
        minSimilarity: 0.85,
      };
      
      const similarityInjector = new RAGContextInjector(config);
      
      const userMessage: ChatMessage = {
        id: 'user1',
        role: 'user',
        content: '用户问题',
        createdAt: Date.now(),
      };
      
      mockContext.messages = [userMessage];
      
      const result = await similarityInjector.process(mockContext);
      
      expect(result.metadata.ragContext.chunksCount).toBe(1); // 只有similarity >= 0.85的块
    });

    it('should sort chunks by similarity', async () => {
      // 创建乱序的chunks
      const unorderedChunks: RetrievalChunk[] = [
        { id: 'chunk1', content: '内容1', similarity: 0.6, metadata: {} },
        { id: 'chunk2', content: '内容2', similarity: 0.9, metadata: {} },
        { id: 'chunk3', content: '内容3', similarity: 0.7, metadata: {} },
      ];
      
      const config: RAGContextConfig = {
        chunks: unorderedChunks,
      };
      
      const sortInjector = new RAGContextInjector(config);
      
      const userMessage: ChatMessage = {
        id: 'user1',
        role: 'user',
        content: '用户问题',
        createdAt: Date.now(),
      };
      
      mockContext.messages = [userMessage];
      
      const result = await sortInjector.process(mockContext);
      
      const content = result.messages[0].content;
      const index1 = content.indexOf('内容2'); // similarity 0.9
      const index2 = content.indexOf('内容3'); // similarity 0.7  
      const index3 = content.indexOf('内容1'); // similarity 0.6
      
      expect(index1).toBeLessThan(index2);
      expect(index2).toBeLessThan(index3);
    });

    it('should truncate by max context length', async () => {
      const config: RAGContextConfig = {
        chunks: mockChunks,
        maxContextLength: 50, // 很小的限制
      };
      
      const truncateInjector = new RAGContextInjector(config);
      
      const userMessage: ChatMessage = {
        id: 'user1',
        role: 'user',
        content: '用户问题',
        createdAt: Date.now(),
      };
      
      mockContext.messages = [userMessage];
      
      const result = await truncateInjector.process(mockContext);
      
      expect(result.metadata.ragContext.chunksCount).toBeLessThan(3);
    });

    it('should disable similarity sorting when configured', async () => {
      const config: RAGContextConfig = {
        chunks: mockChunks,
        sortBySimilarity: false,
      };
      
      const noSortInjector = new RAGContextInjector(config);
      
      const result = noSortInjector.getChunksStats();
      expect(result?.count).toBe(3);
    });
  });

  describe('context building', () => {
    it('should build RAG context with all elements', async () => {
      const userMessage: ChatMessage = {
        id: 'user1',
        role: 'user',
        content: '用户问题',
        createdAt: Date.now(),
      };
      
      mockContext.messages = [userMessage];
      
      const result = await injector.process(mockContext);
      
      const content = result.messages[0].content;
      
      expect(content).toContain('以下是相关的背景信息');
      expect(content).toContain('[参考资料 1] (相似度: 90.0%)');
      expect(content).toContain('[参考资料 2] (相似度: 80.0%)');
      expect(content).toContain('[参考资料 3] (相似度: 70.0%)');
      expect(content).toContain('用户查询经过重写优化');
      expect(content).toContain('优化后的查询内容');
      expect(content).toContain('请基于以上参考资料回答用户的问题');
    });

    it('should build context without rewrite query when not provided', async () => {
      const config: RAGContextConfig = {
        chunks: mockChunks.slice(0, 1),
        // 不提供 rewriteQuery
      };
      
      const simpleInjector = new RAGContextInjector(config);
      
      const userMessage: ChatMessage = {
        id: 'user1',
        role: 'user',
        content: '用户问题',
        createdAt: Date.now(),
      };
      
      mockContext.messages = [userMessage];
      
      const result = await simpleInjector.process(mockContext);
      
      const content = result.messages[0].content;
      
      expect(content).not.toContain('用户查询经过重写优化');
      expect(content).toContain('[参考资料 1]');
    });
  });

  describe('configuration methods', () => {
    it('should update chunks', () => {
      const newChunks: RetrievalChunk[] = [
        { id: 'new1', content: '新内容', similarity: 0.95, metadata: {} },
      ];
      
      injector.setChunks(newChunks);
      
      expect(injector.getConfig().chunks).toEqual(newChunks);
    });

    it('should update rewrite query', () => {
      injector.setRewriteQuery('新的重写查询');
      
      expect(injector.getConfig().rewriteQuery).toBe('新的重写查询');
    });

    it('should update query ID', () => {
      injector.setQueryId('new-query-456');
      
      expect(injector.getConfig().queryId).toBe('new-query-456');
    });

    it('should update min similarity', () => {
      injector.setMinSimilarity(0.75);
      
      expect(injector.getConfig().minSimilarity).toBe(0.75);
    });

    it('should update max context length', () => {
      injector.setMaxContextLength(1000);
      
      expect(injector.getConfig().maxContextLength).toBe(1000);
    });

    it('should support method chaining', () => {
      const result = injector
        .setQueryId('chained-query')
        .setMinSimilarity(0.6)
        .setMaxContextLength(500);
      
      expect(result).toBe(injector);
      
      const config = injector.getConfig();
      expect(config.queryId).toBe('chained-query');
      expect(config.minSimilarity).toBe(0.6);
      expect(config.maxContextLength).toBe(500);
    });
  });

  describe('statistics and utilities', () => {
    it('should provide chunks statistics', () => {
      const stats = injector.getChunksStats();
      
      expect(stats).toBeDefined();
      expect(stats!.count).toBe(3);
      expect(stats!.minSimilarity).toBe(0.7);
      expect(stats!.maxSimilarity).toBe(0.9);
      expect(stats!.avgSimilarity).toBeCloseTo(0.8);
      expect(stats!.totalLength).toBeGreaterThan(0);
      expect(stats!.avgLength).toBeGreaterThan(0);
    });

    it('should return null stats when no chunks', () => {
      const emptyConfig: RAGContextConfig = { chunks: [] };
      const emptyInjector = new RAGContextInjector(emptyConfig);
      
      const stats = emptyInjector.getChunksStats();
      
      expect(stats).toBe(null);
    });

    it('should preview RAG context', () => {
      const preview = injector.preview();
      
      expect(preview).toContain('以下是相关的背景信息');
      expect(preview).toContain('[参考资料 1]');
      expect(preview).toContain('这是第一个检索块的内容');
    });
  });

  describe('edge cases', () => {
    it('should handle chunks with missing similarity', () => {
      const chunksWithMissingSimilarity: any[] = [
        { id: 'chunk1', content: '内容1', similarity: 0.8, metadata: {} },
        { id: 'chunk2', content: '内容2', metadata: {} }, // 缺少similarity
      ];
      
      const config: RAGContextConfig = {
        chunks: chunksWithMissingSimilarity,
      };
      
      expect(() => new RAGContextInjector(config)).not.toThrow();
    });

    it('should handle empty chunk content', () => {
      const emptyChunks: RetrievalChunk[] = [
        { id: 'empty1', content: '', similarity: 0.8, metadata: {} },
        { id: 'empty2', content: '   ', similarity: 0.7, metadata: {} },
      ];
      
      const config: RAGContextConfig = {
        chunks: emptyChunks,
      };
      
      const emptyInjector = new RAGContextInjector(config);
      
      const userMessage: ChatMessage = {
        id: 'user1',
        role: 'user',
        content: '用户问题',
        createdAt: Date.now(),
      };
      
      mockContext.messages = [userMessage];
      
      expect(async () => await emptyInjector.process(mockContext)).not.toThrow();
    });

    it('should handle chunk truncation edge cases', async () => {
      const longChunk: RetrievalChunk = {
        id: 'long',
        content: 'A'.repeat(1000),
        similarity: 0.9,
        metadata: {},
      };
      
      const config: RAGContextConfig = {
        chunks: [longChunk],
        maxContextLength: 150, // 允许截断
      };
      
      const truncateInjector = new RAGContextInjector(config);
      
      const userMessage: ChatMessage = {
        id: 'user1',
        role: 'user',
        content: '用户问题',
        createdAt: Date.now(),
      };
      
      mockContext.messages = [userMessage];
      
      const result = await truncateInjector.process(mockContext);
      
      expect(result.metadata.ragContext.chunksCount).toBe(1);
      expect(result.messages[0].content).toContain('...');
    });

    it('should handle very small max context length', async () => {
      const config: RAGContextConfig = {
        chunks: mockChunks,
        maxContextLength: 10, // 非常小的限制
      };
      
      const tinyInjector = new RAGContextInjector(config);
      
      const userMessage: ChatMessage = {
        id: 'user1',
        role: 'user',
        content: '用户问题',
        createdAt: Date.now(),
      };
      
      mockContext.messages = [userMessage];
      
      const result = await tinyInjector.process(mockContext);
      
      expect(result.metadata.ragContext.chunksCount).toBe(0);
    });
  });
});