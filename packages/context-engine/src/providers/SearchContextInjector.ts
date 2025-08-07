import { BaseProvider } from '../base/BaseProvider';
import type { PipelineContext, ProcessorOptions, ChatMessage } from '../types';

/**
 * 搜索上下文配置
 */
export interface SearchContextConfig {
  /** 是否启用搜索 */
  enabled: boolean;
  /** 搜索结果 */
  searchResults?: SearchResult[];
  /** 搜索查询 */
  searchQuery?: string;
  /** 搜索模式 */
  searchMode?: 'web' | 'knowledge' | 'hybrid';
  /** 最大搜索结果数量 */
  maxResults?: number;
  /** 搜索工作流提示 */
  workflowPrompt?: string;
}

/**
 * 搜索结果接口
 */
export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
  relevance?: number;
  source?: string;
}

/**
 * 搜索上下文注入器
 * 负责为启用搜索功能的对话注入搜索上下文和工作流提示
 */
export class SearchContextInjector extends BaseProvider {
  readonly name = 'SearchContextInjector';

  constructor(
    private config: SearchContextConfig,
    options: ProcessorOptions = {},
  ) {
    super(options);
  }

  protected async doProcess(context: PipelineContext): Promise<PipelineContext> {
    const clonedContext = this.cloneContext(context);
    
    // 如果搜索未启用，直接返回
    if (!this.config.enabled) {
      log('搜索功能未启用，跳过搜索上下文注入');
      return this.markAsExecuted(clonedContext);
    }

    let injected = false;

    // 1. 注入搜索工作流提示
    if (this.config.workflowPrompt) {
      this.injectWorkflowPrompt(clonedContext);
      injected = true;
    }

    // 2. 注入搜索结果上下文
    if (this.config.searchResults && this.config.searchResults.length > 0) {
      this.injectSearchResults(clonedContext);
      injected = true;
    }

    if (!injected) {
      log('没有搜索上下文需要注入');
    }

    // 更新元数据
    clonedContext.metadata.searchContext = {
      enabled: this.config.enabled,
      mode: this.config.searchMode,
      query: this.config.searchQuery,
      resultsCount: this.config.searchResults?.length || 0,
      workflowInjected: !!this.config.workflowPrompt,
      resultsInjected: !!(this.config.searchResults && this.config.searchResults.length > 0),
    };

    return this.markAsExecuted(clonedContext);
  }

  /**
   * 注入搜索工作流提示
   */
  private injectWorkflowPrompt(context: PipelineContext): void {
    const workflowMessage: ChatMessage = {
      id: `search-workflow-${Date.now()}`,
      role: 'system',
      content: this.buildWorkflowPrompt(),
      createdAt: Date.now(),
    };

    // 查找系统消息位置插入
    const systemMessageIndex = context.messages.findIndex(msg => msg.role === 'system');
    
    if (systemMessageIndex >= 0) {
      // 合并到现有系统消息
      const existingSystemMessage = context.messages[systemMessageIndex];
      existingSystemMessage.content = [
        existingSystemMessage.content,
        this.buildWorkflowPrompt(),
      ].filter(Boolean).join('\n\n');
    } else {
      // 插入新的系统消息
      context.messages.unshift(workflowMessage);
    }

    log('搜索工作流提示已注入');
  }

  /**
   * 注入搜索结果上下文
   */
  private injectSearchResults(context: PipelineContext): void {
    const lastUserMessage = this.findLastUserMessage(context.messages);
    
    if (!lastUserMessage) {
      log.extend('warn')('未找到用户消息，无法注入搜索结果');
      return;
    }

    const searchResultsContext = this.buildSearchResultsContext();
    
    // 将搜索结果添加到用户消息中
    lastUserMessage.content = [
      lastUserMessage.content,
      '',
      searchResultsContext,
    ].join('\n').trim();

    log(`搜索结果上下文已注入，共 ${this.config.searchResults!.length} 条结果`);
  }

