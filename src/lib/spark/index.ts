import OpenAI from 'openai';

// 配置AI Tools客户端
export const sparkClient = new OpenAI({
  apiKey: process.env.AI_TOOLS_API_KEY || '',
  baseURL: 'https://platform.aitools.cfd/api/v1',
});

// AI对话配置
export const SPARK_CONFIG = {
  model: 'deepseek/deepseek-v3-0324',
  stream: true, // 启用流式响应
};
