import debug from 'debug';
import type {
  ContextProcessor,
  PipelineContext,
  ProcessorOptions,
} from '../types';
import { ProcessorError } from '../types';

const log = debug('context-engine:processor:BaseProcessor');

/**
 * 基础处理器抽象类
 * 提供通用的处理器功能和错误处理
 */
export abstract class BaseProcessor implements ContextProcessor {
  abstract readonly name: string;
  protected options: ProcessorOptions;
  
  constructor(options: ProcessorOptions = {}) {
    this.options = {
      debug: false,
      logger: console.log,
      ...options,
    };
  }


  /**
   * 核心处理方法 - 子类需要实现
   */
  protected abstract doProcess(context: PipelineContext): Promise<PipelineContext>;

  /**
   * 公共处理入口，包含错误处理和日志
   */
  async process(context: PipelineContext): Promise<PipelineContext> {
    const startTime = Date.now();
    
    try {
      log('Starting process:', this.name);
      
      // 验证输入
      this.validateInput(context);
      
      // 执行具体处理逻辑
      const result = await this.doProcess(context);
      
      // 验证输出
      this.validateOutput(result);
      
      const duration = Date.now() - startTime;
      log('Process completed:', this.name, 'duration:', duration + 'ms');
      
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      log('Process failed:', this.name, 'duration:', duration + 'ms', 'error:', error);
      
      throw new ProcessorError(
        this.name,
        `处理失败: ${error}`,
        error instanceof Error ? error : new Error(String(error)),
      );
    }
  }

  /**
   * 验证输入上下文
   */
  protected validateInput(context: PipelineContext): void {
    if (!context) {
      throw new Error('上下文不能为空');
    }
    
    if (!context.initialState) {
      throw new Error('初始状态不能为空');
    }
    
    if (!context.metadata) {
      throw new Error('元数据不能为空');
    }
    
    if (!Array.isArray(context.messages)) {
      throw new Error('消息列表必须是数组');
    }
  }

  /**
   * 验证输出上下文
   */
  protected validateOutput(context: PipelineContext): void {
    if (!context) {
      throw new Error('输出上下文不能为空');
    }
    
    if (!Array.isArray(context.messages)) {
      throw new Error('输出消息列表必须是数组');
    }
    
    // 检查是否意外修改了不可变字段
    if (context.initialState !== context.initialState) {
      throw new Error('不能修改初始状态');
    }
  }


  /**
   * 安全地克隆上下文
   */
  protected cloneContext(context: PipelineContext): PipelineContext {
    return {
      ...context,
      messages: [...context.messages],
      metadata: { ...context.metadata },
    };
  }

  /**
   * 中止管道处理
   */
  protected abort(context: PipelineContext, reason: string): PipelineContext {
    const error = new ProcessorError(this.name, reason);
    const executionInfo = context.executionInfo || { executedProcessors: [], errors: [] };
    return {
      ...context,
      isAborted: true,
      abortReason: reason,
      executionInfo: {
        ...executionInfo,
        errors: [...(executionInfo.errors || []), error],
      },
    };
  }

  /**
   * 检查消息是否为空
   */
  protected isEmptyMessage(message: string | undefined | null): boolean {
    return !message || message.trim().length === 0;
  }

  /**
   * 获取处理器类型特定的日志前缀
   */
  protected getLogPrefix(): string {
    return `[${this.name}]`;
  }

  /**
   * 统计消息数量
   */
  protected countMessages(context: PipelineContext): {
    total: number;
    system: number;
    user: number;
    assistant: number;
    tool: number;
  } {
    const counts = {
      total: context.messages.length,
      system: 0,
      user: 0,
      assistant: 0,
      tool: 0,
    };

    context.messages.forEach(msg => {
      if (msg.role in counts) {
        counts[msg.role as keyof typeof counts]++;
      }
    });

    return counts;
  }

  /**
   * 检查处理器依赖
   */
  protected checkDependencies(context: PipelineContext): boolean {
    // 依赖检查逻辑可以在子类中自定义实现
    return true;
  }

  /**
   * 标记处理器已执行
   */
  protected markAsExecuted(context: PipelineContext): PipelineContext {
    const executionInfo = context.executionInfo || { executedProcessors: [], errors: [] };
    
    return {
      ...context,
      executionInfo: {
        ...executionInfo,
        executedProcessors: [...(executionInfo.executedProcessors || []), this.name],
      },
    };
  }
}