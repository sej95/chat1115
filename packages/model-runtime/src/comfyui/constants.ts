/**
 * ComfyUI framework constants configuration (simplified) / ComfyUI 框架常量配置（简化版）
 * Unified management of hardcoded values with environment variable overrides / 统一管理硬编码值，支持环境变量覆盖
 * Architectural honesty: removed over-engineered dynamic selection and false component declarations / 架构诚实化：移除过度工程化的动态选择和虚假组件声明
 */
import { AgentRuntimeErrorType } from '../error';
import { AgentRuntimeError } from '../utils/createError';
import {
  SYSTEM_COMPONENTS,
  getAllComponentConfigs,
  getComponentConfig,
} from './config/systemComponents';

/**
 * Default configuration / 默认配置
 * 注意：BASE_URL不再处理环境变量，由构造函数统一处理优先级
 */
export const COMFYUI_DEFAULTS = {
  BASE_URL: 'http://localhost:8188',
  CONNECTION_TIMEOUT: 30_000,
  MAX_RETRIES: 3,
} as const;

/**
 * FLUX model configuration (simplified) / FLUX 模型配置（简化版）
 * Removed over-engineered dynamic T5 selection, maintain simple fixed configuration / 移除过度工程化的动态T5选择，保持简单固定配置
 */
export const FLUX_MODEL_CONFIG = {
  CLIP: {
    CLIP_L: 'clip_l.safetensors',
    // Maintain backward-compatible hardcoded interface / 保持向后兼容的硬编码接口
    T5XXL: 't5xxl_fp16.safetensors',
  },
  FILENAME_PREFIXES: {
    DEV: 'LobeChat/%year%-%month%-%day%/FLUX_Dev',
    KONTEXT: 'LobeChat/%year%-%month%-%day%/FLUX_Kontext',
    KREA: 'LobeChat/%year%-%month%-%day%/FLUX_Krea',
    SCHNELL: 'LobeChat/%year%-%month%-%day%/FLUX_Schnell',
  },
  VAE: {
    DEFAULT: 'ae.safetensors',
  },
} as const;

/**
 * 获取最优T5模型文件名 / Get Optimal T5 Model Filename
 *
 * @description 基于系统组件配置和优先级选择最优的T5模型
 * Selects optimal T5 model based on system component configuration and priority
 *
 * @param availableModels 服务器可用模型列表（可选）/ Optional list of available models on server
 * @returns {string} T5模型文件名 / T5 model filename
 * @throws {AgentRuntimeError} 当没有找到可用的T5模型时 / When no available T5 model is found
 */
export function getOptimalT5Model(availableModels?: string[]): string {
  // 获取所有T5组件并按优先级排序（优先级1最高）
  // Get all T5 components and sort by priority (priority 1 is highest)
  const t5Configs = getAllComponentConfigs({ type: 't5' });
  const t5Components = Object.keys(SYSTEM_COMPONENTS)
    .filter((name) => t5Configs.includes(SYSTEM_COMPONENTS[name]))
    .map((name) => ({ config: getComponentConfig(name)!, name }))
    .sort((a, b) => a.config.priority - b.config.priority);

  // 如果提供了可用模型列表，检查可用性
  // If available models list is provided, check availability
  if (availableModels !== undefined) {
    for (const { name } of t5Components) {
      if (availableModels.includes(name)) {
        return name;
      }
    }

    // 没找到可用的T5组件，抛出详细错误信息
    // No available T5 components found, throw detailed error
    throw AgentRuntimeError.createError(AgentRuntimeErrorType.ModelNotFound, {
      message: `No available T5 components found in server. Available: [${availableModels.join(', ')}], Required: [${t5Components.map((c) => c.name).join(', ')}]`,
    });
  }

  // 没有提供availableModels，返回优先级最高的（向后兼容）
  // No availableModels provided, return highest priority one (backward compatibility)
  return t5Components[0]?.name || FLUX_MODEL_CONFIG.CLIP.T5XXL;
}

/**
 * Default workflow node parameters / 工作流节点默认参数
 * Based on 2024 community best practices configuration / 基于 2024 年社区最佳实践配置
 */
