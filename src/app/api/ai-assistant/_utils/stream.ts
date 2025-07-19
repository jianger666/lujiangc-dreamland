import type { ChatCompletionChunk } from "openai/resources";
import { AiStreamChunkTypeEnum } from "@/types/ai-assistant";

/**
 * 将数据编码为SSE格式
 */
export function encodeSSEMessage(type: AiStreamChunkTypeEnum, message: string) {
  const encoder = new TextEncoder();
  return encoder.encode(`data: ${JSON.stringify({ type, message })}\n\n`);
}

/**
 * @param controller 流控制器
 * @param errorMessage 错误消息
 */
async function generateErrorMessage(
  controller: ReadableStreamDefaultController,
  errorMessage: string,
) {
  controller.enqueue(
    encodeSSEMessage(
      AiStreamChunkTypeEnum.Text,
      "抱歉，我暂时无法处理你的问题：\n" + errorMessage,
    ),
  );
  // 发送完成标记
  const encoder = new TextEncoder();
  controller.enqueue(encoder.encode("data: [DONE]\n\n"));
}

/**
 * 格式化流式错误响应
 * 按照三段式呈现：开头道歉、换行、实际错误信息
 */
export async function formatStreamError(
  controller: ReadableStreamDefaultController,
  errorMessage: string,
) {
  // 使用共享函数生成三段式错误消息
  await generateErrorMessage(controller, errorMessage);

  // 关闭流
  controller.close();
}

/**
 * 创建流式错误响应
 * 将错误信息以SSE格式返回，使前端能够正确解析
 * 按照三段式呈现：开头道歉、换行、实际错误信息
 * @param errorMessage 错误消息
 */
export function createStreamErrorResponse(errorMessage: string): Response {
  const stream = new ReadableStream({
    async start(controller) {
      // 使用共享函数生成三段式错误消息
      await generateErrorMessage(controller, errorMessage);
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
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
      const content = chunk.choices[0]?.delta?.content || "";
      // 获取推理内容（如果存在）
      const reasoning =
        ((chunk.choices[0]?.delta as Record<string, unknown>)
          ?.reasoning as string) || "";
      const trimmedContent = content.trim();

      // 处理reasoning属性（某些模型专有）
      if (reasoning) {
        let processedReasoning = reasoning.replace(/\\n/g, "\n");

        if (isFirstThinkBlock && processedReasoning) {
          processedReasoning = processedReasoning.replace(/^[\n\r]+/, "");
          isFirstThinkBlock = false;
        }

        controller.enqueue(
          encodeSSEMessage(AiStreamChunkTypeEnum.Think, processedReasoning),
        );
        continue;
      }

      // 处理<think>标签
      if (trimmedContent === "<think>") {
        isThinkMode = true;
        continue;
      }

      if (trimmedContent === "</think>") {
        isThinkMode = false;
        continue;
      }

      // 有实际内容时进行处理
      if (content) {
        let processedContent = content.replace(/\\n/g, "\n");

        if (isThinkMode) {
          // 处理思考内容
          if (isFirstThinkBlock && processedContent) {
            processedContent = processedContent.replace(/^[\n\r]+/, "");
            isFirstThinkBlock = false;
          }

          controller.enqueue(
            encodeSSEMessage(AiStreamChunkTypeEnum.Think, processedContent),
          );
        } else {
          if (isFirstTextBlock && processedContent) {
            processedContent = processedContent.replace(/^[\n\r]+/, "");
            isFirstTextBlock = false;
          }

          controller.enqueue(
            encodeSSEMessage(AiStreamChunkTypeEnum.Text, processedContent),
          );
        }
      }
    }

    // 发送完成标记
    controller.enqueue(encoder.encode("data: [DONE]\n\n"));
    controller.close();
  } catch (error) {
    console.error("流处理错误:", error);

    // 处理错误，将错误信息以三段式格式发送给前端
    try {
      // 获取错误消息
      const errorMessage = (error as Error).message ?? "处理AI响应时发生错误。";

      // 使用格式化函数发送三段式错误
      await formatStreamError(controller, errorMessage);
    } catch (formatError) {
      // 如果格式化错误消息时出错，记录并最终调用error
      console.error("格式化错误消息时出错:", formatError);
      controller.error(error);
    }
  }
}