  /**
   * 构建工作流提示
   */
  private buildWorkflowPrompt(): string {
    if (this.config.workflowPrompt) {
      return this.config.workflowPrompt;
    }

    // 默认工作流提示
    const defaultPrompts = {
      web: '你具备网络搜索能力。当用户询问最新信息、实时数据或需要验证信息时，你应该主动使用搜索功能获取准确信息。',
      knowledge: '你可以搜索知识库中的相关信息。当遇到专业问题或需要具体资料时，请使用知识库搜索功能。',
      hybrid: '你具备网络搜索和知识库搜索能力。请根据问题类型选择合适的搜索方式获取信息。',
    };

    return defaultPrompts[this.config.searchMode || 'web'];
  }

  /**
   * 构建搜索结果上下文
   */
  private buildSearchResultsContext(): string {
    if (!this.config.searchResults || this.config.searchResults.length === 0) {
      return '';
    }

    const contextParts = [
      '以下是相关的搜索结果：',
      '',
    ];

    // 限制搜索结果数量
    const maxResults = this.config.maxResults || 5;
    const limitedResults = this.config.searchResults.slice(0, maxResults);

    limitedResults.forEach((result, index) => {
      contextParts.push(
        `[搜索结果 ${index + 1}]`,
        `标题: ${result.title}`,
        `链接: ${result.url}`,
        `摘要: ${result.snippet}`,
      );
      
      if (result.relevance) {
        contextParts.push(`相关度: ${(result.relevance * 100).toFixed(1)}%`);
      }
      
      if (result.source) {
        contextParts.push(`来源: ${result.source}`);
      }
      
      contextParts.push(''); // 空行分隔
    });

    if (this.config.searchQuery) {
      contextParts.push(
        `搜索查询: "${this.config.searchQuery}"`,
        '',
      );
    }

    contextParts.push(
      '请基于以上搜索结果回答用户的问题。如果搜索结果中没有相关信息，请明确说明。',
    );

    return contextParts.join('\n');
  }

  /**
   * 找到最后一条用户消息
   */
  private findLastUserMessage(messages: any[]) {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === 'user') {
        return messages[i];
      }
    }
    return null;
  }

  /**
   * 设置搜索配置
   */
  setConfig(config: Partial<SearchContextConfig>): this {
    this.config = { ...this.config, ...config };
    return this;
  }

  /**
   * 启用搜索
   */
  enableSearch(): this {
    this.config.enabled = true;
    return this;
  }

  /**
   * 禁用搜索
   */
  disableSearch(): this {
    this.config.enabled = false;
    return this;
  }

  /**
   * 设置搜索结果
   */
  setSearchResults(results: SearchResult[]): this {
    this.config.searchResults = results;
    return this;
  }

  /**
   * 设置搜索查询
   */
  setSearchQuery(query: string): this {
    this.config.searchQuery = query;
    return this;
  }

  /**
   * 设置搜索模式
   */
  setSearchMode(mode: SearchContextConfig['searchMode']): this {
    this.config.searchMode = mode;
    return this;
  }

  /**
   * 设置工作流提示
   */
  setWorkflowPrompt(prompt: string): this {
    this.config.workflowPrompt = prompt;
    return this;
  }

  /**
   * 获取当前配置
   */
  getConfig(): SearchContextConfig {
    return { ...this.config };
  }

  /**
   * 检查是否启用了搜索
   */
  isSearchEnabled(): boolean {
    return this.config.enabled;
  }

  /**
   * 获取搜索结果统计
   */
  getSearchStats() {
    const results = this.config.searchResults || [];
    if (results.length === 0) {
      return null;
    }

    return {
      count: results.length,
      hasRelevanceScores: results.some(r => r.relevance !== undefined),
      avgRelevance: results
        .filter(r => r.relevance !== undefined)
        .reduce((sum, r) => sum + (r.relevance || 0), 0) / results.length,
      sources: [...new Set(results.map(r => r.source).filter(Boolean))],
    };
  }
}