import debug from 'debug';
import { BaseProcessor } from '../base/BaseProcessor';
import type { PipelineContext, ProcessorOptions, ChatImageItem, ModelCapabilities } from '../types';

const log = debug('context-engine:processor:ImageContentProcessor');

/**
 * 图像内容处理器配置
 */
export interface ImageProcessorConfig {
  /** 模型能力检查器 */
  modelCapabilities?: ModelCapabilities;
  /** 是否转换本地 URL 为 base64 */
  convertLocalToBase64?: boolean;
  /** 图像质量设置 */
  imageQuality?: 'auto' | 'high' | 'low';
  /** 最大图像尺寸 */
  maxImageSize?: number;
}

/**
 * 用户消息内容部分类型
 */
export type UserMessageContentPart = 
  | { type: 'text'; text: string }
  | { type: 'image_url'; image_url: { url: string; detail?: 'auto' | 'high' | 'low' } };

/**
 * 图像内容处理器
 * 负责处理消息中的图像内容，转换格式以符合模型要求
 */
export class ImageContentProcessor extends BaseProcessor {
  readonly name = 'ImageContentProcessor';

  constructor(
    private config: ImageProcessorConfig = {},
    options: ProcessorOptions = {},
  ) {
    super(options);
  }

  protected async doProcess(context: PipelineContext): Promise<PipelineContext> {
    const clonedContext = this.cloneContext(context);
    
    const model = context.metadata.model;
    const provider = context.metadata.provider || 'openai';

    // Check if model supports vision functionality
    if (!this.isVisionSupported(model, provider)) {
      log('Model', model, 'does not support vision, skipping image processing');
      return this.markAsExecuted(clonedContext);
    }

    let processedCount = 0;
    let totalImagesProcessed = 0;

    // Process image content for each message
    for (let i = 0; i < clonedContext.messages.length; i++) {
      const message = clonedContext.messages[i];
      
      if (message.role === 'user' || message.role === 'assistant') {
        const processResult = await this.processMessageImages(message);
        
        if (processResult.hasChanges) {
          clonedContext.messages[i] = processResult.message;
          processedCount++;
          totalImagesProcessed += processResult.imageCount;
          
          log('Message', message.id, 'image content processed,', processResult.imageCount, 'images');
        }
      }
    }

    // Update metadata
    clonedContext.metadata.imageProcessing = {
      processedMessages: processedCount,
      totalImagesProcessed,
      visionSupported: true,
      imageQuality: this.config.imageQuality || 'auto',
    };

    log('Image processing completed,', processedCount, 'messages processed,', totalImagesProcessed, 'images');

    return this.markAsExecuted(clonedContext);
  }

  /**
   * 处理单条消息的图像
   */
  private async processMessageImages(message: any): Promise<{
    message: any;
    hasChanges: boolean;
    imageCount: number;
  }> {
    const imageList = message.imageList || [];
    const fileList = message.fileList || [];
    
    // 检查是否有图像需要处理
    if (imageList.length === 0 && fileList.length === 0) {
      return {
        message,
        hasChanges: false,
        imageCount: 0,
      };
    }

    try {
      // 处理图像列表
      const processedImageParts = await this.processImageList(imageList);
      
      // 构建新的消息内容
      const newContent = await this.buildMessageContent(message, processedImageParts);

      return {
        message: {
          ...message,
          content: newContent,
        },
        hasChanges: true,
        imageCount: processedImageParts.length,
      };
    } catch (error) {
      log.extend('error')(`处理消息 ${message.id} 图像时出错: ${error}`);
      return {
        message,
        hasChanges: false,
        imageCount: 0,
      };
    }
  }

  /**
   * 处理图像列表
   */
  private async processImageList(imageList: ChatImageItem[]): Promise<UserMessageContentPart[]> {
    const imageParts: UserMessageContentPart[] = [];

    for (const image of imageList) {
      try {
        const processedUrl = await this.processImageUrl(image.url);
        
        imageParts.push({
          type: 'image_url',
          image_url: {
            url: processedUrl,
            detail: this.config.imageQuality || 'auto',
          },
        });
      } catch (error) {
        log.extend('error')(`处理图像 ${image.id} 时出错: ${error}`);
        // 出错时使用原始 URL
        imageParts.push({
          type: 'image_url',
          image_url: {
            url: image.url,
            detail: this.config.imageQuality || 'auto',
          },
        });
      }
    }

    return imageParts;
  }

