import { NextResponse } from 'next/server';

// 预设API配置
const API_CONFIG: Record<string, { models: { id: string; name?: string }[] }> =
  {
    DEEPSEEK: {
      models: [
        { id: 'deepseek-ai/DeepSeek-R1', name: 'DeepSeek-R1' },
        { id: 'DeepSeek-V3-0324', name: 'DeepSeek-V3-0324' },
      ],
    },
    GOOGLE: {
      models: [
        { id: 'gemini-2.5-pro-exp-03-25', name: 'gemini-2.5-pro-exp-03-25' },
        { id: 'gemini-2.0-flash', name: 'gemini-2.0-flash' },
        { id: 'gemini-1.5-pro-latest', name: 'gemini-1.5-pro-latest' },
      ],
    },
  };

/**
 * 获取所有可用模型列表
 */
function getAvailableModels() {
  const deepseekModels = API_CONFIG.DEEPSEEK.models.map((model) => ({
    id: model.id,
    name: model.name ?? model.id,
  }));

  const googleModels = API_CONFIG.GOOGLE.models.map((model) => ({
    id: model.id,
    name: model.name ?? model.id,
  }));

  return [...deepseekModels, ...googleModels];
}

/**
 * GET请求处理器 - 返回可用的AI模型列表
 */
export async function GET() {
  try {
    const models = getAvailableModels();
    return NextResponse.json({ models });
  } catch (error) {
    console.error('处理获取模型请求错误:', error);
    return NextResponse.json(
      { error: '服务器处理请求时出错' },
      { status: 500 },
    );
  }
}
