import { BaseProvider } from '../base/BaseProvider';
import type { PipelineContext, ProcessorOptions, ChatMessage } from '../types';

/**
 * 系统角色注入器
 * 负责在消息列表开头注入系统角色消息
 */
export class SystemRoleInjector extends BaseProvider {
  readonly name = 'SystemRoleInjector';

  constructor(
    private systemRole: string,
    options: ProcessorOptions = {},
  ) {
    super(options);
  }

  protected async doProcess(context: PipelineContext): Promise<PipelineContext> {
    // 如果没有系统角色或系统角色为空，则直接返回
    if (this.isEmptyMessage(this.systemRole)) {
      log('系统角色为空，跳过注入');
      return this.markAsExecuted(context);
    }

    const clonedContext = this.cloneContext(context);

    // 检查是否已经存在系统消息
    const existingSystemMessage = clonedContext.messages.find(msg => msg.role === 'system');

    if (existingSystemMessage) {
      log('检测到现有系统消息，进行合并');
      
      // 合并系统角色内容
      existingSystemMessage.content = [existingSystemMessage.content, this.systemRole]
        .filter(Boolean)
        .join('\n\n');
      
      log(`系统消息合并完成，最终长度: ${existingSystemMessage.content.length}`);
    } else {
      // 创建新的系统消息
      const systemMessage: ChatMessage = {
        id: `system-${Date.now()}`,
        role: 'system',
        content: this.systemRole,
        createdAt: Date.now(),
      };

      // 插入到消息列表开头
      clonedContext.messages.unshift(systemMessage);
      log(`新系统消息已注入，消息长度: ${this.systemRole.length}`);
    }

    // 更新元数据
    clonedContext.metadata.systemRoleInjected = true;
    clonedContext.metadata.systemRoleLength = this.systemRole.length;

    return this.markAsExecuted(clonedContext);
  }

  /**
   * 设置新的系统角色
   */
  setSystemRole(systemRole: string): this {
    this.systemRole = systemRole;
    return this;
  }

  /**
   * 获取当前系统角色
   */
  getSystemRole(): string {
    return this.systemRole;
  }

  /**
   * 检查系统角色是否有效
   */
  isValidSystemRole(): boolean {
    return !this.isEmptyMessage(this.systemRole);
  }
}