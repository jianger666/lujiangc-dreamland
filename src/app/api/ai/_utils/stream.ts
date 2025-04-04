import type { ChatCompletionChunk } from 'openai/resources';
import { StreamChunkType } from '../_types';

/**
 * 将数据编码为SSE格式
 */
export function encodeSSEMessage(type: StreamChunkType, message: string) {
  const encoder = new TextEncoder();
  return encoder.encode(`data: ${JSON.stringify({ type, message })}\n\n`);
}

/**
 * 处理流式响应中的内容块
 */
export async function handleStreamResponse({
  response,
  controller,
}: {
  response: AsyncIterable<ChatCompletionChunk>;
  controller: ReadableStreamDefaultController;
}) {
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

    // 发送完成标记
    controller.enqueue(encoder.encode('data: [DONE]\n\n'));
    controller.close();
  } catch (error) {
    console.error('流处理错误:', error);
    controller.error(error);
  }
}
