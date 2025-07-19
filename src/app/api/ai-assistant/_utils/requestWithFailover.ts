import OpenAI from "openai";
import type {
  ChatCompletion,
  ChatCompletionChunk,
  ChatCompletionCreateParamsNonStreaming,
  ChatCompletionCreateParamsStreaming,
} from "openai/resources";
import { shuffle } from "lodash";
import { getClientConfigForModel } from "../_config";
import { AIModelEnum } from "@/types/ai-assistant";

/**
 * 检查消息是否包含多模态内容（图片+文本）
 * @param messages 消息数组
 * @returns 布尔值，表示是否包含多模态内容
 */
function containsMultiModalContent(messages: any[]): boolean {
  return messages.some((message) => {
    return (
      Array.isArray(message.content) &&
      message.content.some((item: any) => item.type === "image_url")
    );
  });
}

/**
 * 尝试使用指定模型的可用配置进行 OpenAI Chat Completion 调用，并实现失败重试。
 * 支持流式和非流式请求，以及多模态内容（图片+文本）。
 *
 * @param selectedModel - 用户选择的 AI 模型。
 * @param requestOptions - OpenAI API 请求的基础选项 (不含 model, baseURL, apiKey)。
 * @returns 成功时返回 OpenAI API 的响应 (流式或非流式)。
 * @throws 如果没有找到有效的配置或所有尝试都失败，则抛出错误。
 */
export async function tryChatCompletionWithFailover(
  selectedModel: AIModelEnum,
  requestOptions: Omit<
    | ChatCompletionCreateParamsStreaming
    | ChatCompletionCreateParamsNonStreaming,
    "model"
  >,
): Promise<AsyncIterable<ChatCompletionChunk> | ChatCompletion> {
  const configurationsRaw = getClientConfigForModel(selectedModel);

  const shuffledConfigs = shuffle(configurationsRaw);
  const errors: unknown[] = [];

  // 检查是否包含多模态内容
  const hasMultiModalContent = containsMultiModalContent(
    requestOptions.messages,
  );

  // 如果包含多模态内容，过滤出支持多模态的模型实例
  const configs = hasMultiModalContent
    ? shuffledConfigs.filter((config) => {
        // 这里可以根据实际需求添加支持多模态的模型判断
        // 目前支持图片的模型主要有：
        // 1. 智谱的glm-4v系列
        // 2. Google的gemini系列
        return (
          config.modelId.includes("glm-4v") || config.modelId.includes("gemini")
        );
      })
    : shuffledConfigs;

  if (hasMultiModalContent && configs.length === 0) {
    throw new Error("没有找到支持多模态内容（图片）的模型实例");
  }

  for (const config of configs) {
    try {
      console.log(
        `[Failover] 尝试使用 Provider: ${config.provider}, Model: ${config.modelId}`,
      );
      const aiClient = new OpenAI({
        baseURL: config.baseURL,
        apiKey: config.apiKey,
      });

      const finalRequestOptions = {
        ...requestOptions,
        model: config.modelId,
      };

      if (finalRequestOptions.stream) {
        const response = await aiClient.chat.completions.create(
          finalRequestOptions as ChatCompletionCreateParamsStreaming,
        );
        console.log(
          `[Failover] 成功: Provider: ${config.provider}, Model: ${config.modelId}`,
        );
        return response as AsyncIterable<ChatCompletionChunk>;
      } else {
        const response = await aiClient.chat.completions.create(
          finalRequestOptions as ChatCompletionCreateParamsNonStreaming,
        );
        console.log(
          `[Failover] 成功: Provider: ${config.provider}, Model: ${config.modelId}`,
        );
        return response as ChatCompletion;
      }
    } catch (error) {
      console.error(
        `[Failover] 失败: Provider: ${config.provider}, Model: ${config.modelId}`,
        error,
      );
      errors.push({
        provider: config.provider,
        model: config.modelId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  console.error("[Failover] 所有尝试均失败。");
  throw new Error(
    `所有可用模型实例均调用失败。详情: ${JSON.stringify(errors, null, 2)}`,
  );
}
