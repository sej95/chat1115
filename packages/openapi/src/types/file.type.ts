import { FileMetadata } from '@lobechat/types';
import { z } from 'zod';

/**
 * 文件上传请求类型
 */
export interface FileUploadRequest {
  /** 文件目录（可选） */
  directory?: string;
  /** 文件对象 */
  file: File;
  /** 知识库ID（可选） */
  knowledgeBaseId?: string;
  /** 自定义路径（可选） */
  pathname?: string;
  /** 会话ID（可选） */
  sessionId?: string;
  /** 是否跳过文件类型检查 */
  skipCheckFileType?: boolean;
  /** 是否跳过去重检查 */
  skipDeduplication?: boolean;
}

/**
 * 文件上传响应类型
 */
export interface FileUploadResponse {
  /** 文件MIME类型 */
  fileType: string;
  /** 文件名 */
  filename: string;
  /** 文件哈希值 */
  hash: string;
  /** 文件ID */
  id?: string;
  /** 文件元数据 */
  metadata: FileMetadata;
  /** 文件大小（字节） */
  size: number;
  /** 上传时间 */
  uploadedAt: string;
  /** 文件访问URL */
  url: string;
}

/**
 * 预签名URL请求类型
 */
export interface PreSignedUrlRequest {
  /** 文件MIME类型 */
  fileType: string;
  /** 文件名 */
  filename: string;
  /** 自定义路径（可选） */
  pathname?: string;
  /** 文件大小（字节） */
  size: number;
}

/**
 * 预签名URL响应类型
 */
export interface PreSignedUrlResponse {
  /** 过期时间 */
  expiresIn: number;
  /** 文件ID */
  fileId: string;
  /** S3对象键 */
  key: string;
  /** 上传URL */
  uploadUrl: string;
}

/**
 * 文件列表查询参数
 */
export interface FileListQuery {
  /** 文件类型过滤 */
  fileType?: string;
  /** 知识库ID过滤 */
  knowledgeBaseId?: string;
  /** 页码（从1开始） */
  page?: number;
  /** 每页数量 */
  pageSize?: number;
  /** 搜索关键词 */
  search?: string;
}

/**
 * 文件列表响应类型
 */
export interface FileListResponse {
  /** 文件列表 */
  files: FileUploadResponse[];
  /** 当前页 */
  page?: number;
  /** 每页数量 */
  pageSize?: number;
  /** 总数 */
  total: number;
}

/**
 * 文件详情响应类型
 */
export interface FileDetailResponse extends FileUploadResponse {
  /** Base64编码的文件内容（仅图片文件） */
  base64?: string;
  /** 解析错误信息 */
  parseError?: string;
  /** 解析状态 */
  parseStatus?: 'pending' | 'processing' | 'completed' | 'failed';
  /** 是否支持内容解析 */
  supportContentParsing: boolean;
}

/**
 * 文件删除响应类型
 */
export interface FileDeleteResponse {
  /** 是否删除成功 */
  deleted: boolean;
  /** 删除的文件ID */
  fileId: string;
}

/**
 * 获取文件URL请求类型
 */
export interface FileUrlRequest {
  /** 过期时间（秒），默认为系统配置值 */
  expiresIn?: number;
}

/**
 * 获取文件URL响应类型
 */
export interface FileUrlResponse {
  /** URL过期时间戳 */
  expiresAt: string;
  /** URL过期时间（秒） */
  expiresIn: number;
  /** 文件ID */
  fileId: string;
  /** 文件名 */
  filename: string;
  /** 预签名访问URL */
  url: string;
}

/**
 * 公共文件上传请求类型
 */
export interface PublicFileUploadRequest {
  /** 文件目录（可选） */
  directory?: string;
  /** 知识库ID（可选） */
  knowledgeBaseId?: string;
  /** 会话ID（可选） */
  sessionId?: string;
  /** 是否跳过文件类型检查 */
  skipCheckFileType?: boolean;
  /** 是否跳过去重检查 */
  skipDeduplication?: boolean;
}

/**
 * 公共文件上传响应类型
 */
export interface PublicFileUploadResponse {
  /** 文件MIME类型 */
  fileType: string;
  /** 文件名 */
  filename: string;
  /** 文件哈希值 */
  hash: string;
  /** 文件ID */
  id: string;
  /** 文件元数据 */
  metadata: FileMetadata;
  /** 文件大小（字节） */
  size: number;
  /** 上传时间 */
  uploadedAt: string;
  /** 永久访问URL */
  url: string;
}

/**
 * 永久文件URL响应类型
 */
