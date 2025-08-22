import { ModelProviderCard } from '@/types/llm';

// ref :https://open.bigmodel.cn/dev/howuse/model
// api https://open.bigmodel.cn/dev/api#language
// ref :https://open.bigmodel.cn/modelcenter/square
const ZhiPu: ModelProviderCard = {
  chatModels: [],
  checkModel: 'glm-4-flash-250414',
  description:
    '智谱 AI 提供多模态与语言模型的开放平台，支持广泛的AI应用场景，包括文本处理、图像理解与编程辅助等。',
  id: 'zhipu',
  modelList: { showModelFetcher: true },
  modelsUrl: 'https://open.bigmodel.cn/dev/howuse/model',
  name: 'ZhiPu',
  settings: {
    proxyUrl: {
      placeholder: 'https://open.bigmodel.cn/api/paas/v4',
    },
    sdkType: 'openai',
    showModelFetcher: true,
  },
  url: 'https://zhipuai.cn',
};

export default ZhiPu;
