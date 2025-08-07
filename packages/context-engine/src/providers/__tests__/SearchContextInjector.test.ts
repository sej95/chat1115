import { describe, it, expect, beforeEach } from 'vitest';
import { SearchContextInjector, type SearchContextConfig, type SearchResult } from '../SearchContextInjector';
import type { PipelineContext, ChatMessage } from '../../types';

describe('SearchContextInjector', () => {
  let injector: SearchContextInjector;
  let mockContext: PipelineContext;
  let mockSearchResults: SearchResult[];

  beforeEach(() => {
    mockSearchResults = [
      {
        title: '搜索结果标题1',
        url: 'https://example.com/page1',
        snippet: '这是第一个搜索结果的摘要内容。',
        relevance: 0.95,
        source: 'web',
      },
      {
        title: '搜索结果标题2',
        url: 'https://example.com/page2',
        snippet: '这是第二个搜索结果的摘要内容。',
        relevance: 0.88,
        source: 'knowledge',
      },
      {
        title: '搜索结果标题3',
        url: 'https://example.com/page3',
        snippet: '这是第三个搜索结果的摘要内容。',
        relevance: 0.76,
      },
    ];

    const config: SearchContextConfig = {
      enabled: true,
      searchResults: mockSearchResults,
      searchQuery: '测试搜索查询',
      searchMode: 'web',
      maxResults: 5,
      workflowPrompt: '自定义工作流提示',
    };

    injector = new SearchContextInjector(config);
    
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
      expect(config.enabled).toBe(true);
      expect(config.searchResults).toHaveLength(3);
      expect(config.searchQuery).toBe('测试搜索查询');
      expect(config.searchMode).toBe('web');
      expect(config.workflowPrompt).toBe('自定义工作流提示');
    });
  });


  describe('doProcess method', () => {
    it('should return context unchanged when search is disabled', async () => {
      injector.disableSearch();
      
      const userMessage: ChatMessage = {
        id: 'user1',
        role: 'user',
        content: '用户问题',
        createdAt: Date.now(),
      };
      
      mockContext.messages = [userMessage];
      
      const result = await injector.process(mockContext);
      
      expect(result.messages).toHaveLength(1);
      expect(result.messages[0].content).toBe('用户问题');
      expect(result.executionInfo.executedProcessors).toContain('SearchContextInjector');
    });

    it('should inject workflow prompt as system message', async () => {
      const config: SearchContextConfig = {
        enabled: true,
        workflowPrompt: '测试工作流提示',
      };
      
      const workflowInjector = new SearchContextInjector(config);
      
      mockContext.messages = [];
      
      const result = await workflowInjector.process(mockContext);
      
      expect(result.messages).toHaveLength(1);
      expect(result.messages[0].role).toBe('system');
      expect(result.messages[0].content).toBe('测试工作流提示');
    });

    it('should merge workflow prompt with existing system message', async () => {
      const config: SearchContextConfig = {
        enabled: true,
        workflowPrompt: '新的工作流提示',
      };
      
      const workflowInjector = new SearchContextInjector(config);
      
      const systemMessage: ChatMessage = {
        id: 'sys1',
        role: 'system',
        content: '现有系统消息',
        createdAt: Date.now(),
      };
      
      mockContext.messages = [systemMessage];
      
      const result = await workflowInjector.process(mockContext);
      
      expect(result.messages).toHaveLength(1);
      expect(result.messages[0].content).toContain('现有系统消息');
      expect(result.messages[0].content).toContain('新的工作流提示');
    });

    it('should inject search results to last user message', async () => {
      const messages: ChatMessage[] = [
        { id: 'sys1', role: 'system', content: '系统消息', createdAt: Date.now() },
        { id: 'user1', role: 'user', content: '第一个问题', createdAt: Date.now() },
        { id: 'assistant1', role: 'assistant', content: '助手回复', createdAt: Date.now() },
        { id: 'user2', role: 'user', content: '最后的问题', createdAt: Date.now() },
      ];
      
      mockContext.messages = messages;
      
      const result = await injector.process(mockContext);
      
      const lastMessage = result.messages[result.messages.length - 1];
      expect(lastMessage.content).toContain('最后的问题');
      expect(lastMessage.content).toContain('以下是相关的搜索结果');
      expect(lastMessage.content).toContain('[搜索结果 1]');
      expect(lastMessage.content).toContain('搜索结果标题1');
    });

    it('should handle case with no user messages', async () => {
      const messages: ChatMessage[] = [
        { id: 'sys1', role: 'system', content: '系统消息', createdAt: Date.now() },
        { id: 'assistant1', role: 'assistant', content: '助手消息', createdAt: Date.now() },
      ];
      
      mockContext.messages = messages;
      
      const result = await injector.process(mockContext);
      
      // 应该只注入工作流提示，不注入搜索结果
      expect(result.messages).toHaveLength(2);
      expect(result.messages[0].content).toContain('自定义工作流提示');
    });

    it('should inject both workflow and search results', async () => {
      const userMessage: ChatMessage = {
        id: 'user1',
        role: 'user',
        content: '用户问题',
        createdAt: Date.now(),
      };
      
      mockContext.messages = [userMessage];
      
      const result = await injector.process(mockContext);
      
      expect(result.messages).toHaveLength(2); // system + user
      expect(result.messages[0].role).toBe('system');
      expect(result.messages[0].content).toContain('自定义工作流提示');
      expect(result.messages[1].content).toContain('以下是相关的搜索结果');
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
      
      expect(result.metadata.searchContext).toEqual({
        enabled: true,
        mode: 'web',
        query: '测试搜索查询',
        resultsCount: 3,
        workflowInjected: true,
        resultsInjected: true,
      });
    });
  });

  describe('workflow prompt generation', () => {
    it('should use custom workflow prompt when provided', async () => {
      const config: SearchContextConfig = {
        enabled: true,
        workflowPrompt: '这是自定义的工作流提示',
      };
      
      const customInjector = new SearchContextInjector(config);
      
      mockContext.messages = [];
      
      const result = await customInjector.process(mockContext);
      
      expect(result.messages[0].content).toBe('这是自定义的工作流提示');
    });

    it('should generate default workflow prompt for web mode', async () => {
      const config: SearchContextConfig = {
        enabled: true,
        searchMode: 'web',
        // 不提供 workflowPrompt
      };
      
      const webInjector = new SearchContextInjector(config);
      
      mockContext.messages = [];
      
      const result = await webInjector.process(mockContext);
      
      expect(result.messages[0].content).toContain('网络搜索能力');
    });

    it('should generate default workflow prompt for knowledge mode', async () => {
      const config: SearchContextConfig = {
        enabled: true,
        searchMode: 'knowledge',
      };
      
      const knowledgeInjector = new SearchContextInjector(config);
      
      mockContext.messages = [];
      
      const result = await knowledgeInjector.process(mockContext);
      
      expect(result.messages[0].content).toContain('知识库搜索');
    });

    it('should generate default workflow prompt for hybrid mode', async () => {
      const config: SearchContextConfig = {
        enabled: true,
        searchMode: 'hybrid',
      };
      
      const hybridInjector = new SearchContextInjector(config);
      
      mockContext.messages = [];
      
      const result = await hybridInjector.process(mockContext);
      
      expect(result.messages[0].content).toContain('网络搜索和知识库搜索');
    });
  });

  describe('search results context building', () => {
    it('should build complete search results context', async () => {
      const userMessage: ChatMessage = {
        id: 'user1',
        role: 'user',
        content: '用户问题',
        createdAt: Date.now(),
      };
      
      mockContext.messages = [userMessage];
      
      const result = await injector.process(mockContext);
      
      const content = result.messages[1].content;
      
      expect(content).toContain('以下是相关的搜索结果');
      expect(content).toContain('[搜索结果 1]');
      expect(content).toContain('标题: 搜索结果标题1');
      expect(content).toContain('链接: https://example.com/page1');
      expect(content).toContain('摘要: 这是第一个搜索结果的摘要内容。');
      expect(content).toContain('相关度: 95.0%');
      expect(content).toContain('来源: web');
      expect(content).toContain('搜索查询: "测试搜索查询"');
      expect(content).toContain('请基于以上搜索结果回答');
    });

    it('should limit search results by maxResults', async () => {
      injector.setConfig({ maxResults: 2 });
      
      const userMessage: ChatMessage = {
        id: 'user1',
        role: 'user',
        content: '用户问题',
        createdAt: Date.now(),
      };
      
      mockContext.messages = [userMessage];
      
      const result = await injector.process(mockContext);
      
      const content = result.messages[1].content;
      
      expect(content).toContain('[搜索结果 1]');
      expect(content).toContain('[搜索结果 2]');
      expect(content).not.toContain('[搜索结果 3]');
    });

    it('should handle search results without optional fields', async () => {
      const minimalResults: SearchResult[] = [
        {
          title: '最小结果',
          url: 'https://example.com/minimal',
          snippet: '最小摘要',
        },
      ];
      
      injector.setSearchResults(minimalResults);
      
      const userMessage: ChatMessage = {
        id: 'user1',
        role: 'user',
        content: '用户问题',
        createdAt: Date.now(),
      };
      
      mockContext.messages = [userMessage];
      
      const result = await injector.process(mockContext);
      
      const content = result.messages[1].content;
      
      expect(content).toContain('标题: 最小结果');
      expect(content).toContain('链接: https://example.com/minimal');
      expect(content).toContain('摘要: 最小摘要');
      expect(content).not.toContain('相关度:');
      expect(content).not.toContain('来源:');
    });
  });

  describe('configuration methods', () => {
    it('should enable and disable search', () => {
      injector.disableSearch();
      expect(injector.isSearchEnabled()).toBe(false);
      
      injector.enableSearch();
      expect(injector.isSearchEnabled()).toBe(true);
    });

    it('should set search results', () => {
      const newResults: SearchResult[] = [
        { title: '新结果', url: 'https://new.com', snippet: '新摘要' },
      ];
      
      injector.setSearchResults(newResults);
      
      expect(injector.getConfig().searchResults).toEqual(newResults);
    });

    it('should set search query', () => {
      injector.setSearchQuery('新搜索查询');
      
      expect(injector.getConfig().searchQuery).toBe('新搜索查询');
    });

    it('should set search mode', () => {
      injector.setSearchMode('knowledge');
      
      expect(injector.getConfig().searchMode).toBe('knowledge');
    });

    it('should set workflow prompt', () => {
      injector.setWorkflowPrompt('新工作流提示');
      
      expect(injector.getConfig().workflowPrompt).toBe('新工作流提示');
    });

    it('should update partial config', () => {
      injector.setConfig({
        maxResults: 10,
        searchMode: 'hybrid',
      });
      
      const config = injector.getConfig();
      expect(config.maxResults).toBe(10);
      expect(config.searchMode).toBe('hybrid');
      expect(config.enabled).toBe(true); // 原有值保持不变
    });

    it('should support method chaining', () => {
      const result = injector
        .setSearchQuery('链式查询')
        .setSearchMode('hybrid')
        .enableSearch();
      
      expect(result).toBe(injector);
      
      const config = injector.getConfig();
      expect(config.searchQuery).toBe('链式查询');
      expect(config.searchMode).toBe('hybrid');
      expect(config.enabled).toBe(true);
    });
  });

  describe('statistics and utilities', () => {
    it('should provide search results statistics', () => {
      const stats = injector.getSearchStats();
      
      expect(stats).toBeDefined();
      expect(stats!.count).toBe(3);
      expect(stats!.hasRelevanceScores).toBe(true);
      expect(stats!.avgRelevance).toBeCloseTo(0.863);
      expect(stats!.sources).toContain('web');
      expect(stats!.sources).toContain('knowledge');
    });

    it('should return null stats when no results', () => {
      injector.setSearchResults([]);
      
      const stats = injector.getSearchStats();
      
      expect(stats).toBe(null);
    });

    it('should handle stats for results without relevance scores', () => {
      const resultsWithoutRelevance: SearchResult[] = [
        { title: '标题1', url: 'url1', snippet: '摘要1' },
        { title: '标题2', url: 'url2', snippet: '摘要2' },
      ];
      
      injector.setSearchResults(resultsWithoutRelevance);
      
      const stats = injector.getSearchStats();
      
      expect(stats!.hasRelevanceScores).toBe(false);
      expect(stats!.avgRelevance).toBe(0);
    });
  });

  describe('edge cases', () => {
    it('should handle empty search results', async () => {
      const config: SearchContextConfig = {
        enabled: true,
        searchResults: [],
        workflowPrompt: '工作流提示',
      };
      
      const emptyInjector = new SearchContextInjector(config);
      
      const userMessage: ChatMessage = {
        id: 'user1',
        role: 'user',
        content: '用户问题',
        createdAt: Date.now(),
      };
      
      mockContext.messages = [userMessage];
      
      const result = await emptyInjector.process(mockContext);
      
      // 只注入工作流提示，不注入搜索结果
      expect(result.messages).toHaveLength(2);
      expect(result.messages[0].content).toBe('工作流提示');
      expect(result.messages[1].content).toBe('用户问题');
    });

    it('should handle search results without query', async () => {
      injector.setSearchQuery(undefined as any);
      
      const userMessage: ChatMessage = {
        id: 'user1',
        role: 'user',
        content: '用户问题',
        createdAt: Date.now(),
      };
      
      mockContext.messages = [userMessage];
      
      const result = await injector.process(mockContext);
      
      const content = result.messages[1].content;
      expect(content).not.toContain('搜索查询:');
    });

    it('should handle null/undefined search results gracefully', () => {
      injector.setSearchResults(undefined as any);
      
      expect(injector.getConfig().searchResults).toBeUndefined();
      expect(injector.getSearchStats()).toBe(null);
    });

    it('should handle mixed relevance scores in stats', () => {
      const mixedResults: SearchResult[] = [
        { title: '标题1', url: 'url1', snippet: '摘要1', relevance: 0.9 },
        { title: '标题2', url: 'url2', snippet: '摘要2' }, // 无relevance
        { title: '标题3', url: 'url3', snippet: '摘要3', relevance: 0.7 },
      ];
      
      injector.setSearchResults(mixedResults);
      
      const stats = injector.getSearchStats();
      
      expect(stats!.hasRelevanceScores).toBe(true);
      expect(stats!.avgRelevance).toBeCloseTo(0.533); // (0.9 + 0 + 0.7) / 3
    });

    it('should handle very long search results', async () => {
      const longResults: SearchResult[] = Array.from({ length: 20 }, (_, i) => ({
        title: `长结果 ${i + 1}`,
        url: `https://example.com/long${i + 1}`,
        snippet: `这是第 ${i + 1} 个很长的搜索结果摘要内容。`,
      }));
      
      const config: SearchContextConfig = {
        enabled: true,
        searchResults: longResults,
        maxResults: 3,
      };
      
      const longInjector = new SearchContextInjector(config);
      
      const userMessage: ChatMessage = {
        id: 'user1',
        role: 'user',
        content: '用户问题',
        createdAt: Date.now(),
      };
      
      mockContext.messages = [userMessage];
      
      const result = await longInjector.process(mockContext);
      
      const content = result.messages[0].content;
      expect(content).toContain('[搜索结果 1]');
      expect(content).toContain('[搜索结果 3]');
      expect(content).not.toContain('[搜索结果 4]');
    });
  });
});