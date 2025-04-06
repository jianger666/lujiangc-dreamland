import { AIModel, GenerateTitleRequest } from '@/types/ai-assistant';
import httpClient from '@/lib/api/http';

/**
 * 获取可用的AI模型列表
 * @returns 可用的AI模型列表
 */
export const getAvailableModels = async () => {
  return httpClient.get<AIModel[]>('/api/ai-assistant/models');
};

/**
 * 根据对话内容自动生成标题
 * @param messages 对话消息列表
 * @returns 生成的标题
 */
export const generateTitle = async (payload: GenerateTitleRequest) => {
  return httpClient.post<string>('/api/ai-assistant/generate-title', payload);
};