export interface PermanentFileUrlResponse {
  /** 文件ID */
  fileId: string;
  /** 文件名 */
  filename: string;
  /** 永久访问URL */
  url: string;
  /** URL类型 */
  urlType: 'public' | 'permanent';
}

/**
 * 批量文件上传请求类型
 */
export interface BatchFileUploadRequest {
  /** 上传目录（可选） */
  directory?: string;
  /** 文件列表 */
  files: File[];
  /** 知识库ID（可选） */
  knowledgeBaseId?: string;
  /** 会话ID（可选） */
  sessionId?: string;
  /** 是否跳过文件类型检查 */
  skipCheckFileType?: boolean;
}

/**
 * 批量文件上传响应类型
 */
export interface BatchFileUploadResponse {
  /** 失败的文件及错误信息 */
  failed: Array<{
    error: string;
    filename: string;
  }>;
  /** 成功上传的文件 */
  successful: FileUploadResponse[];
  /** 总计数量 */
  summary: {
    failed: number;
    successful: number;
    total: number;
  };
}

/**
 * 文件上传进度回调类型
 */
export interface FileUploadProgress {
  /** 文件名 */
  filename: string;
  /** 已上传字节数 */
  loaded: number;
  /** 上传百分比 */
  percentage: number;
  /** 上传状态 */
  status: 'pending' | 'uploading' | 'completed' | 'failed';
  /** 总字节数 */
  total: number;
}

/**
 * 文件解析请求类型
 */
export interface FileParseRequest {
  /** 文件ID */
  fileId: string;
  /** 是否跳过已存在的解析结果 */
  skipExist?: boolean;
}

/**
 * 文件解析响应类型
 */
export interface FileParseResponse {
  /** 解析后的文本内容 */
  content: string;
  /** 解析错误信息 */
  error?: string;
  /** 文件ID */
  fileId: string;
  /** 文件类型 */
  fileType: string;
  /** 文件名 */
  filename: string;
  /** 文档元数据 */
  metadata?: {
    /** 页数 */
    pages?: number;
    /** 文档标题 */
    title?: string;
    /** 字符总数 */
    totalCharCount?: number;
    /** 行总数 */
    totalLineCount?: number;
  };
  /** 解析状态 */
  parseStatus: 'completed' | 'failed';
  /** 解析时间 */
  parsedAt: string;
}

/**
 * 文件上传并解析响应类型
 */
export interface FileUploadAndParseResponse {
  /** 文件项 */
  fileItem: FileDetailResponse;
  /** 解析结果 */
  parseResult: FileParseResponse;
}

// Zod Schemas for validation
export const PreSignedUrlRequestSchema = z.object({
  fileType: z.string().min(1, '文件类型不能为空'),
  filename: z.string().min(1, '文件名不能为空'),
  pathname: z.string().nullish(),
  size: z.number().positive('文件大小必须大于0'),
});

export const FileListQuerySchema = z.object({
  fileType: z.string().nullish(),
  knowledgeBaseId: z.string().nullish(),
  page: z
    .string()
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().min(1))
    .nullish(),
  pageSize: z
    .string()
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().min(1).max(100))
    .nullish(),
  search: z.string().nullish(),
});

export const FileIdParamSchema = z.object({
  id: z.string().min(1, '文件 ID 不能为空'),
});

export const FileUrlRequestSchema = z.object({
  expiresIn: z
    .string()
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().min(60).max(7200)) // 1分钟到2小时
    .nullish(),
});

export const FileParseRequestSchema = z.object({
  skipExist: z
    .string()
    .transform((val) => val === 'true')
    .pipe(z.boolean())
    .nullish(),
});

/**
 * 批量获取文件请求类型
 */
export interface BatchGetFilesRequest {
  /** 文件ID列表 */
  fileIds: string[];
}

/**
 * 批量获取文件响应类型
 */
export interface BatchGetFilesResponse {
  /** 失败的文件及错误信息 */
  failed: Array<{
    error: string;
    fileId: string;
  }>;
  /** 文件列表 */
  files: Array<{
    /** 文件详情（图片文件会包含base64字段） */
    fileItem: FileDetailResponse;
    /** 解析结果（非图片文件） */
    parseResult?: FileParseResponse;
  }>;
  /** 成功获取的文件数 */
  success: number;
  /** 请求总数 */
  total: number;
}

// Zod Schema for validation
export const BatchGetFilesRequestSchema = z.object({
  fileIds: z.array(z.string().min(1, '文件ID不能为空')).min(1, '文件ID列表不能为空'),
});
