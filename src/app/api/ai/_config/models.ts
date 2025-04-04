/**
 * AI 模型配置
 * 包含所有支持的AI模型及其配置信息
 */

import {
  AIModelEnum,
  ProviderConfig,
  ClientConfig,
  AIModel,
} from '../_types/models';

/**
 * AI 服务提供商配置
 */
export const API_PROVIDERS: Record<string, ProviderConfig> = {
  DEEPSEEK: {
    baseURL: 'https://a.henhuoai.com/v1',
    apiKey: process.env.HENHUO_API_KEY,
    models: [
      { id: AIModelEnum.DeepSeekV30324, name: 'DeepSeek-V3-0324' },
      { id: AIModelEnum.DeepSeekR1, name: 'DeepSeek-R1' },
    ],
  },
  GOOGLE: {
    baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai',
    apiKey: process.env.GEMINI_API_KEY,
    models: [
      { id: AIModelEnum.Gemini25ProExp0325, name: 'gemini-2.5-pro-exp-03-25' },
      { id: AIModelEnum.Gemini20Flash, name: 'gemini-2.0-flash' },
      { id: AIModelEnum.Gemini15ProLatest, name: 'gemini-1.5-pro-latest' },
    ],
  },
};

/**
 * 获取所有可用模型列表
 */
export function getAvailableModels(): AIModel[] {
  return Object.values(API_PROVIDERS).flatMap((provider) =>
    provider.models.map((model) => ({
      id: model.id,
      name: model.name || model.id,
    })),
  );
}

/**
 * 根据模型ID获取适当的API配置
 */
export function getClientConfigForModel(modelId: AIModelEnum): ClientConfig {
  // 遍历所有提供商查找模型
  for (const provider of Object.values(API_PROVIDERS)) {
    if (provider.models.some((model) => model.id === modelId)) {
      return {
        apiKey: provider.apiKey,
        baseURL: provider.baseURL,
      };
    }
  }

  // 默认返回GOOGLE提供商配置
  return {
    apiKey: API_PROVIDERS.GOOGLE.apiKey,
    baseURL: API_PROVIDERS.GOOGLE.baseURL,
  };
}
