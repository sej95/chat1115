import debug from 'debug';
import { BaseProcessor } from '../base/BaseProcessor';
import type { PipelineContext, ProcessorOptions, TokenCounter } from '../types';

const log = debug('context-engine:processor:TokenBasedTruncator');

/**
 * 基于 Token 的智能截断器
 * 根据 Token 限制进行更智能的消息截断和内容优化
 */
export class TokenBasedTruncator extends BaseProcessor {
  readonly name = 'TokenBasedTruncator';

  constructor(
    private tokenCounter: TokenCounter,
    private options: {
      /** 最大 Token 限制 */
      maxTokens: number;
      /** 保留系统消息 */
      preserveSystemMessages?: boolean;
      /** 保留最后的用户消息 */
      preserveLastUserMessage?: boolean;
      /** Token 缓冲区百分比 */
      bufferPercentage?: number;
    },
    processorOptions: ProcessorOptions = {},
  ) {
    super(processorOptions);
    
    this.options = {
      preserveSystemMessages: true,
      preserveLastUserMessage: true,
      bufferPercentage: 0.1, // 10% 缓冲区
      ...this.options,
    };
  }

  protected async doProcess(context: PipelineContext): Promise<PipelineContext> {
    const clonedContext = this.cloneContext(context);
    
    // Calculate current total token count
    const currentTokens = await this.calculateTotalTokens(clonedContext.messages);
    const maxTokens = this.options.maxTokens * (1 - this.options.bufferPercentage!);
    const originalMessageCount = clonedContext.messages.length;
    
    if (currentTokens <= maxTokens) {
      log('Current tokens', currentTokens, 'within limit', maxTokens, 'no truncation needed');
      return this.markAsExecuted(clonedContext);
    }

    log('Current tokens', currentTokens, 'exceeds limit', maxTokens, 'starting intelligent truncation');

    // Perform intelligent truncation
    const truncatedMessages = await this.performIntelligentTruncation(clonedContext.messages, maxTokens);
    
    clonedContext.messages = truncatedMessages;
    
    const finalTokens = await this.calculateTotalTokens(truncatedMessages);
    
    // Update metadata
    clonedContext.metadata.tokenBasedTruncation = {
      originalTokens: currentTokens,
      finalTokens,
      savedTokens: currentTokens - finalTokens,
      originalMessageCount,
      finalMessageCount: truncatedMessages.length,
      maxTokens: this.options.maxTokens,
      bufferPercentage: this.options.bufferPercentage,
    };

    log('Token truncation completed from', currentTokens, 'to', finalTokens, 'saved', currentTokens - finalTokens, 'tokens');

    return this.markAsExecuted(clonedContext);
  }

