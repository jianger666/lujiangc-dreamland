import httpClient from "@/lib/api/http";

/**
 * 根据对话内容自动生成标题
 * @param userMessage 用户消息
 * @returns 生成的标题
 */
export const generateTitle = async (userMessage: string) => {
  return httpClient.post<string>(
    "/api/ai-assistant/generate-title",
    {
      userMessage,
    },
    { skipErrorHandler: true },
  );
};

// 导出马拉松计划制定相关服务
export * from "./marathon-planner";
