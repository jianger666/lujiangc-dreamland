import { NextRequest } from 'next/server';
// OpenAI import removed as it's no longer directly used here
import type {
  ChatCompletionChunk,
  ChatCompletionCreateParams,
} from 'openai/resources';

import {
  handleStreamResponse,
  performWebSearch,
  createStreamErrorResponse,
} from './_utils';
import { tryChatCompletionWithFailover } from './_utils/requestWithFailover';
import { apiHandler } from '@/lib/api/handler';
import { createStreamResponse } from '@/lib/api/response';
import { AIModelEnum, AiRoleEnum, Message } from '@/types/ai-assistant';

export const runtime = 'edge';

/**
 * 统一处理错误并返回流式错误响应
 * @param error 错误对象或错误消息
 * @param context 错误上下文描述
 */
function handleStreamError(error: unknown, context: string): Response {
  console.error(`${context}:`, error);

  let errorMessage: string;

  if (error instanceof Error) errorMessage = error.message;
  else if (typeof error === 'string') errorMessage = error;
  else errorMessage = `${context}时出错`;

  return createStreamErrorResponse(errorMessage);
}

/**
 * 处理AI模型请求并返回流式响应
 */
const handleAiRequest = apiHandler(async (req: NextRequest) => {
  const { messages, selectedModel, isWebSearchEnabled } = await req.json();

  // 没有selectedModel或者selectedModel不是AIModelEnum的成员
  if (!selectedModel || !Object.values(AIModelEnum).includes(selectedModel)) {
    return handleStreamError('没有提供有效的模型', '参数验证');
  }

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return handleStreamError('没有提供有效的消息', '参数验证');
  }

  // 准备发送给 AI 的消息数组
  const messagesForAI: Message[] = [...messages];

  // 如果启用了 Web 搜索
  if (isWebSearchEnabled) {
    const userQuery = messages[messages.length - 1]?.content;
    if (typeof userQuery === 'string' && userQuery.trim()) {
      try {
        const searchResults = await performWebSearch(userQuery);
        if (searchResults && searchResults.length > 0) {
          // 格式化搜索结果为文本
          const searchResultsText =
            'Web search results for context:\n' +
            searchResults
              .slice(0, 3) // 最多取前 3 条
              .map(
                (r, i) =>
                  `${i + 1}. ${r.title}\n   ${r.snippet}\n   Source: ${r.link}`,
              )
              .join('\n\n');

          // 在用户最新消息之前插入包含搜索结果的系统消息
          messagesForAI.splice(messagesForAI.length - 1, 0, {
            id: 'system-search-' + Date.now(), // 生成唯一 ID
            role: AiRoleEnum.System,
            content: searchResultsText,
          });
        } else {
          console.log('[API Route] Web search returned no usable results.');
        }
      } catch (searchError) {
        // 捕获搜索错误但不中断整个请求流程
        console.error('[API Route] Web search failed:', searchError);

        // 可选：通知用户搜索失败，但继续处理请求
        const searchErrorMessage =
          'Web search failed, proceeding with AI response using available context.';
        messagesForAI.splice(messagesForAI.length - 1, 0, {
          id: 'system-search-error-' + Date.now(),
          role: AiRoleEnum.System,
          content: searchErrorMessage,
        });
      }
    }
  }

  try {
    // 1. 获取所有可用配置 - Removed by user
    // const configurations = getClientConfigForModel(selectedModel);

    // 2. 准备基础请求选项
    const baseRequestOptions = {
      messages: messagesForAI as ChatCompletionCreateParams['messages'],
      stream: true,
    };

    // 3. 调用带故障转移的请求函数，传递 selectedModel
    const response = (await tryChatCompletionWithFailover(
      selectedModel, // Pass model enum instead of configurations
      baseRequestOptions,
    )) as AsyncIterable<ChatCompletionChunk>; // 明确类型为流式

    // 创建流处理管道
    const stream = new ReadableStream({
      async start(controller) {
        await handleStreamResponse({
          response: response,
          controller,
        });
      },
    });

    // 返回流式响应
    return createStreamResponse(stream);
  } catch (error) {
    // 如果 tryChatCompletionWithFailover 抛出错误（所有尝试均失败）
    return handleStreamError(error, '调用AI服务（所有实例均失败）');
  }
});

export const POST = handleAiRequest;
