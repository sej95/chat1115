import { ContextPipeline } from '../pipeline';
import { 
  SystemRoleInjector,
  HistoryInjector,
  HistoryTruncator,
  ModelCapabilityValidator,
  TokenBasedTruncator,
} from '../processors';
import type { ModelCapabilities, TokenCounter, ProcessorOptions } from '../types';

/**
 * 管道工厂配置
 */
export interface PipelineFactoryConfig {
  /** 系统角色 */
  systemRole?: string;
  /** 模型能力 */
  modelCapabilities?: ModelCapabilities;
  /** Token 计数器 */
  tokenCounter?: TokenCounter;
  /** 历史消息保留数量 */
  historyCount?: number;
  /** 最大 Token 数 */
  maxTokens?: number;
  /** 处理器选项 */
  processorOptions?: ProcessorOptions;
}

/**
 * 创建默认管道
 * 包含基本的注入和截断功能
 */
export function createDefaultPipeline(config: PipelineFactoryConfig = {}): ContextPipeline {
  const processors = [];

  // 1. 系统角色注入
  if (config.systemRole) {
    processors.push(new SystemRoleInjector(config.systemRole, config.processorOptions));
  }

  // 2. 历史消息注入
  processors.push(new HistoryInjector(config.processorOptions));

  // 3. 历史截断
  if (config.historyCount !== undefined) {
    processors.push(new HistoryTruncator(
      { 
        keepLatestN: config.historyCount,
        tokenCounter: config.tokenCounter,
        maxTokens: config.maxTokens,
      },
      config.processorOptions,
    ));
  }

  // 4. 模型能力验证
  if (config.modelCapabilities) {
    processors.push(new ModelCapabilityValidator(
      config.modelCapabilities,
      { autoFix: true },
      config.processorOptions,
    ));
  }

  return new ContextPipeline(processors, config.processorOptions);
}

/**
 * 创建最小管道
 * 只包含最基本的功能
 */
export function createMinimalPipeline(config: PipelineFactoryConfig = {}): ContextPipeline {
  const processors = [];

  // 系统角色注入
  if (config.systemRole) {
    processors.push(new SystemRoleInjector(config.systemRole, config.processorOptions));
  }

  // 历史消息注入
  processors.push(new HistoryInjector(config.processorOptions));

  return new ContextPipeline(processors, config.processorOptions);
}

/**
 * 创建高级管道
 * 包含所有功能和优化
 */
export function createAdvancedPipeline(config: PipelineFactoryConfig = {}): ContextPipeline {
  const processors = [];

  // 1. 系统角色注入
  if (config.systemRole) {
    processors.push(new SystemRoleInjector(config.systemRole, config.processorOptions));
  }

  // 2. 历史消息注入
  processors.push(new HistoryInjector(config.processorOptions));

  // 3. 模型能力验证
  if (config.modelCapabilities) {
    processors.push(new ModelCapabilityValidator(
      config.modelCapabilities,
      { autoFix: true },
      config.processorOptions,
    ));
  }

  // 4. 历史截断
  if (config.historyCount !== undefined || config.maxTokens !== undefined) {
    processors.push(new HistoryTruncator(
      {
        keepLatestN: config.historyCount,
        maxTokens: config.maxTokens,
        tokenCounter: config.tokenCounter,
      },
      config.processorOptions,
    ));
  }

  // 5. Token 基础优化
  if (config.tokenCounter && config.maxTokens) {
    processors.push(new TokenBasedTruncator(
      config.tokenCounter,
      { maxTokens: config.maxTokens },
      config.processorOptions,
    ));
  }

  return new ContextPipeline(processors, config.processorOptions);
}

/**
 * 预设管道配置
 */
export const PRESET_PIPELINES = {
  /** 基础聊天管道 */
  BASIC_CHAT: {
    description: '基础聊天功能，适用于简单对话',
    factory: createMinimalPipeline,
  },
  
  /** 标准聊天管道 */
  STANDARD_CHAT: {
    description: '标准聊天功能，包含历史管理和验证',
    factory: createDefaultPipeline,
  },
  
  /** 高级聊天管道 */
  ADVANCED_CHAT: {
    description: '高级聊天功能，包含所有优化和智能特性',
    factory: createAdvancedPipeline,
  },
} as const;

/**
 * 根据预设创建管道
 */
export function createPresetPipeline(
  preset: keyof typeof PRESET_PIPELINES,
  config: PipelineFactoryConfig = {},
): ContextPipeline {
  return PRESET_PIPELINES[preset].factory(config);
}