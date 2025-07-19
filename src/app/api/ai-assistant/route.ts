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
  tryChatCompletionWithFailover,
  createSearchResultsPrompt,
} from './_utils';
import { apiHandler } from '@/lib/api/handler';
import { createStreamResponse } from '@/lib/api/response';
import { AIModelEnum, AiRoleEnum, Message } from '@/types/ai-assistant';
import { generateUUID } from '@/lib';
import { getClientConfigForModel } from './_config';

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
 * 检查模型实例是否支持图片处理
 * @param modelEnum 选择的AI模型枚举值
 * @returns 布尔值，表示模型是否支持图片处理
 */
function doesModelSupportImages(modelEnum: AIModelEnum): boolean {
  // 获取模型配置
  const modelConfig = getClientConfigForModel(modelEnum);

  // 检查模型实例中是否有支持图片的模型
  const imageReaderInstances = getClientConfigForModel(AIModelEnum.ImageReader);
  const imageReaderModelIds = imageReaderInstances.map(
    (instance) => instance.modelId
  );

  // 检查选定模型的实例是否与ImageReader的实例有重叠
  return modelConfig.some((config) =>
    imageReaderModelIds.includes(config.modelId)
  );
}

/**
 * 处理AI模型请求并返回流式响应
 */
const handleAiRequest = apiHandler(async (req: NextRequest) => {
  const { messages, selectedModel, isWebSearchEnabled, imageDatas } =
    await req.json();

  // 没有selectedModel或者selectedModel不是AIModelEnum的成员
  if (!selectedModel || !Object.values(AIModelEnum).includes(selectedModel)) {
    return handleStreamError('没有提供有效的模型', '参数验证');
  }

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return handleStreamError('没有提供有效的消息', '参数验证');
  }

  // 准备发送给 AI 的消息数组
  const messagesForAI: Message[] = [...messages];

  // 处理图片数据
  let modelToUse = selectedModel as AIModelEnum;

  if (imageDatas && imageDatas.length > 0) {
    console.log('[API Route] 接收到图片数据，数量:', imageDatas.length);

    // 检查当前选择的模型是否支持图片
    const modelSupportsImages = doesModelSupportImages(modelToUse);

    // 如果当前模型不支持图片，则切换到ImageReader
    if (!modelSupportsImages) {
      console.log('[API Route] 当前模型不支持图片，切换到ImageReader');
      modelToUse = AIModelEnum.ImageReader;
    }

    // 确保最后一条消息包含图片数据
    if (messagesForAI.length > 0) {
      const lastMessage = messagesForAI[messagesForAI.length - 1];
      if (lastMessage && lastMessage.role === AiRoleEnum.User) {
        // 添加系统消息告知AI有图片
        const imageText =
          imageDatas.length === 1 ? '一张图片' : `${imageDatas.length}张图片`;
        messagesForAI.splice(messagesForAI.length - 1, 0, {
          id: generateUUID(),
          role: AiRoleEnum.System,
          content: `用户提供了${imageText}，请分析图片内容并回答用户问题。`,
        });
      }
    }
  }

  // 如果启用了 Web 搜索
  if (isWebSearchEnabled) {
    const userQuery = messages[messages.length - 1]?.content;
    if (typeof userQuery === 'string' && userQuery.trim()) {
      try {
        const searchResults = await performWebSearch(userQuery);
        if (searchResults && searchResults.length > 0) {
          // 格式化搜索结果为文本 - 更新提示词并移除数量限制
          const formattedResults = searchResults
            // .slice(0, 3) // 移除数量限制
            .map(
              (r, i) =>
                `[RESULT ${i + 1}]\nTitle: ${r.title}\nLink: ${r.link}\nSnippet: ${r.snippet}`
            )
            .join('\n\n');

          // 使用导入的函数生成提示词
          const searchResultsText = createSearchResultsPrompt({
            formattedResults,
          });

          // 在用户最新消息之前插入包含搜索结果的系统消息
          messagesForAI.splice(messagesForAI.length - 1, 0, {
            id: generateUUID(),
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
    // 准备基础请求选项
    const baseRequestOptions: Omit<ChatCompletionCreateParams, 'model'> = {
      messages: messagesForAI as ChatCompletionCreateParams['messages'],
      stream: true,
    };

    // 如果有图片数据且是最后一条消息的图片，则添加到请求选项中
    if (
      imageDatas &&
      imageDatas.length > 0 &&
      modelToUse === AIModelEnum.ImageReader
    ) {
      // 对于支持多模态的API，添加图片到最后一条用户消息中
      // 注意：这里的实现方式取决于模型的API要求
      const lastMessageIndex = messagesForAI.length - 1;
      if (
        lastMessageIndex >= 0 &&
        messagesForAI[lastMessageIndex].role === AiRoleEnum.User
      ) {
        // 修改传递格式使其符合OpenAI multimodal API的格式，支持多张图片
        const content = [
          { type: 'text', text: messagesForAI[lastMessageIndex].content },
          ...imageDatas.map((imageData: string) => ({
            type: 'image_url',
            image_url: { url: imageData },
          })),
        ];
        (baseRequestOptions.messages as any)[lastMessageIndex].content =
          content;
      }
    }

    // 调用带故障转移的请求函数，传递 modelToUse
    const response = (await tryChatCompletionWithFailover(
      modelToUse, // 使用可能已切换的模型
      baseRequestOptions
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
