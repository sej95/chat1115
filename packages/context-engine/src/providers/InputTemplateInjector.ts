import { template } from 'lodash-es';
import { BaseProvider } from '../base/BaseProvider';
import type { PipelineContext, ProcessorOptions } from '../types';

/**
 * 输入模板注入器
 * 负责对用户输入消息应用模板转换
 */
export class InputTemplateInjector extends BaseProvider {
  readonly name = 'InputTemplateInjector';

  constructor(
    private inputTemplate?: string,
    options: ProcessorOptions = {},
  ) {
    super(options);
  }

  protected async doProcess(context: PipelineContext): Promise<PipelineContext> {
    const clonedContext = this.cloneContext(context);
    
    // 如果没有输入模板，直接返回
    if (!this.inputTemplate || this.inputTemplate.trim() === '') {
      log('没有输入模板需要应用');
      return this.markAsExecuted(clonedContext);
    }

    let processedCount = 0;
    let errorCount = 0;

    try {
      // 编译模板
      const compiledTemplate = template(this.inputTemplate, {
        interpolate: /\{\{\s*(text)\s*\}\}/g, // 支持 {{ text }} 格式
      });

      // 处理所有用户消息
      clonedContext.messages = clonedContext.messages.map(message => {
        if (message.role !== 'user') {
          return message;
        }

        try {
          const originalContent = message.content;
          
          // 应用模板转换
          const transformedContent = compiledTemplate({ text: originalContent });
          
          if (transformedContent !== originalContent) {
            processedCount++;
            log(`用户消息 ${message.id} 已应用输入模板`);
            
            return {
              ...message,
              content: transformedContent,
            };
          }

          return message;
        } catch (error) {
          errorCount++;
          log.extend('error')(`处理用户消息 ${message.id} 输入模板时出错: ${error}`);
          return message;
        }
      });

      // 更新元数据
      clonedContext.metadata.inputTemplateApplied = processedCount;
      clonedContext.metadata.inputTemplateErrors = errorCount;
      clonedContext.metadata.inputTemplate = this.inputTemplate;

      log(`输入模板处理完成，成功处理 ${processedCount} 条用户消息，错误 ${errorCount} 条`);

    } catch (error) {
      log.extend('error')(`编译输入模板时出错: ${error}`);
      // 模板编译错误时，返回原始上下文
      clonedContext.metadata.inputTemplateErrors = 1;
      clonedContext.metadata.inputTemplateError = String(error);
    }

    return this.markAsExecuted(clonedContext);
  }

  /**
   * 设置输入模板
   */
  setInputTemplate(inputTemplate: string): this {
    this.inputTemplate = inputTemplate;
    return this;
  }

  /**
   * 获取当前输入模板
   */
  getInputTemplate(): string | undefined {
    return this.inputTemplate;
  }

  /**
   * 清空输入模板
   */
  clearInputTemplate(): this {
    this.inputTemplate = undefined;
    return this;
  }

  /**
   * 验证输入模板
   */
  validateTemplate(): { valid: boolean; error?: string } {
    if (!this.inputTemplate) {
      return { valid: true };
    }

    try {
      template(this.inputTemplate, {
        interpolate: /\{\{\s*(text)\s*\}\}/g,
      });
      return { valid: true };
    } catch (error) {
      return {
        valid: false,
        error: String(error),
      };
    }
  }

  /**
   * 预览模板转换结果
   */
  preview(text: string): { original: string; transformed: string; hasChanges: boolean; error?: string } {
    if (!this.inputTemplate) {
      return {
        original: text,
        transformed: text,
        hasChanges: false,
      };
    }

    try {
      const compiledTemplate = template(this.inputTemplate, {
        interpolate: /\{\{\s*(text)\s*\}\}/g,
      });

      const transformed = compiledTemplate({ text });

      return {
        original: text,
        transformed,
        hasChanges: transformed !== text,
      };
    } catch (error) {
      return {
        original: text,
        transformed: text,
        hasChanges: false,
        error: String(error),
      };
    }
  }

  /**
   * 检查模板是否包含必要的占位符
   */
  hasTextPlaceholder(): boolean {
    if (!this.inputTemplate) return false;
    return /\{\{\s*text\s*\}\}/.test(this.inputTemplate);
  }

  /**
   * 获取模板中的所有变量
   */
  getTemplateVariables(): string[] {
    if (!this.inputTemplate) return [];

    const variables: string[] = [];
    const regex = /\{\{\s*(\w+)\s*\}\}/g;
    let match;

    while ((match = regex.exec(this.inputTemplate)) !== null) {
      variables.push(match[1]);
    }

    return [...new Set(variables)];
  }

  /**
   * 生成默认模板示例
   */
  static getTemplateExamples(): Record<string, string> {
    return {
      '基本包装': '请回答以下问题：{{ text }}',
      '正式语调': '请您详细解答以下问题：{{ text }}。谢谢！',
      '简洁回复': '{{ text }}（请简洁回答）',
      '专业咨询': '作为专业顾问，请针对以下问题提供建议：{{ text }}',
      '教学模式': '请用教学的方式解释：{{ text }}',
      '批判思维': '请批判性地分析以下观点：{{ text }}',
    };
  }

  /**
   * 从示例中设置模板
   */
  setTemplateFromExample(exampleName: string): boolean {
    const examples = InputTemplateInjector.getTemplateExamples();
    if (exampleName in examples) {
      this.setInputTemplate(examples[exampleName]);
      return true;
    }
    return false;
  }

  /**
   * 检查是否有输入模板需要应用
   */
  hasTemplate(): boolean {
    return !!this.inputTemplate && this.inputTemplate.trim() !== '';
  }
}