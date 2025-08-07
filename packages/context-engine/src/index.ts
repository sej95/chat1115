/**
 * @lobehub/context-engine
 *
 * A flexible and configurable context processing system for LobeChat
 */

// Core types and interfaces
export type * from './types';

// Base classes
export { BaseProcessor } from './base/BaseProcessor';
export { BaseProvider } from './base/BaseProvider';

// Pipeline
export { ContextPipeline } from './pipeline';

// Context Providers
export {
  SystemRoleInjector,
  HistoryInjector,
  PlaceholderVariableInjector,
  FilesContextInjector,
  BuiltinSystemRoleInjector,
  RAGContextInjector,
  InputTemplateInjector,
  SearchContextInjector,
} from './providers';

// Processors
export {
  // Transformers
  HistoryTruncator,
  ImageContentProcessor,
  ToolMessageReorder,
  MessageRoleTransformer,
  // Validators
  ModelCapabilityValidator,
  // Optimizers
  TokenBasedTruncator,
} from './processors';

// Utility functions
export {
  createAdvancedPipeline,
  createDefaultPipeline,
  createMinimalPipeline,
} from './utils/pipelineFactory';

// Constants
export { PipelineError, ProcessorError, ProcessorType } from './types';