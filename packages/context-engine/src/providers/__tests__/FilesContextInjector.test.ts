import { describe, it, expect, beforeEach } from 'vitest';
import { FilesContextInjector } from '../FilesContextInjector';
import type { PipelineContext, ChatMessage } from '../../types';

describe('FilesContextInjector', () => {
  let injector: FilesContextInjector;
  let mockContext: PipelineContext;

  beforeEach(() => {
    injector = new FilesContextInjector();
    
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
    it('should initialize with default options', () => {
      const options = injector.getOptions();
      expect(options).toEqual({});
    });

    it('should initialize with provided options', () => {
      const options = {
        addUrl: true,
        includeMetadata: true,
        maxFileSize: 1024000,
      };
      
      const configuredInjector = new FilesContextInjector(options);
      expect(configuredInjector.getOptions()).toEqual(options);
    });
  });


  describe('doProcess method', () => {
    it('should return context unchanged when no messages have files', async () => {
      const message: ChatMessage = {
        id: 'test-message',
        role: 'user',
        content: '这是一条普通消息',
        createdAt: Date.now(),
      };
      
      mockContext.messages = [message];
      const result = await injector.process(mockContext);
      
      expect(result.messages).toHaveLength(1);
      expect(result.messages[0].content).toBe('这是一条普通消息');
      expect(result.metadata.filesContextProcessed).toBe(0);
      expect(result.metadata.totalFilesProcessed).toBe(0);
    });

    it('should process messages with file lists', async () => {
      const message: any = {
        id: 'test-message',
        role: 'user',
        content: '请查看这些文件',
        createdAt: Date.now(),
        fileList: ['file1.txt', 'file2.pdf'],
      };
      
      mockContext.messages = [message];
      const result = await injector.process(mockContext);
      
      expect(result.messages).toHaveLength(1);
      expect(result.messages[0].content).toContain('请查看这些文件');
      expect(result.messages[0].content).toContain('相关文件信息:');
      expect(result.messages[0].content).toContain('文件 1: file1.txt');
      expect(result.messages[0].content).toContain('文件 2: file2.pdf');
      expect(result.metadata.filesContextProcessed).toBe(1);
      expect(result.metadata.totalFilesProcessed).toBe(2);
    });

    it('should process messages with image lists', async () => {
      const message: any = {
        id: 'test-message',
        role: 'user',
        content: '请分析这些图片',
        createdAt: Date.now(),
        imageList: [
          { id: 'img1', alt: '图片描述1', url: '/images/img1.jpg' },
          { id: 'img2', alt: '图片描述2' },
        ],
      };
      
      mockContext.messages = [message];
      const result = await injector.process(mockContext);
      
      expect(result.messages).toHaveLength(1);
      expect(result.messages[0].content).toContain('请分析这些图片');
      expect(result.messages[0].content).toContain('相关图像信息:');
      expect(result.messages[0].content).toContain('图像 1');
      expect(result.messages[0].content).toContain('描述: 图片描述1');
      expect(result.messages[0].content).toContain('图像 2');
      expect(result.messages[0].content).toContain('描述: 图片描述2');
      expect(result.metadata.filesContextProcessed).toBe(1);
      expect(result.metadata.totalFilesProcessed).toBe(2);
    });

    it('should process messages with both files and images', async () => {
      const message: any = {
        id: 'test-message',
        role: 'user',
        content: '请分析这些文件和图片',
        createdAt: Date.now(),
        fileList: ['document.pdf'],
        imageList: [{ id: 'img1', alt: '图片' }],
      };
      
      mockContext.messages = [message];
      const result = await injector.process(mockContext);
      
      expect(result.messages[0].content).toContain('相关文件信息:');
      expect(result.messages[0].content).toContain('相关图像信息:');
      expect(result.metadata.totalFilesProcessed).toBe(2);
    });
  });

  describe('configuration options', () => {
    it('should add URLs when addUrl option is enabled', async () => {
      injector.setOptions({ addUrl: true });
      
      const message: any = {
        id: 'test-message',
        role: 'user',
        content: '测试消息',
        createdAt: Date.now(),
        fileList: ['file1.txt'],
        imageList: [{ id: 'img1', url: '/images/img1.jpg' }],
      };
      
      mockContext.messages = [message];
      const result = await injector.process(mockContext);
      
      expect(result.messages[0].content).toContain('URL: /file/file1.txt');
      expect(result.messages[0].content).toContain('URL: /images/img1.jpg');
    });

    it('should include metadata when includeMetadata option is enabled', async () => {
      injector.setOptions({ includeMetadata: true });
      
      const message: any = {
        id: 'test-message',
        role: 'user',
        content: '测试消息',
        createdAt: Date.now(),
        fileList: ['file1.txt'],
      };
      
      mockContext.messages = [message];
      const result = await injector.process(mockContext);
      
      expect(result.messages[0].content).toContain('类型: 文档文件');
    });

    it('should update options correctly', () => {
      const initialOptions = { addUrl: true };
      const updatedOptions = { includeMetadata: true, maxFileSize: 2048000 };
      
      injector.setOptions(initialOptions);
      expect(injector.getOptions()).toEqual(initialOptions);
      
      injector.setOptions(updatedOptions);
      expect(injector.getOptions()).toEqual({ ...initialOptions, ...updatedOptions });
    });
  });

  describe('static utility methods', () => {
    it('should detect messages with files correctly', () => {
      const messageWithFiles = {
        fileList: ['file1.txt'],
        imageList: [],
      };
      
      const messageWithImages = {
        fileList: [],
        imageList: [{ id: 'img1' }],
      };
      
      const messageWithBoth = {
        fileList: ['file1.txt'],
        imageList: [{ id: 'img1' }],
      };
      
      const messageWithoutFiles = {
        content: '普通消息',
      };
      
      expect(FilesContextInjector.hasFiles(messageWithFiles)).toBe(true);
      expect(FilesContextInjector.hasFiles(messageWithImages)).toBe(true);
      expect(FilesContextInjector.hasFiles(messageWithBoth)).toBe(true);
      expect(FilesContextInjector.hasFiles(messageWithoutFiles)).toBe(false);
    });

    it('should count files correctly', () => {
      const message = {
        fileList: ['file1.txt', 'file2.pdf'],
        imageList: [{ id: 'img1' }, { id: 'img2' }, { id: 'img3' }],
      };
      
      const counts = FilesContextInjector.countFiles(message);
      
      expect(counts).toEqual({
        files: 2,
        images: 3,
        total: 5,
      });
    });

    it('should handle messages without file arrays', () => {
      const message = { content: '普通消息' };
      const counts = FilesContextInjector.countFiles(message);
      
      expect(counts).toEqual({
        files: 0,
        images: 0,
        total: 0,
      });
    });
  });

  describe('content building', () => {
    it('should build file list context correctly', async () => {
      const message: any = {
        id: 'test-message',
        role: 'user',
        content: '原始内容',
        fileList: ['file1.txt', 'file2.pdf', 'file3.doc'],
      };
      
      mockContext.messages = [message];
      const result = await injector.process(mockContext);
      
      const content = result.messages[0].content;
      expect(content).toContain('相关文件信息:');
      expect(content).toContain('文件 1: file1.txt');
      expect(content).toContain('文件 2: file2.pdf');
      expect(content).toContain('文件 3: file3.doc');
    });

    it('should build image list context correctly', async () => {
      const message: any = {
        id: 'test-message',
        role: 'user',
        content: '原始内容',
        imageList: [
          { id: 'img1', alt: '第一张图片', url: '/img1.jpg' },
          { id: 'img2' }, // 没有描述
          { alt: '第三张图片' }, // 没有ID
        ],
      };
      
      mockContext.messages = [message];
      const result = await injector.process(mockContext);
      
      const content = result.messages[0].content;
      expect(content).toContain('相关图像信息:');
      expect(content).toContain('图像 1');
      expect(content).toContain('描述: 第一张图片');
      expect(content).toContain('ID: img1');
      expect(content).toContain('图像 2');
      expect(content).toContain('ID: img2');
      expect(content).toContain('图像 3');
      expect(content).toContain('描述: 第三张图片');
    });
  });

  describe('edge cases', () => {
    it('should handle empty file lists', async () => {
      const message: any = {
        id: 'test-message',
        role: 'user',
        content: '测试消息',
        fileList: [],
        imageList: [],
      };
      
      mockContext.messages = [message];
      const result = await injector.process(mockContext);
      
      expect(result.messages[0].content).toBe('测试消息');
      expect(result.metadata.filesContextProcessed).toBe(0);
    });

    it('should handle null/undefined file arrays', async () => {
      const message: any = {
        id: 'test-message',
        role: 'user',
        content: '测试消息',
        fileList: null,
        imageList: undefined,
      };
      
      mockContext.messages = [message];
      const result = await injector.process(mockContext);
      
      expect(result.messages[0].content).toBe('测试消息');
      expect(result.metadata.filesContextProcessed).toBe(0);
    });

    it('should handle messages with empty content', async () => {
      const message: any = {
        id: 'test-message',
        role: 'user',
        content: '',
        fileList: ['file1.txt'],
      };
      
      mockContext.messages = [message];
      const result = await injector.process(mockContext);
      
      expect(result.messages[0].content).toContain('相关文件信息:');
      expect(result.metadata.filesContextProcessed).toBe(1);
    });

    it('should only process user/assistant messages, skip system messages', async () => {
      const systemMessage: any = {
        id: 'system-message',
        role: 'system',
        content: '系统消息',
        fileList: ['file1.txt'],
      };
      
      const userMessage: any = {
        id: 'user-message',
        role: 'user',
        content: '用户消息',
        fileList: ['file2.txt'],
      };
      
      mockContext.messages = [systemMessage, userMessage];
      const result = await injector.process(mockContext);
      
      // System message should remain unchanged
      expect(result.messages[0].content).toBe('系统消息');
      // User message should be processed
      expect(result.messages[1].content).toContain('相关文件信息:');
      expect(result.metadata.filesContextProcessed).toBe(1);
    });
  });

  describe('content merging', () => {
    it('should append file context to original content', async () => {
      const message: any = {
        id: 'test-message',
        role: 'user',
        content: '这是原始消息内容',
        fileList: ['test.txt'],
      };
      
      mockContext.messages = [message];
      const result = await injector.process(mockContext);
      
      const content = result.messages[0].content;
      expect(content.startsWith('这是原始消息内容')).toBe(true);
      expect(content).toContain('\n\n相关文件信息:');
    });

    it('should handle whitespace correctly in content merging', async () => {
      const message: any = {
        id: 'test-message',
        role: 'user',
        content: '   原始内容   ',
        fileList: ['test.txt'],
      };
      
      mockContext.messages = [message];
      const result = await injector.process(mockContext);
      
      const content = result.messages[0].content;
      expect(content.trim()).not.toBe('');
      expect(content).toContain('原始内容');
      expect(content).toContain('相关文件信息:');
    });
  });
});