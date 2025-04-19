import { NextRequest } from 'next/server';
import { tryChatCompletionWithFailover } from '../_utils/requestWithFailover';
import { apiHandler } from '@/lib/api/handler';
import { createErrorResponse } from '@/lib/api/response';
import { AIModelEnum, AiRoleEnum } from '@/types/ai-assistant';
import type { ChatCompletion } from 'openai/resources';

// 标题生成使用的模型ID
const TITLE_GENERATOR_MODEL = AIModelEnum.TitleGenerator;

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

    // 2. 准备基础请求选项 (非流式)
    const baseRequestOptions = {
      messages: [
        {
          role: AiRoleEnum.System,
          content:
            '你是一个标题生成助手。根据用户的提问生成一个简短的标题（10个汉字以内），标题应该概括对话的主题或目的。只返回标题，不要包含任何其他文字或标点符号。',
        },
        { role: AiRoleEnum.User, content: userMessage },
      ],
      max_tokens: 15,
      temperature: 0.3,
      stream: false, // 明确指定为非流式
    };

    // 3. 调用带故障转移的请求函数，传递模型ID
    const response = (await tryChatCompletionWithFailover(
      TITLE_GENERATOR_MODEL,
      baseRequestOptions,
    )) as ChatCompletion; // 明确类型为非流式响应

    // 提取生成的标题 (逻辑不变)
    const title = response.choices[0]?.message?.content?.trim() ?? '';

    // 直接返回标题字符串，符合原apiHandler期望
    return new Response(title, { status: 200 });
  } catch (error) {
    console.error('生成标题错误（所有实例均失败）:', error);
    // 返回更通用的错误给客户端
    return createErrorResponse({
      message: '生成标题时出错，请稍后重试。',
    });
  }
});

export const POST = handleGenerateTitle;
