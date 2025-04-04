import { NextRequest } from 'next/server';
import OpenAI from 'openai';
import type {
  ChatCompletionChunk,
  ChatCompletionCreateParams,
} from 'openai/resources';

// 预设API配置
const API_CONFIG = {
  DEEPSEEK: {
    baseURL: 'https://a.henhuoai.com/v1',
    apiKey: process.env.HENHUO_API_KEY,
    models: ['deepseek-ai/DeepSeek-R1', 'DeepSeek-V3-0324'],
  },
  GOOGLE: {
    baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai',
    apiKey: process.env.GEMINI_API_KEY,
    models: [
      'gemini-2.5-pro-exp-03-25',
      'gemini-2.0-flash',
      'gemini-1.5-pro-latest',
    ],
  },
};

// 消息类型定义
type Message = { role: string; content: string };
type StreamChunkType = 'text' | 'think';

/**
 * 根据模型名称获取适当的API客户端配置
 */
function getClientConfigForModel(modelName: string) {
  if (API_CONFIG.DEEPSEEK.models.includes(modelName)) {
    return {
      apiKey: API_CONFIG.DEEPSEEK.apiKey,
      baseURL: API_CONFIG.DEEPSEEK.baseURL,
    };
  }

  if (API_CONFIG.GOOGLE.models.includes(modelName)) {
    return {
      apiKey: API_CONFIG.GOOGLE.apiKey,
      baseURL: API_CONFIG.GOOGLE.baseURL,
    };
  }

  // 默认使用Gemini配置
  return {
    apiKey: API_CONFIG.GOOGLE.apiKey,
    baseURL: API_CONFIG.GOOGLE.baseURL,
  };
}

/**
 * 将数据编码为SSE格式
 */
function encodeSSEMessage(type: StreamChunkType, message: string) {
  const encoder = new TextEncoder();
  return encoder.encode(`data: ${JSON.stringify({ type, message })}\n\n`);
}

/**
 * 处理流式响应中的内容块
 */
async function handleStreamResponse(
  response: AsyncIterable<ChatCompletionChunk>,
  controller: ReadableStreamDefaultController & {
    enqueue: (chunk: Uint8Array) => void;
    error: (err: Error) => void;
    close: () => void;
  },
) {
  const encoder = new TextEncoder();
  let isThinkMode = false;
  let isFirstTextBlock = true;
  let isFirstThinkBlock = true;

  try {
    // 处理流式响应
    for await (const chunk of response) {
      const content = chunk.choices[0]?.delta?.content || '';
      // 获取推理内容（如果存在）
      const reasoning =
        ((chunk.choices[0]?.delta as Record<string, unknown>)
          ?.reasoning as string) || '';
      const trimmedContent = content.trim();

      // 处理reasoning属性（某些模型专有）
      if (reasoning) {
        let processedReasoning = reasoning.replace(/\\n/g, '\n');

        if (isFirstThinkBlock && processedReasoning) {
          processedReasoning = processedReasoning.replace(/^[\n\r]+/, '');
          isFirstThinkBlock = false;
        }

        controller.enqueue(encodeSSEMessage('think', processedReasoning));
        continue;
      }

      // 处理<think>标签
      if (trimmedContent === '<think>') {
        isThinkMode = true;
        continue;
      }

      if (trimmedContent === '</think>') {
        isThinkMode = false;
        continue;
      }

      // 有实际内容时进行处理
      if (content) {
        let processedContent = content.replace(/\\n/g, '\n');
        if (isThinkMode) {
          // 处理思考内容

          if (isFirstThinkBlock && processedContent) {
            processedContent = processedContent.replace(/^[\n\r]+/, '');
            isFirstThinkBlock = false;
          }

          controller.enqueue(encodeSSEMessage('think', processedContent));
        } else {
          if (isFirstTextBlock && processedContent) {
            processedContent = processedContent.replace(/^[\n\r]+/, '');
            isFirstTextBlock = false;
          }

          controller.enqueue(encodeSSEMessage('text', processedContent));
        }
      }
    }

    // 发送完成标记并关闭控制器
    controller.enqueue(encoder.encode('data: [DONE]\n\n'));
    controller.close();
  } catch (streamError) {
    console.error('[流数据处理错误]', streamError);
    try {
      // 发送错误信息给客户端
      controller.enqueue(encodeSSEMessage('text', '\n\n[连接中断，请重试]'));
      controller.enqueue(encoder.encode('data: [DONE]\n\n'));
      controller.close();
    } catch (closeError) {
      console.log(
        '[关闭控制器失败]',
        closeError instanceof Error ? closeError.message : '未知错误',
      );
    }
    throw streamError;
  }
}

/**
 * 处理AI模型请求并返回流式响应
 */
