import { NextRequest } from 'next/server';
import OpenAI from 'openai';
import type {
  ChatCompletionChunk,
  ChatCompletionCreateParams,
} from 'openai/resources';

import { getClientConfigForModel } from './_config';
import { handleStreamResponse, performWebSearch } from './_utils';
import { apiHandler } from '@/lib/api/handler';
import { createErrorResponse, createStreamResponse } from '@/lib/api/response';
import { AiRoleEnum, Message } from '@/types/ai-assistant';

export const runtime = 'edge';

/**
 * 处理AI模型请求并返回流式响应
 */

const handleAiRequest = apiHandler(async (req: NextRequest) => {
  const { messages, model, isWebSearchEnabled } = await req.json();
  // const origin = req.nextUrl.origin; // 不再需要获取 origin

  if (!model) {
    return createErrorResponse({
      message: '没有提供有效的模型',
    });
  }

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return createErrorResponse({
      message: '没有提供有效的消息',
    });
  }

  // 获取客户端配置
  const clientConfig = getClientConfigForModel(model);
  const aiClient = new OpenAI(clientConfig);

  // 准备发送给 AI 的消息数组
  const messagesForAI: Message[] = [...messages];

  // 如果启用了 Web 搜索
  if (isWebSearchEnabled) {
    const userQuery = messages[messages.length - 1]?.content;
    if (typeof userQuery === 'string' && userQuery.trim()) {
      try {
        // 调用 performWebSearch 时不再传递 origin
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
        console.error('[API Route] Web search failed:', searchError);
        // 搜索失败时，选择性忽略，让 AI 继续处理原始消息
      }
    }
  }

  // 构建请求参数，使用可能被修改过的 messagesForAI
  const requestOptions = {
    model: model,
    messages: messagesForAI as ChatCompletionCreateParams['messages'],
    stream: true,
  };

  try {
    // 调用AI API获取流式响应
    const response = await aiClient.chat.completions.create(requestOptions);

    // 创建流处理管道
    const stream = new ReadableStream({
      async start(controller) {
        await handleStreamResponse({
          response: response as AsyncIterable<ChatCompletionChunk>,
          controller,
        });
      },
    });

    // 返回流式响应
    return createStreamResponse(stream);
  } catch (error) {
    console.error('AI API调用错误:', error);

    // Extract status and message from OpenAI error if possible
    let status = 500;
    let message = '调用 AI 服务时发生未知错误。';

    if (error instanceof OpenAI.APIError) {
      status = error.status || 500;
      message = error.message; // Use the specific message from OpenAI
      // You might want to log error.type or error.code as well
      console.error(
        `OpenAI API Error: Status ${status}, Message: ${message}, Type: ${error.type}, Code: ${error.code}`,
      );
    } else if (error instanceof Error) {
      message = error.message; // Use generic error message
    }

    // 使用 createErrorResponse 返回结构化错误
    return createErrorResponse({
      message: message,
      statusCode: status,
    });
  }
});

export const POST = handleAiRequest;