export const WORKFLOW_DEFAULTS = {
  IMAGE: {
    BATCH_SIZE: 1,
    HEIGHT: 1024,
    WIDTH: 1024,
  },
  // FLUX Kontext specific configuration - image editing model / FLUX Kontext 特定配置 - 图像编辑模型
  KONTEXT: {
    CFG: 3.5, // Use guidance distillation, can use lower CFG / 使用 guidance distillation，可用较低 CFG
    STEPS: 28, // Image editing requires more steps to ensure quality / 图像编辑需要更多步数确保质量
  },

  // FLUX Krea specific configuration - photographic aesthetics optimization / FLUX Krea 特定配置 - 摄影美学优化
  KREA: {
    CFG: 3.5, // Photographic realism uses 3.5 or lower / 摄影真实感使用 3.5 或更低
    STEPS: 15, // Fast high-quality generation, 15 steps sufficient / 快速高质量生成，15 步足够
  },

  NOISE: {
    SEED: 0, // Use 0 as default, will be overridden by SDK's seed() function when needed
  },

  SAMPLING: {
    // FLUX Dev: CFG 3.5 for Distilled CFG, regular CFG should be set to 1 / FLUX Dev: CFG 3.5 用于 Distilled CFG，常规 CFG 应设为 1
    // More natural effects can use CFG 2, but 3.5 provides stronger prompt adherence / 更自然的效果可使用 CFG 2，但 3.5 提供更强的提示词遵循
    CFG: 3.5,
    DENOISE: 1,
    MAX_SHIFT: 1.15,
    SAMPLER: 'euler',
    SCHEDULER: 'simple',
    // FLUX Dev optimal steps range 20-30, 25 steps optimize faces, 30 steps refine clothing/hands / FLUX Dev 最佳步数范围 20-30，25 步优化面部，30 步完善服装/手部
    STEPS: 25,
  },

  // FLUX Schnell specific configuration / FLUX Schnell 特定配置
  SCHNELL: {
    CFG: 1, // Schnell should use CFG 1 / Schnell 应使用 CFG 1
    STEPS: 4, // Schnell recommended 1-4 steps, 4 steps optimal / Schnell 推荐 1-4 步，4 步最佳
  },
} as const;

/**
 * Style keywords configuration - organized by category for easy maintenance and extension / 风格关键词配置 - 按类别组织便于维护和扩展
 */
export const STYLE_KEYWORDS = {
  // Artists and platforms / 艺术家和平台
  ARTISTS: [
    'by greg rutkowski',
    'by artgerm',
    'trending on artstation',
    'concept art',
    'illustration',
    'artwork',
    'painting',
  ],

  // Art styles / 艺术风格
  ART_STYLES: [
    'photorealistic',
    'photo realistic',
    'realistic',
    'anime',
    'cartoon',
    'oil painting',
    'watercolor',
    'sketch',
    'digital art',
    '3d render',
    'pixel art',
    'manga',
    'cinematic',
  ],

  // Lighting effects / 光照效果
  LIGHTING: [
    'dramatic lighting',
    'soft lighting',
    'studio lighting',
    'golden hour',
    'neon lights',
    'rim lighting',
    'volumetric lighting',
    'natural lighting',
    'warm lighting',
    'cold lighting',
  ],

  // Photography terms / 摄影术语
  PHOTOGRAPHY: [
    'depth of field',
    'bokeh',
    'motion blur',
    'film grain',
    'macro',
    'wide angle',
    'telephoto',
    'portrait',
    'landscape',
    'close-up',
    'dof',
  ],

  // Quality descriptions / 质量描述
  QUALITY: [
    'high quality',
    'best quality',
    '4k',
    '8k',
    'ultra detailed',
    'highly detailed',
    'masterpiece',
    'professional',
    'sharp focus',
    'detailed',
    'intricate',
  ],

  // Rendering and effects / 渲染和效果
  RENDERING: [
    'octane render',
    'unreal engine',
    'ray tracing',
    'global illumination',
    'subsurface scattering',
    'bloom',
    'lens flare',
  ],
} as const;

/**
 * Get all style keywords - flattened array / 获取所有风格关键词 - 扁平化数组
 */
export const getAllStyleKeywords = (): readonly string[] => {
  return Object.values(STYLE_KEYWORDS).flat();
};

/**
 * Error type configuration / 错误类型配置
 */
export const COMFYUI_ERROR_TYPES = {
  CONNECTION_FAILED: 'ComfyUIConnectionFailed',
  EMPTY_RESULT: 'ComfyUIEmptyResult',
  INVALID_CREDENTIALS: 'ComfyUIInvalidCredentials',
  UPLOAD_FAILED: 'ComfyUIUploadFailed',
  WORKFLOW_FAILED: 'ComfyUIWorkflowFailed',
} as const;