async function handleAIModelRequest(messages: Message[], modelName: string) {
  // 获取客户端配置
  const clientConfig = getClientConfigForModel(modelName);
  const aiClient = new OpenAI({
    ...clientConfig,
    timeout: 60000, // 设置60秒超时
    maxRetries: 3, // 最多重试3次
  });

  // 构建请求参数
  const requestOptions = {
    model: modelName,
    messages: messages as ChatCompletionCreateParams['messages'],
    stream: true,
  };

  const requestStartTime = Date.now();
  console.log(
    `[AI请求开始] 模型: ${modelName}, 时间: ${new Date().toISOString()}`,
  );

  try {
    // 调用AI API获取流式响应
    const response = await aiClient.chat.completions.create(requestOptions);

    // 创建流处理管道
    const stream = new ReadableStream({
      async start(controller) {
        try {
          let lastChunkTime = Date.now();
          let chunkCount = 0;
          let isControllerClosed = false;

          // 设置30秒心跳检测，防止长时间无响应
          const heartbeatInterval = setInterval(() => {
            if (isControllerClosed) {
              clearInterval(heartbeatInterval);
              return;
            }

            const now = Date.now();
            if (now - lastChunkTime > 30000) {
              console.error(
                `[AI心跳超时] 已有${(now - lastChunkTime) / 1000}秒未收到数据`,
              );
              clearInterval(heartbeatInterval);
              if (!isControllerClosed) {
                controller.error(new Error('流式响应超时'));
                isControllerClosed = true;
              }
            }
          }, 5000);

          // 处理流式响应
          await handleStreamResponse(
            response as AsyncIterable<ChatCompletionChunk>,
            {
              ...controller,
              enqueue: (chunk) => {
                // 防止向已关闭的控制器发送数据
                if (isControllerClosed) {
                  return;
                }

                try {
                  lastChunkTime = Date.now();
                  chunkCount++;
                  // 记录每10个数据块的进度
                  if (chunkCount % 10 === 0) {
                    console.log(`[AI响应进度] 已接收${chunkCount}个数据块`);
                  }
                  controller.enqueue(chunk);
                } catch (enqueueErr) {
                  console.log('[数据块处理错误]', enqueueErr);
                  isControllerClosed = true;
                }
              },
              error: (err) => {
                isControllerClosed = true;
                controller.error(err);
              },
              close: () => {
                isControllerClosed = true;
                try {
                  controller.close();
                } catch (closeErr) {
                  // 忽略已关闭控制器的错误
                  console.log(
                    '[控制器已关闭]',
                    closeErr instanceof Error ? closeErr.message : '未知错误',
                  );
                }
              },
            },
          );

          clearInterval(heartbeatInterval);
          console.log(
            `[AI请求完成] 总用时: ${(Date.now() - requestStartTime) / 1000}秒, 数据块: ${chunkCount}`,
          );
        } catch (error) {
          console.error('流处理错误:', error);
          // 避免重复抛出错误
          try {
            controller.error(error);
          } catch (e) {
            console.log('[控制器错误处理失败]', e);
          }
        }
      },
      cancel() {
        console.log('[AI请求取消] 客户端断开连接');
        // 客户端断开时，我们什么都不做，让OpenAI的响应自然完成或超时
      },
    });

    // 返回流式响应
    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
      },
    });
  } catch (error: unknown) {
    const err = error as Error & { status?: number };
    console.error(`[AI API错误] ${err.message}`, error);
    // 返回详细的错误信息给客户端
    return new Response(
      JSON.stringify({
        error: '连接AI服务出错',
        details: err.message,
        code: err.status || 500,
        time: new Date().toISOString(),
      }),
      {
        status: err.status || 500,
        headers: { 'Content-Type': 'application/json' },
      },
    );
  }
}

/**
 * POST请求处理器 - 用于流式响应和其他操作
 */
export async function POST(req: NextRequest) {
  try {
    const requestData = await req.json();
    const { messages, model } = requestData;
    const modelName = model || 'gemini-2.5-pro-exp-03-25';

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return new Response(JSON.stringify({ error: '没有提供有效的消息' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    try {
      return await handleAIModelRequest(messages, modelName);
    } catch (error: unknown) {
      const err = error as Error & { status?: number };
      console.error('[AI处理错误]', err);
      return new Response(
        JSON.stringify({
          error: '处理AI请求时出错',
          details: err.message,
          code: err.status || 500,
          time: new Date().toISOString(),
        }),
        {
          status: err.status || 500,
          headers: { 'Content-Type': 'application/json' },
        },
      );
    }
  } catch (error: unknown) {
    const err = error as Error;
    console.error('[请求解析错误]', err);
    return new Response(
      JSON.stringify({
        error: '服务器处理请求时出错',
        details: err.message,
        time: new Date().toISOString(),
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      },
    );
  }
}
