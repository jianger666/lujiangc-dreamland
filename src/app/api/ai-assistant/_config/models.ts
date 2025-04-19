/**
 * AI 模型配置
 * 包含所有支持的AI模型及其配置信息
 */

import {
  AIModelEnum,
  AIProviderEnum,
  ProviderConfig,
  ModelConfig,
  AIModel,
} from '@/types/ai-assistant';

/**
 * AI 服务提供商配置
 */
export const PROVIDERS_CONFIG: Record<AIProviderEnum, ProviderConfig> = {
  [AIProviderEnum.OPENROUTER]: {
    baseURL: 'https://openrouter.ai/api/v1',
    apiKey: process.env.OPENROUTER_API_KEY,
  },
  [AIProviderEnum.HENHUO]: {
    baseURL: 'https://a.henhuoai.com/v1',
    apiKey: process.env.HENHUO_API_KEY,
  },
  [AIProviderEnum.GOOGLE]: {
    baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai',
    apiKey: process.env.GOOGLE_STUDIO_API_KEY,
  },
};

export const MODELS_CONFIG: Record<AIModelEnum, ModelConfig> = {
  [AIModelEnum.DeepSeekV30324]: {
    displayName: 'DeepSeek-V3-0324',
    instances: [
      {
        provider: AIProviderEnum.HENHUO,
        modelId: 'DeepSeek-V3-0324',
      },
      {
        provider: AIProviderEnum.OPENROUTER,
        modelId: 'deepseek/deepseek-chat-v3-0324:free',
      },
    ],
  },
  [AIModelEnum.DeepSeekR1]: {
    displayName: 'DeepSeek-R1',
    instances: [
      {
        provider: AIProviderEnum.HENHUO,
        modelId: 'DeepSeek-R1',
      },
    ],
  },
  [AIModelEnum.Gemini25ProExp0325]: {
    displayName: 'Gemini-2.5-Pro-Exp-03-25',
    instances: [
      {
        provider: AIProviderEnum.GOOGLE,
        modelId: 'gemini-2.5-pro-exp-03-25',
      },
      {
        provider: AIProviderEnum.OPENROUTER,
        modelId: 'google/gemini-2.5-pro-exp-03-25:free',
      },
    ],
  },
  [AIModelEnum.Gemini20Flash]: {
    displayName: 'Gemini-2.0-Flash',
    instances: [
      {
        provider: AIProviderEnum.GOOGLE,
        modelId: 'gemini-2.0-flash',
      },
    ],
  },
};

/**
 * 获取所有可用模型列表
 */
export function getAllModels(): AIModel[] {
  return Object.entries(MODELS_CONFIG).map(([key, value]) => ({
    id: key,
    name: value.displayName,
  }));
}

/**
 * 根据模型ID获取适当的API配置
 */
export function getClientConfigForModel(selectedModel: AIModelEnum) {
  const modelConfig = MODELS_CONFIG[selectedModel];
  if (!modelConfig) {
    throw new Error(`模型配置不存在: ${selectedModel}`);
  }
  // 暂时先默认只使用第一个实例
  const { provider, modelId } = modelConfig.instances[0];

  const { baseURL, apiKey } = PROVIDERS_CONFIG[provider];

  return {
    baseURL,
    apiKey,
    modelId,
  };
}
