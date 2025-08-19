import { ModelProviderCard } from '@/types/llm';

/**
 * ComfyUI Provider Configuration
 *
 * 支持本地和远程 ComfyUI 服务器连接
 * 提供 FLUX 系列模型的图像生成能力
 *
 * @see https://www.comfy.org/
 */
const ComfyUI: ModelProviderCard = {
  chatModels: [],
  description: '强大的开源图像生成工作流引擎，支持 FLUX 等先进模型',
  enabled: true,
  id: 'comfyui',
  name: 'ComfyUI',
  settings: {
    // 禁用浏览器直接请求，通过服务端代理
    disableBrowserRequest: true,
    
    // SDK 类型标识
sdkType: 'comfyui',
    
    
// 不显示添加新模型按钮（模型通过配置管理）
showAddNewModel: false,
    
    

// 显示 API 密钥配置（用于认证配置）
showApiKey: true,
    
    

// 显示连通性检查
showChecker: true,
    
    // 不显示模型获取器（使用预定义模型）
showModelFetcher: false,
  },
  url: 'https://www.comfy.org/',
};

export default ComfyUI;