  /**
   * 处理图像 URL
   */
  private async processImageUrl(url: string): Promise<string> {
    // 检查是否是本地 URL
    if (this.isLocalUrl(url) && this.config.convertLocalToBase64) {
      return await this.convertToBase64(url);
    }

    // 检查是否需要 URL 处理
    if (this.needsUrlProcessing(url)) {
      return this.processUrl(url);
    }

    return url;
  }

  /**
   * 检查是否是本地 URL
   */
  private isLocalUrl(url: string): boolean {
    if (!url) return false;
    
    // 检查常见的本地 URL 模式
    const localPatterns = [
      /^file:\/\//,
      /^blob:/,
      /^\/[^\/]/,
      /^\.\//, 
      /^\.\.\//, 
      /^localhost/,
      /^127\.0\.0\.1/,
      /^192\.168\./,
      /^10\./,
      /^172\.(1[6-9]|2[0-9]|3[01])\./,
    ];

    return localPatterns.some(pattern => pattern.test(url));
  }

  /**
   * 转换为 base64
   */
  private async convertToBase64(url: string): Promise<string> {
    try {
      // 这里应该调用实际的图像转换服务
      // 模拟实现
      log(`转换图像为 base64: ${url}`);
      
      // 实际实现中，这里会读取图像文件并转换为 base64
      // const { base64, mimeType } = await imageUrlToBase64(url);
      // return `data:${mimeType};base64,${base64}`;
      
      return url; // 临时返回原始 URL
    } catch (error) {
      log.extend('error')(`转换 base64 失败: ${error}`);
      return url;
    }
  }

  /**
   * 检查 URL 是否需要处理
   */
  private needsUrlProcessing(url: string): boolean {
    // 检查是否是数据 URL
    return !url.startsWith('data:');
  }

  /**
   * 处理 URL
   */
  private processUrl(url: string): string {
    // 这里可以添加 URL 预处理逻辑，如添加代理、认证等
    return url;
  }

  /**
   * 构建消息内容
   */
  private async buildMessageContent(
    message: any,
    imageParts: UserMessageContentPart[],
  ): Promise<UserMessageContentPart[] | string> {
    // 如果没有图像和文件，返回原始内容
    if (imageParts.length === 0 && (!message.fileList || message.fileList.length === 0)) {
      return message.content;
    }

    const contentParts: UserMessageContentPart[] = [];

    // 添加文本内容
    if (message.content && message.content.trim()) {
      contentParts.push({
        type: 'text',
        text: message.content.trim(),
      });
    }

    // 添加图像内容
    contentParts.push(...imageParts);

    return contentParts;
  }

  /**
   * 检查模型是否支持视觉
   */
  private isVisionSupported(model: string, provider: string): boolean {
    if (this.config.modelCapabilities) {
      return this.config.modelCapabilities.supportsVision;
    }

    // 默认的视觉模型检查
    const visionModels = [
      'gpt-4-vision-preview',
      'gpt-4o',
      'gpt-4o-mini',
      'claude-3-opus',
      'claude-3-sonnet',
      'claude-3-haiku',
      'claude-3-5-sonnet',
      'gemini-pro-vision',
      'gemini-1.5-pro',
    ];

    return visionModels.some(visionModel => 
      model.toLowerCase().includes(visionModel.toLowerCase())
    );
  }

  /**
   * 设置模型能力
   */
  setModelCapabilities(capabilities: ModelCapabilities): this {
    this.config.modelCapabilities = capabilities;
    return this;
  }

  /**
   * 设置图像质量
   */
  setImageQuality(quality: 'auto' | 'high' | 'low'): this {
    this.config.imageQuality = quality;
    return this;
  }

  /**
   * 启用/禁用本地 URL 转换
   */
  setConvertLocalToBase64(convert: boolean): this {
    this.config.convertLocalToBase64 = convert;
    return this;
  }

  /**
   * 获取当前配置
   */
  getConfig(): ImageProcessorConfig {
    return { ...this.config };
  }

  /**
   * 检查消息是否包含图像
   */
  static hasImages(message: any): boolean {
    return (message.imageList && message.imageList.length > 0) ||
           (message.fileList && message.fileList.some((file: string) => 
             /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(file)));
  }

  /**
   * 统计消息中的图像数量
   */
  static countImages(message: any): number {
    const imageCount = message.imageList?.length || 0;
    const fileImageCount = message.fileList?.filter((file: string) => 
      /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(file)).length || 0;
    
    return imageCount + fileImageCount;
  }
}