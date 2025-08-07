import debug from 'debug';
import type {
  ContextProcessor,
  PipelineContext,
  ProcessorOptions,
} from '../types';
import { BaseProcessor } from './BaseProcessor';

const log = debug('context-engine:provider:BaseProvider');

/**
 * 基础上下文提供者抽象类
 * 专门用于向消息中注入各种上下文信息
 */
export abstract class BaseProvider extends BaseProcessor {
  /**
   * 检查是否应该注入上下文
   * 子类可以覆盖此方法来实现自定义的注入条件
   */
  protected shouldInject(context: PipelineContext): boolean {
    // 默认情况下，如果消息列表不为空就允许注入
    return context.messages.length > 0;
  }

  /**
   * 构建要注入的上下文内容
   * 子类必须实现此方法来提供具体的上下文内容
   */
  protected abstract buildContext(context: PipelineContext): Promise<string | null>;

  /**
   * 获取注入位置
   * 默认在消息列表开头注入，子类可以覆盖此方法
   */
  protected getInjectionPosition(context: PipelineContext): 'start' | 'end' | number {
    return 'start';
  }

  /**
   * 创建系统消息
   * 用于将上下文内容包装成系统消息
   */
  protected createSystemMessage(content: string): any {
    return {
      role: 'system',
      content,
    };
  }

  /**
   * 记录注入的元数据
   * 子类应该覆盖此方法来记录特定的元数据
   */
  protected recordMetadata(context: PipelineContext, injectedContent: string | null): void {
    // 默认记录基础信息
    context.metadata[`${this.name}Injected`] = !!injectedContent;
    if (injectedContent) {
      context.metadata[`${this.name}Length`] = injectedContent.length;
    }
  }

  /**
   * 合并上下文内容到现有消息
   * 用于某些需要将上下文合并到现有消息而不是创建新消息的场景
   */
  protected mergeContextToMessage(message: any, context: string): any {
    const currentContent = typeof message.content === 'string' 
      ? message.content 
      : JSON.stringify(message.content);
    
    return {
      ...message,
      content: `${context}\n\n${currentContent}`,
    };
  }

  /**
   * 验证注入的内容
   * 确保注入的内容符合预期
   */
  protected validateInjectedContent(content: string | null): boolean {
    if (!content) return true; // null content is valid (no injection)
    
    // 检查内容是否为空字符串
    if (content.trim().length === 0) {
      log('Warning: Empty content detected for injection');
      return false;
    }
    
    // 检查内容长度是否合理
    const maxLength = 100000; // 100K字符限制
    if (content.length > maxLength) {
      log(`Warning: Content too long for injection: ${content.length} chars`);
      return false;
    }
    
    return true;
  }

  /**
   * 获取现有的上下文消息
   * 用于检查是否已经存在相同类型的上下文
   */
  protected findExistingContextMessage(context: PipelineContext): any | null {
    // 默认实现：查找包含特定标记的系统消息
    const marker = this.getContextMarker();
    if (!marker) return null;
    
    return context.messages.find(msg => 
      msg.role === 'system' && 
      msg.content && 
      msg.content.includes(marker)
    );
  }

  /**
   * 获取上下文标记
   * 用于标识此提供者注入的内容
   */
  protected getContextMarker(): string | null {
    return null; // 子类可以覆盖以提供特定标记
  }

  /**
   * 格式化上下文内容
   * 提供统一的格式化方法
   */
  protected formatContext(title: string, content: string): string {
    return `## ${title}\n\n${content}`;
  }

  /**
   * 检查是否需要更新已存在的上下文
   */
  protected shouldUpdateExisting(existing: any, newContent: string): boolean {
    return existing.content !== newContent;
  }
}