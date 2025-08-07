import { describe, it, expect, beforeEach } from 'vitest';
import { BuiltinSystemRoleInjector } from '../BuiltinSystemRoleInjector';
import type { PipelineContext, ChatMessage } from '../../types';

describe('BuiltinSystemRoleInjector', () => {
  let injector: BuiltinSystemRoleInjector;
  let mockContext: PipelineContext;

  beforeEach(() => {
    injector = new BuiltinSystemRoleInjector();
    
    mockContext = {
      messages: [],
      metadata: {},
      initialState: {
        messages: [],
        agent: {},
        session: { id: 'test-session' },
      },
      executionInfo: {
        executedProcessors: [],
        totalExecutionTime: 0,
        errors: [],
      },
    };
  });

  describe('constructor and configuration', () => {
    it('should initialize with empty config by default', () => {
      expect(injector.getConfig()).toEqual({});
      expect(injector.hasSystemRolesToInject()).toBe(false);
    });

    it('should initialize with provided config', () => {
      const config = {
        historySummary: '历史摘要内容',
        plugins: '工具使用指导',
        welcome: '欢迎消息',
        customRoles: { role1: 'custom content' },
      };
      
      const configuredInjector = new BuiltinSystemRoleInjector(config);
      expect(configuredInjector.getConfig()).toEqual(config);
      expect(configuredInjector.hasSystemRolesToInject()).toBe(true);
    });
  });


  describe('doProcess method', () => {
    it('should return context unchanged when no system roles configured', async () => {
      const result = await injector.process(mockContext);
      
      expect(result.messages).toEqual(mockContext.messages);
      expect(result.executionInfo.executedProcessors).toContain('BuiltinSystemRoleInjector');
    });

    it('should create new system message when none exists', async () => {
      injector.setHistorySummary('历史对话摘要内容');
      
      const result = await injector.process(mockContext);
      
      expect(result.messages).toHaveLength(1);
      expect(result.messages[0].role).toBe('system');
      expect(result.messages[0].content).toContain('历史对话摘要:\n历史对话摘要内容');
      expect(result.metadata.builtinSystemRoles).toBeDefined();
    });

    it('should merge with existing system message', async () => {
      const systemMessage: ChatMessage = {
        id: 'existing-system',
        role: 'system',
        content: '现有系统角色',
        createdAt: Date.now(),
      };
      
      mockContext.messages = [systemMessage];
      injector.setPluginsRole('工具使用说明内容');
      
      const result = await injector.process(mockContext);
      
      expect(result.messages).toHaveLength(1);
      expect(result.messages[0].content).toContain('现有系统角色');
      expect(result.messages[0].content).toContain('工具使用说明:\n工具使用说明内容');
    });

    it('should inject all configured system roles', async () => {
      injector
        .setHistorySummary('历史摘要')
        .setPluginsRole('插件角色')
        .setWelcomeRole('欢迎消息')
        .addCustomRole('自定义角色', '自定义内容');
      
      const result = await injector.process(mockContext);
      
      expect(result.messages).toHaveLength(1);
      const systemContent = result.messages[0].content;
      
      expect(systemContent).toContain('历史对话摘要:\n历史摘要');
      expect(systemContent).toContain('工具使用说明:\n插件角色');
      expect(systemContent).toContain('欢迎指导:\n欢迎消息');
      expect(systemContent).toContain('自定义角色:\n自定义内容');
    });

    it('should update metadata correctly', async () => {
      injector
        .setHistorySummary('历史摘要')
        .addCustomRole('role1', 'content1')
        .addCustomRole('role2', 'content2');
      
      const result = await injector.process(mockContext);
      
      expect(result.metadata.builtinSystemRoles).toEqual({
        historySummary: true,
        plugins: false,
        welcome: false,
        customRoles: ['role1', 'role2'],
        totalLength: expect.any(Number),
      });
    });
  });

  describe('configuration methods', () => {
    it('should set and get history summary', () => {
      const summary = '历史对话摘要';
      injector.setHistorySummary(summary);
      
      expect(injector.getConfig().historySummary).toBe(summary);
      expect(injector.hasSystemRolesToInject()).toBe(true);
    });

    it('should set and get plugins role', () => {
      const plugins = '工具使用指导';
      injector.setPluginsRole(plugins);
      
      expect(injector.getConfig().plugins).toBe(plugins);
      expect(injector.hasSystemRolesToInject()).toBe(true);
    });

    it('should set and get welcome role', () => {
      const welcome = '欢迎使用';
      injector.setWelcomeRole(welcome);
      
      expect(injector.getConfig().welcome).toBe(welcome);
      expect(injector.hasSystemRolesToInject()).toBe(true);
    });

    it('should add and remove custom roles', () => {
      injector.addCustomRole('role1', 'content1');
      injector.addCustomRole('role2', 'content2');
      
      expect(injector.getConfig().customRoles).toEqual({
        role1: 'content1',
        role2: 'content2',
      });
      
      injector.removeCustomRole('role1');
      expect(injector.getConfig().customRoles).toEqual({
        role2: 'content2',
      });
    });

    it('should clear all configuration', () => {
      injector
        .setHistorySummary('历史摘要')
        .setPluginsRole('插件角色')
        .addCustomRole('role1', 'content1');
      
      expect(injector.hasSystemRolesToInject()).toBe(true);
      
      injector.clearConfig();
      
      expect(injector.getConfig()).toEqual({});
      expect(injector.hasSystemRolesToInject()).toBe(false);
    });
  });

  describe('utility methods', () => {
    it('should preview system roles content', () => {
      injector
        .setHistorySummary('历史摘要')
        .setPluginsRole('插件角色');
      
      const preview = injector.preview();
      
      expect(preview).toContain('历史对话摘要:\n历史摘要');
      expect(preview).toContain('工具使用说明:\n插件角色');
    });

    it('should return empty preview when no roles configured', () => {
      const preview = injector.preview();
      expect(preview).toBe('');
    });

    it('should correctly detect if system roles need injection', () => {
      expect(injector.hasSystemRolesToInject()).toBe(false);
      
      injector.setHistorySummary('test');
      expect(injector.hasSystemRolesToInject()).toBe(true);
      
      injector.clearConfig();
      injector.setPluginsRole('test');
      expect(injector.hasSystemRolesToInject()).toBe(true);
      
      injector.clearConfig();
      injector.setWelcomeRole('test');
      expect(injector.hasSystemRolesToInject()).toBe(true);
      
      injector.clearConfig();
      injector.addCustomRole('test', 'content');
      expect(injector.hasSystemRolesToInject()).toBe(true);
    });
  });

  describe('edge cases', () => {
    it('should handle empty string configurations', async () => {
      injector
        .setHistorySummary('')
        .setPluginsRole('   ')
        .setWelcomeRole('\t\n')
        .addCustomRole('empty', '');
      
      const result = await injector.process(mockContext);
      
      // Should not create system message for empty/whitespace content
      expect(result.messages).toHaveLength(0);
    });

    it('should handle whitespace-only content correctly', () => {
      injector.addCustomRole('whitespace', '   \t\n   ');
      
      const preview = injector.preview();
      expect(preview).toBe('whitespace:');
    });

    it('should maintain method chaining', () => {
      const result = injector
        .setHistorySummary('history')
        .setPluginsRole('plugins')
        .setWelcomeRole('welcome')
        .addCustomRole('custom', 'content')
        .removeCustomRole('custom')
        .clearConfig();
      
      expect(result).toBe(injector);
    });
  });

  describe('content building', () => {
    it('should build history summary role correctly', async () => {
      injector.setHistorySummary('  历史对话内容  ');
      
      const result = await injector.process(mockContext);
      const content = result.messages[0].content;
      
      expect(content).toBe('历史对话摘要:\n历史对话内容');
    });

    it('should build plugins role correctly', async () => {
      injector.setPluginsRole('  工具使用方法  ');
      
      const result = await injector.process(mockContext);
      const content = result.messages[0].content;
      
      expect(content).toBe('工具使用说明:\n工具使用方法');
    });

    it('should build welcome role correctly', async () => {
      injector.setWelcomeRole('  欢迎使用系统  ');
      
      const result = await injector.process(mockContext);
      const content = result.messages[0].content;
      
      expect(content).toBe('欢迎指导:\n欢迎使用系统');
    });

    it('should build custom role correctly', async () => {
      injector.addCustomRole('特殊指导', '  这是特殊指导内容  ');
      
      const result = await injector.process(mockContext);
      const content = result.messages[0].content;
      
      expect(content).toBe('特殊指导:\n这是特殊指导内容');
    });
  });
});