import { NextRequest } from 'next/server';
import OpenAI from 'openai';
import { getClientConfigForModel } from '../_config';
import { apiHandler } from '@/lib/api/handler';
import { createErrorResponse } from '@/lib/api/response';
import { AIModelEnum, AiRoleEnum } from '@/types/ai-assistant';

// 标题生成使用的模型ID
const TITLE_GENERATOR_MODEL = AIModelEnum.XFYunLite;

/**
 * POST处理器 - 根据对话内容生成标题
 */
const handleGenerateTitle = apiHandler(async (req: NextRequest) => {
  try {
    const { userMessage } = await req.json();

    if (!userMessage) {
      return createErrorResponse({
        message: '无用户消息',
      });
    }

    // 获取模型配置
    const clientConfig = getClientConfigForModel(TITLE_GENERATOR_MODEL);
    const aiClient = new OpenAI(clientConfig);

    // 发送请求到AI模型获取标题
    const response = await aiClient.chat.completions.create({
      model: TITLE_GENERATOR_MODEL,
      messages: [
        {
          role: AiRoleEnum.System,
          content:
            '你是一个标题生成助手。根据用户的提问生成一个简短的标题（10个汉字以内），标题应该概括对话的主题或目的。只返回标题，不要包含任何其他文字或标点符号。',
        },
        { role: AiRoleEnum.User, content: userMessage },
      ],
      max_tokens: 13,
      temperature: 0.3,
    });

    // 提取生成的标题
    const title = response.choices[0]?.message?.content?.trim() ?? '';

    return title;
  } catch (error) {
    console.error('生成标题错误:', error);
    throw error;
  }
});

export const POST = handleGenerateTitle;
