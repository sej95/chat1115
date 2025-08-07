import debug from 'debug';
import { BaseProvider } from '../base/BaseProvider';
import type { PipelineContext, ProcessorOptions, ChatMessage } from '../types';

const log = debug('context-engine:processor:BuiltinSystemRoleInjector');

/**
 * 内置系统角色注入器配置
 */
export interface BuiltinSystemRoleConfig {
  /** 历史摘要内容 */
  historySummary?: string;
  /** 插件系统角色提示 */
  plugins?: string;
  /** 欢迎消息系统角色 */
  welcome?: string;
  /** 自定义系统角色映射 */
  customRoles?: Record<string, string>;
}

/**
 * 内置系统角色注入器
 * 负责注入各种预定义的系统角色，如工具使用提示、历史摘要、欢迎消息等
 */
export class BuiltinSystemRoleInjector extends BaseProvider {
  readonly name = 'BuiltinSystemRoleInjector';

  constructor(
    private config: BuiltinSystemRoleConfig = {},
    options: ProcessorOptions = {},
  ) {
    super(options);
  }

  protected async doProcess(context: PipelineContext): Promise<PipelineContext> {
    const clonedContext = this.cloneContext(context);
    
    // Collect system role content that needs injection
    const systemRoleParts = this.collectSystemRoles(context);
    
    if (systemRoleParts.length === 0) {
      log('没有内置系统角色需要注入');
      return this.markAsExecuted(clonedContext);
    }

    // 合并所有系统角色内容
    const combinedSystemRole = systemRoleParts.join('\n\n');
    
    // 查找现有的系统消息
    const existingSystemMessage = clonedContext.messages.find(msg => msg.role === 'system');
    
    if (existingSystemMessage) {
      // 合并到现有系统消息
      log('检测到现有系统消息，进行合并');
      existingSystemMessage.content = [existingSystemMessage.content, combinedSystemRole]
        .filter(Boolean)
        .join('\n\n');
        
      log(`系统消息合并完成，最终长度: ${existingSystemMessage.content.length}`);
    } else {
      // 创建新的系统消息
      const systemMessage: ChatMessage = {
        id: `builtin-system-${Date.now()}`,
        role: 'system',
        content: combinedSystemRole,
        createdAt: Date.now(),
      };

      clonedContext.messages.unshift(systemMessage);
      log(`新系统消息已注入，内容长度: ${combinedSystemRole.length}`);
    }

    // 更新元数据
    clonedContext.metadata.builtinSystemRoles = {
      historySummary: !!this.config.historySummary,
      plugins: !!this.config.plugins,
      welcome: !!this.config.welcome,
      customRoles: Object.keys(this.config.customRoles || {}),
      totalLength: combinedSystemRole.length,
    };

    return this.markAsExecuted(clonedContext);
  }

  /**
   * 收集需要注入的系统角色内容
   */
  private collectSystemRoles(context: PipelineContext): string[] {
    const parts: string[] = [];

    // 1. 历史摘要系统角色
    if (this.config.historySummary) {
      parts.push(this.buildHistorySummaryRole(this.config.historySummary));
      log('添加历史摘要系统角色');
    }

    // 2. 插件系统角色
    if (this.config.plugins) {
      parts.push(this.buildPluginsRole(this.config.plugins));
      log('添加插件系统角色');
    }

    // 3. 欢迎消息系统角色
    if (this.config.welcome) {
      parts.push(this.buildWelcomeRole(this.config.welcome));
      log('添加欢迎消息系统角色');
    }

    // 4. 自定义系统角色
    if (this.config.customRoles) {
      Object.entries(this.config.customRoles).forEach(([name, content]) => {
        if (content && content.trim()) {
          parts.push(this.buildCustomRole(name, content));
          log(`添加自定义系统角色: ${name}`);
        }
      });
    }

    return parts.filter(Boolean);
  }

  /**
   * 构建历史摘要系统角色
   */
  private buildHistorySummaryRole(historySummary: string): string {
    return `历史对话摘要:\n${historySummary.trim()}`;
  }

  /**
   * 构建插件系统角色
   */
  private buildPluginsRole(plugins: string): string {
    return `工具使用说明:\n${plugins.trim()}`;
  }

  /**
   * 构建欢迎消息系统角色
   */
  private buildWelcomeRole(welcome: string): string {
    return `欢迎指导:\n${welcome.trim()}`;
  }

  /**
   * 构建自定义系统角色
   */
  private buildCustomRole(name: string, content: string): string {
    return `${name}:\n${content.trim()}`;
  }

  /**
   * 设置历史摘要
   */
  setHistorySummary(historySummary: string): this {
    this.config.historySummary = historySummary;
    return this;
  }

  /**
   * 设置插件角色
   */
  setPluginsRole(plugins: string): this {
    this.config.plugins = plugins;
    return this;
  }

  /**
   * 设置欢迎角色
   */
  setWelcomeRole(welcome: string): this {
    this.config.welcome = welcome;
    return this;
  }

  /**
   * 添加自定义角色
   */
  addCustomRole(name: string, content: string): this {
    if (!this.config.customRoles) {
      this.config.customRoles = {};
    }
    this.config.customRoles[name] = content;
    return this;
  }

  /**
   * 移除自定义角色
   */
  removeCustomRole(name: string): this {
    if (this.config.customRoles) {
      delete this.config.customRoles[name];
    }
    return this;
  }

  /**
   * 清空所有配置
   */
  clearConfig(): this {
    this.config = {};
    return this;
  }

  /**
   * 获取当前配置
   */
  getConfig(): BuiltinSystemRoleConfig {
    return { ...this.config };
  }

  /**
   * 预览将要注入的系统角色内容
   */
  preview(): string {
    const parts = this.collectSystemRoles({} as PipelineContext);
    return parts.join('\n\n');
  }

  /**
   * 检查是否有任何系统角色需要注入
   */
  hasSystemRolesToInject(): boolean {
    return !!(
      this.config.historySummary ||
      this.config.plugins ||
      this.config.welcome ||
      (this.config.customRoles && Object.keys(this.config.customRoles).length > 0)
    );
  }
}