export interface SearchResult {
  title: string;
  link: string;
  snippet: string;
}

/**
 * 通过调用后端的 /api/web-search 接口执行 Web 搜索
 * @param query 搜索查询
 * @returns 标准化搜索结果数组或 null
 */
export async function performWebSearch(
  query: string,
): Promise<SearchResult[] | null> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000); // 5秒超时

  try {
    // 根据环境确定 baseUrl
    let baseUrl: string;
    if (process.env.NODE_ENV === "development") {
      baseUrl = "http://localhost:3939";
    } else {
      baseUrl = process.env.NEXT_PUBLIC_APP_URL || "";
      if (!baseUrl) {
        console.error(
          "[AI Assistant Utils] Error: NEXT_PUBLIC_APP_URL is not set in non-development environment. Cannot perform web search.",
        );
        return null; // 如果生产 URL 未设置，无法执行搜索
      }
    }

    // 使用 baseUrl 构建完整的 URL
    const apiUrl = `${baseUrl}/api/ai-assistant/web-search?query=${encodeURIComponent(query)}`;

    console.log(
      `[AI Assistant Utils] Fetching web search results from: ${apiUrl}`,
    );

    const response = await fetch(apiUrl, {
      method: "GET",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
      },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(
        `[AI Assistant Utils] Web search API call failed with status ${response.status}: ${errorText}`,
      );
      return null;
    }

    const results: SearchResult[] = await response.json();

    if (results && results.length > 0) {
      console.log(
        `[AI Assistant Utils] Received ${results.length} search results from API.`,
      );
      return results;
    } else {
      console.log(
        "[AI Assistant Utils] Web search API returned no results or empty array.",
      );
      return null;
    }
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error.name === "AbortError") {
      console.error("[AI Assistant Utils] Web search API call timed out.");
    } else {
      console.error(
        "[AI Assistant Utils] Error fetching web search API:",
        error.message || error,
      );
    }
    return null;
  }
}
