import debug from 'debug';
import { BaseProcessor } from '../base/BaseProcessor';
import type { PipelineContext, ProcessorOptions, ModelCapabilities, MessageToolCall } from '../types';

const log = debug('context-engine:processor:MessageRoleTransformer');

/**
 * OpenAI 聊天消息类型
 */
export interface OpenAIChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string | any[];
  name?: string;
  tool_calls?: MessageToolCall[];
  tool_call_id?: string;
}

/**
 * 消息角色转换器
 * 负责将内部消息格式转换为符合各个 AI 提供商要求的格式
 */
export class MessageRoleTransformer extends BaseProcessor {
  readonly name = 'MessageRoleTransformer';

  constructor(
    private modelCapabilities: ModelCapabilities,
    options: ProcessorOptions = {},
  ) {
    super(options);
  }

  protected async doProcess(context: PipelineContext): Promise<PipelineContext> {
    const clonedContext = this.cloneContext(context);
    
    // Transform all messages
    const transformedMessages = await Promise.all(
      clonedContext.messages.map(message => this.transformMessage(message))
    );

    clonedContext.messages = transformedMessages.filter(Boolean);

    // Update metadata
    clonedContext.metadata.messageTransformation = {
      originalCount: clonedContext.messages.length,
      transformedCount: transformedMessages.length,
      supportsFunctionCall: this.modelCapabilities.supportsFunctionCall,
      supportsVision: this.modelCapabilities.supportsVision,
    };

    log('Message role transformation completed,', transformedMessages.length, 'messages processed');

    return this.markAsExecuted(clonedContext);
  }

  /**
   * 转换单条消息
   */
  private async transformMessage(message: any): Promise<OpenAIChatMessage | null> {
    const supportTools = this.modelCapabilities.supportsFunctionCall;

    switch (message.role) {
      case 'user':
        return await this.transformUserMessage(message);
      
      case 'assistant':
        return this.transformAssistantMessage(message, supportTools);
      
      case 'tool':
        return this.transformToolMessage(message, supportTools);
      
      case 'system':
      default:
        return {
          role: message.role as any,
          content: message.content,
        };
    }
  }

  /**
   * 转换用户消息
   */
  private async transformUserMessage(message: any): Promise<OpenAIChatMessage> {
    // 处理包含图像或文件的复合内容
    if (this.hasMultiModalContent(message)) {
      const content = await this.buildMultiModalContent(message);
      return {
        role: 'user',
        content,
      };
    }

    // 简单文本消息
    return {
      role: 'user',
      content: message.content,
    };
  }

  /**
   * 转换助手消息
   */
  private transformAssistantMessage(message: any, supportTools: boolean): OpenAIChatMessage {
    const transformed: OpenAIChatMessage = {
      role: 'assistant',
      content: this.buildAssistantContent(message),
    };

    // 添加工具调用
    if (supportTools && message.tools && message.tools.length > 0) {
      transformed.tool_calls = message.tools.map((tool: any) => ({
        id: tool.id,
        type: 'function' as const,
        function: {
          name: this.generateToolName(tool),
          arguments: tool.arguments || '{}',
        },
      }));
    }

    return transformed;
  }

  /**
   * 转换工具消息
   */
  private transformToolMessage(message: any, supportTools: boolean): OpenAIChatMessage | null {
    if (!supportTools) {
      // 如果不支持工具，转换为用户消息
      return {
        role: 'user',
        content: message.content,
      };
    }

    return {
      role: 'tool',
      content: message.content,
      tool_call_id: message.tool_call_id,
      name: message.plugin ? this.generateToolName(message.plugin) : undefined,
    };
  }

  /**
   * 检查是否有多模态内容
   */
  private hasMultiModalContent(message: any): boolean {
    return (message.imageList && message.imageList.length > 0) ||
           (message.fileList && message.fileList.length > 0);
  }

  /**
   * 构建多模态内容
   */
  private async buildMultiModalContent(message: any): Promise<any[]> {
    const contentParts: any[] = [];

    // 添加文本内容
    if (message.content && message.content.trim()) {
      contentParts.push({
        type: 'text',
        text: message.content.trim(),
      });
    }

    // 添加图像内容
    if (message.imageList && message.imageList.length > 0 && this.modelCapabilities.supportsVision) {
      for (const image of message.imageList) {
        contentParts.push({
          type: 'image_url',
          image_url: {
            url: image.url,
            detail: 'auto',
          },
        });
      }
    }

    // 如果没有内容部分，返回空字符串
    if (contentParts.length === 0) {
      return [{ type: 'text', text: '' }];
    }

    return contentParts;
  }

  /**
   * 构建助手内容
   */
  private buildAssistantContent(message: any): any {
    // 处理推理内容
    if (message.reasoning && message.reasoning.signature) {
      return [
        {
          type: 'thinking',
          thinking: message.reasoning.content,
          signature: message.reasoning.signature,
        },
        {
          type: 'text',
          text: message.content,
        },
      ];
    }

    // 处理图像内容
    if (message.imageList && message.imageList.length > 0) {
      const contentParts = [];
      
      if (message.content) {
        contentParts.push({
          type: 'text',
          text: message.content,
        });
      }

      message.imageList.forEach((image: any) => {
        contentParts.push({
          type: 'image_url',
          image_url: {
            url: image.url,
            detail: 'auto',
          },
        });
      });

      return contentParts;
    }

    // 简单文本内容
    return message.content || '';
  }

  /**
   * 生成工具名称
   */
  private generateToolName(tool: any): string {
    if (!tool) return 'unknown_tool';
    
    const parts = [];
    
    if (tool.identifier) {
      parts.push(tool.identifier);
    }
    
    if (tool.apiName) {
      parts.push(tool.apiName);
    }
    
    if (tool.type && tool.type !== 'builtin') {
      parts.push(tool.type);
    }

    return parts.join('__') || 'unknown_tool';
  }

  /**
   * 设置模型能力
   */
  setModelCapabilities(capabilities: ModelCapabilities): this {
    this.modelCapabilities = capabilities;
    return this;
  }

  /**
   * 获取模型能力
   */
  getModelCapabilities(): ModelCapabilities {
    return { ...this.modelCapabilities };
  }

  /**
   * 验证转换后的消息
   */
  validateTransformedMessage(message: OpenAIChatMessage): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    // 检查必需字段
    if (!message.role) {
      errors.push('消息缺少角色字段');
    }

    if (message.content === undefined || message.content === null) {
      errors.push('消息缺少内容字段');
    }

    // 检查角色特定的要求
    if (message.role === 'tool') {
      if (!message.tool_call_id) {
        errors.push('工具消息缺少 tool_call_id');
      }
    }

    if (message.role === 'assistant' && message.tool_calls) {
      message.tool_calls.forEach((toolCall, index) => {
        if (!toolCall.id) {
          errors.push(`工具调用 ${index} 缺少 ID`);
        }
        if (!toolCall.function?.name) {
          errors.push(`工具调用 ${index} 缺少函数名`);
        }
      });
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}