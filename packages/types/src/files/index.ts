export enum FilesTabs {
  All = 'all',
  Audios = 'audios',
  Documents = 'documents',
  Images = 'images',
  Videos = 'videos',
  Websites = 'websites',
}

export enum TRPCErrorMessage {
  FileContentEmpty = 'File content is empty',
  FileNotFound = 'File not found',
  // files not find in origin
  OrginFileNotFound = 'Origin File Not Found',
}

export interface FileItem {
  createdAt: Date;
  enabled?: boolean;
  id: string;
  name: string;
  size: number;
  source?: FileSource | null;
  type: string;
  updatedAt: Date;
  url: string;
}

export * from './list';
export * from './upload';