  /**
   * 执行智能截断
   */
  private async performIntelligentTruncation(messages: any[], maxTokens: number): Promise<any[]> {
    // 1. 分类消息
    const systemMessages = messages.filter(msg => msg.role === 'system');
    const userMessages = messages.filter(msg => msg.role === 'user');
    const assistantMessages = messages.filter(msg => msg.role === 'assistant');
    const toolMessages = messages.filter(msg => msg.role === 'tool');

    // 2. 计算必须保留的消息的 Token 数
    const preservedMessages: any[] = [];
    let preservedTokens = 0;

    // 保留系统消息
    if (this.options.preserveSystemMessages) {
      preservedMessages.push(...systemMessages);
      preservedTokens += await this.calculateTotalTokens(systemMessages);
    }

    // 保留最后的用户消息
    if (this.options.preserveLastUserMessage && userMessages.length > 0) {
      const lastUserMessage = userMessages[userMessages.length - 1];
      preservedMessages.push(lastUserMessage);
      preservedTokens += await this.calculateTotalTokens([lastUserMessage]);
    }

    // 3. 计算剩余可用的 Token 数
    const availableTokens = maxTokens - preservedTokens;

    if (availableTokens <= 0) {
      log('Preserved messages exceed token limit, returning only required messages');
      return preservedMessages;
    }

    // 4. 从剩余消息中选择最重要的
    const remainingMessages = messages.filter(msg => 
      !preservedMessages.some(preserved => preserved.id === msg.id)
    );

    const selectedMessages = await this.selectImportantMessages(remainingMessages, availableTokens);

    // 5. 按时间顺序重新排列
    const allSelectedMessages = [...preservedMessages, ...selectedMessages];
    allSelectedMessages.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));

    return allSelectedMessages;
  }

  /**
   * 选择重要的消息
   */
  private async selectImportantMessages(messages: any[], availableTokens: number): Promise<any[]> {
    // 按重要性评分排序
    const scoredMessages = await Promise.all(
      messages.map(async msg => ({
        message: msg,
        score: await this.calculateMessageImportance(msg),
        tokens: await this.calculateTotalTokens([msg]),
      }))
    );

    // 按得分降序排列
    scoredMessages.sort((a, b) => b.score - a.score);

    // 贪心选择消息
    const selected: any[] = [];
    let usedTokens = 0;

    for (const { message, tokens } of scoredMessages) {
      if (usedTokens + tokens <= availableTokens) {
        selected.push(message);
        usedTokens += tokens;
      } else {
        // 尝试截断消息内容
        const truncatedMessage = await this.tryTruncateMessage(message, availableTokens - usedTokens);
        if (truncatedMessage) {
          selected.push(truncatedMessage);
          break;
        }
      }
    }

    return selected;
  }

  /**
   * 计算消息重要性得分
   */
  private async calculateMessageImportance(message: any): Promise<number> {
    let score = 0;

    // 基础分数
    score += 1;

    // 角色权重
    const roleWeights = {
      system: 10,
      user: 8,
      assistant: 6,
      tool: 4,
    };
    score += roleWeights[message.role as keyof typeof roleWeights] || 0;

    // 内容长度权重（适中长度得分更高）
    const contentLength = message.content?.length || 0;
    if (contentLength > 50 && contentLength < 500) {
      score += 2;
    } else if (contentLength >= 500 && contentLength < 1000) {
      score += 1;
    }

    // 包含特殊内容的加分
    if (message.tools && message.tools.length > 0) {
      score += 3; // 函数调用很重要
    }

    if (message.imageList && message.imageList.length > 0) {
      score += 2; // 图像内容比较重要
    }

    if (message.reasoning) {
      score += 2; // 推理内容比较重要
    }

    // 时间新近性（越新越重要）
    if (message.createdAt) {
      const age = Date.now() - message.createdAt;
      const ageScore = Math.max(0, 5 - age / (1000 * 60 * 60)); // 1小时内的消息额外加分
      score += ageScore;
    }

    return score;
  }

  /**
   * 尝试截断单条消息
   */
  private async tryTruncateMessage(message: any, maxTokens: number): Promise<any | null> {
    if (maxTokens < 50) return null; // Token 太少，不值得截断

    const content = message.content;
    if (!content || typeof content !== 'string') return null;

    // 二分查找最佳截断长度
    let left = 0;
    let right = content.length;
    let bestTruncation: any = null;

    while (left <= right) {
      const mid = Math.floor((left + right) / 2);
      const truncatedContent = content.substring(0, mid) + '...';
      const truncatedMessage = { ...message, content: truncatedContent };
      
      const tokens = await this.calculateTotalTokens([truncatedMessage]);

      if (tokens <= maxTokens) {
        bestTruncation = truncatedMessage;
        left = mid + 1;
      } else {
        right = mid - 1;
      }
    }

    return bestTruncation;
  }

  /**
   * 计算消息总 Token 数
   */
  private async calculateTotalTokens(messages: any[]): Promise<number> {
    if (messages.length === 0) return 0;
    
    const contents = messages.map(msg => {
      if (typeof msg.content === 'string') {
        return msg.content;
      } else if (Array.isArray(msg.content)) {
        return msg.content
          .filter(part => part.type === 'text')
          .map(part => part.text)
          .join(' ');
      }
      return '';
    });

    return await this.tokenCounter.count(contents.join('\n'));
  }

  /**
   * 预估截断效果
   */
  async estimateTruncation(messages: any[]): Promise<{
    currentTokens: number;
    estimatedFinalTokens: number;
    estimatedSavedTokens: number;
    needsTruncation: boolean;
  }> {
    const currentTokens = await this.calculateTotalTokens(messages);
    const maxTokens = this.options.maxTokens * (1 - this.options.bufferPercentage!);
    
    if (currentTokens <= maxTokens) {
      return {
        currentTokens,
        estimatedFinalTokens: currentTokens,
        estimatedSavedTokens: 0,
        needsTruncation: false,
      };
    }

    // 简化估算：假设截断后使用90%的限制
    const estimatedFinalTokens = Math.floor(maxTokens * 0.9);

    return {
      currentTokens,
      estimatedFinalTokens,
      estimatedSavedTokens: currentTokens - estimatedFinalTokens,
      needsTruncation: true,
    };
  }

  /**
   * 设置最大 Token 数
   */
  setMaxTokens(maxTokens: number): this {
    this.options.maxTokens = maxTokens;
    return this;
  }

  /**
   * 获取当前配置
   */
  getConfig() {
    return { ...this.options };
  }
}