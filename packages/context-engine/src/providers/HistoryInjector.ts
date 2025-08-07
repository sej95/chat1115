import { BaseProvider } from '../base/BaseProvider';
import type { PipelineContext, ProcessorOptions } from '../types';

/**
 * 历史消息注入器
 * 负责将 AgentState 中的历史消息注入到当前管道上下文中
 */
export class HistoryInjector extends BaseProvider {
  readonly name = 'HistoryInjector';

  constructor(options: ProcessorOptions = {}) {
    super(options);
  }

  protected async doProcess(context: PipelineContext): Promise<PipelineContext> {
    const clonedContext = this.cloneContext(context);
    
    // 获取历史消息
    const historyMessages = context.initialState.messages || [];
    
    if (historyMessages.length === 0) {
      log('没有历史消息需要注入');
      return this.markAsExecuted(clonedContext);
    }

    // 过滤和验证历史消息
    const validMessages = historyMessages.filter(msg => {
      // 基本验证
      if (!msg.id || !msg.role || msg.content === undefined) {
        log.extend('warn')(`跳过无效消息: ${JSON.stringify(msg)}`);
        return false;
      }
      return true;
    });

    if (validMessages.length === 0) {
      log.extend('warn')('没有有效的历史消息需要注入');
      return this.markAsExecuted(clonedContext);
    }

    // 按时间排序（如果有创建时间）
    validMessages.sort((a, b) => {
      const timeA = a.createdAt || 0;
      const timeB = b.createdAt || 0;
      return timeA - timeB;
    });

    // 注入历史消息
    clonedContext.messages.push(...validMessages);

    // 更新元数据
    clonedContext.metadata.historyMessagesCount = validMessages.length;
    clonedContext.metadata.totalHistoryLength = validMessages.reduce(
      (total, msg) => total + (msg.content?.length || 0), 
      0
    );

    log(`历史消息注入完成，共注入 ${validMessages.length} 条消息`);

    // 统计不同类型消息数量
    const counts = {
      system: 0,
      user: 0,
      assistant: 0,
      tool: 0,
      other: 0,
    };

    validMessages.forEach(msg => {
      if (msg.role in counts) {
        counts[msg.role as keyof typeof counts]++;
      } else {
        counts.other++;
      }
    });

    log(`消息类型分布: ${JSON.stringify(counts)}`);
    clonedContext.metadata.historyMessageTypes = counts;

    return this.markAsExecuted(clonedContext);
  }

  /**
   * 验证消息格式
   */
  private validateMessage(msg: any): boolean {
    if (!msg || typeof msg !== 'object') return false;
    if (!msg.id || typeof msg.id !== 'string') return false;
    if (!msg.role || typeof msg.role !== 'string') return false;
    if (msg.content === undefined || msg.content === null) return false;
    
    // 验证角色类型
    const validRoles = ['system', 'user', 'assistant', 'tool'];
    if (!validRoles.includes(msg.role)) {
      log.extend('warn')(`无效的消息角色: ${msg.role}`);
      return false;
    }

    return true;
  }

  /**
   * 获取历史消息统计信息
   */
  static getHistoryStats(context: PipelineContext) {
    return {
      total: context.metadata.historyMessagesCount || 0,
      totalLength: context.metadata.totalHistoryLength || 0,
      types: context.metadata.historyMessageTypes || {},
    };
  }
}