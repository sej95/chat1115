import { ModelProviderCard } from '@/types/llm';

// ref: https://developer.poe.com/server-bots/accessing-other-bots-on-poe
const Poe: ModelProviderCard = {
  chatModels: [
    {
      description: 'Claude-3.5-Sonnet on Poe',
      displayName: 'Claude-3.5-Sonnet',
      enabled: true,
      id: 'Claude-3.5-Sonnet',
      functionCall: true,
      vision: true,
    },
    {
      description: 'GPT-4o on Poe',
      displayName: 'GPT-4o',
      enabled: true,
      id: 'GPT-4o',
      functionCall: true,
      vision: true,
    },
    {
      description: 'GPT-4-Turbo on Poe',
      displayName: 'GPT-4-Turbo',
      enabled: true,
      id: 'GPT-4-Turbo',
      functionCall: true,
    },
    {
      description: 'Claude-3-Opus on Poe',
      displayName: 'Claude-3-Opus',
      enabled: true,
      id: 'Claude-3-Opus',
      functionCall: true,
    },
    {
      description: 'Claude-3-Sonnet on Poe',
      displayName: 'Claude-3-Sonnet',
      enabled: true,
      id: 'Claude-3-Sonnet',
      functionCall: true,
    },
    {
      description: 'Claude-3-Haiku on Poe',
      displayName: 'Claude-3-Haiku',
      enabled: true,
      id: 'Claude-3-Haiku',
      functionCall: true,
    },
    {
      description: 'Gemini-Pro on Poe',
      displayName: 'Gemini-Pro',
      enabled: true,
      id: 'Gemini-Pro',
      functionCall: true,
    },
  ],
  checkModel: 'Claude-3.5-Sonnet',
  description:
    'Poe lets people ask questions, get instant answers, and have back-and-forth conversations with AI. Poe API provides access to various AI models from different providers.',
  enabled: true,
  id: 'poe',
  modelList: { showModelFetcher: true },
  name: 'Poe',
  proxyUrl: {
    placeholder: 'https://api.poe.com',
  },
  settings: {
    showModelFetcher: true,
    proxyUrl: {
      placeholder: 'https://api.poe.com',
    },
  },
  url: 'https://poe.com',
};

export default Poe;