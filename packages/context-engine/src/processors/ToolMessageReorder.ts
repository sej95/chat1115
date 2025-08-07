import debug from 'debug';
import { BaseProcessor } from '../base/BaseProcessor';
import type { PipelineContext, ProcessorOptions } from '../types';

const log = debug('context-engine:processor:ToolMessageReorder');

/**
 * 工具消息重排序器
 * 负责确保工具调用消息按正确顺序排列
 */
export class ToolMessageReorder extends BaseProcessor {
  readonly name = 'ToolMessageReorder';

  constructor(options: ProcessorOptions = {}) {
    super(options);
  }

  protected async doProcess(context: PipelineContext): Promise<PipelineContext> {
    const clonedContext = this.cloneContext(context);
    
    // 重新排序消息
    const reorderedMessages = this.reorderToolMessages(clonedContext.messages);
    
    const originalCount = clonedContext.messages.length;
    const reorderedCount = reorderedMessages.length;
    
    clonedContext.messages = reorderedMessages;

    // 更新元数据
    clonedContext.metadata.toolMessageReorder = {
      originalCount,
      reorderedCount,
      removedInvalidTools: originalCount - reorderedCount,
    };

    if (originalCount !== reorderedCount) {
      log('Tool message reordering completed, removed', originalCount - reorderedCount, 'invalid tool messages');
    } else {
      log('Tool message reordering completed, message order optimized');
    }

    return this.markAsExecuted(clonedContext);
  }

  /**
   * 重新排序工具消息
   */
  private reorderToolMessages(messages: any[]): any[] {
    // 1. 先收集所有 assistant 消息中的有效 tool_call_id
    const validToolCallIds = new Set<string>();
    messages.forEach((message) => {
      if (message.role === 'assistant' && message.tools) {
        message.tools.forEach((tool: any) => {
          if (tool.id) {
            validToolCallIds.add(tool.id);
          }
        });
      }
    });

    // 2. 收集所有有效的 tool 消息
    const toolMessages: Record<string, any> = {};
    messages.forEach((message) => {
      if (
        message.role === 'tool' &&
        message.tool_call_id &&
        validToolCallIds.has(message.tool_call_id)
      ) {
        toolMessages[message.tool_call_id] = message;
      }
    });

    // 3. 重新排序消息
    const reorderedMessages: any[] = [];
    messages.forEach((message) => {
      // 跳过无效的 tool 消息
      if (
        message.role === 'tool' &&
        (!message.tool_call_id || !validToolCallIds.has(message.tool_call_id))
      ) {
        log('Skipping invalid tool message:', message.id);
        return;
      }

      // 检查是否已经添加过该 tool 消息
      const hasPushed = reorderedMessages.some(
        (m) => !!message.tool_call_id && m.tool_call_id === message.tool_call_id,
      );

      if (hasPushed) return;

      reorderedMessages.push(message);

      // 如果是 assistant 消息且有 tools，添加对应的 tool 消息
      if (message.role === 'assistant' && message.tools) {
        message.tools.forEach((tool: any) => {
          const correspondingToolMessage = toolMessages[tool.id];
          if (correspondingToolMessage) {
            reorderedMessages.push(correspondingToolMessage);
            delete toolMessages[tool.id];
          }
        });
      }
    });

    return reorderedMessages;
  }

  /**
   * 验证工具消息的完整性
   */
  validateToolMessages(messages: any[]): {
    valid: boolean;
    issues: string[];
  } {
    const issues: string[] = [];
    const toolCallIds = new Set<string>();
    const toolResponseIds = new Set<string>();

    // 收集所有工具调用和响应
    messages.forEach(message => {
      if (message.role === 'assistant' && message.tools) {
        message.tools.forEach((tool: any) => {
          if (tool.id) {
            toolCallIds.add(tool.id);
          }
        });
      }
      
      if (message.role === 'tool' && message.tool_call_id) {
        toolResponseIds.add(message.tool_call_id);
      }
    });

    // 检查孤立的工具调用
    toolCallIds.forEach(id => {
      if (!toolResponseIds.has(id)) {
        issues.push(`工具调用 ${id} 没有对应的响应`);
      }
    });

    // 检查孤立的工具响应
    toolResponseIds.forEach(id => {
      if (!toolCallIds.has(id)) {
        issues.push(`工具响应 ${id} 没有对应的调用`);
      }
    });

    return {
      valid: issues.length === 0,
      issues,
    };
  }

  /**
   * 获取工具消息统计
   */
  static getToolStats(messages: any[]) {
    const stats = {
      toolCalls: 0,
      toolResponses: 0,
      assistantWithTools: 0,
      orphanedCalls: 0,
      orphanedResponses: 0,
    };

    const callIds = new Set<string>();
    const responseIds = new Set<string>();

    messages.forEach(message => {
      if (message.role === 'assistant' && message.tools) {
        stats.assistantWithTools++;
        message.tools.forEach((tool: any) => {
          if (tool.id) {
            stats.toolCalls++;
            callIds.add(tool.id);
          }
        });
      }
      
      if (message.role === 'tool' && message.tool_call_id) {
        stats.toolResponses++;
        responseIds.add(message.tool_call_id);
      }
    });

    // 计算孤立消息
    stats.orphanedCalls = stats.toolCalls - responseIds.size;
    stats.orphanedResponses = stats.toolResponses - callIds.size;

    return stats;
  }
}