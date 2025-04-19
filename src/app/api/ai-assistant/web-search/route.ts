import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import {
  search as searchDuckDuckGoScrape,
  SafeSearchType,
} from 'duck-duck-scrape';
import { apiHandler } from '@/lib/api/handler';
import { createErrorResponse } from '@/lib/api/response';

// 定义搜索结果接口 (与 _utils/web-search.ts 中一致)
interface SearchResult {
  title: string;
  link: string;
  snippet: string;
}

const customsearch = google.customsearch('v1');

// --- searchGoogle 函数 ---
async function searchGoogle(query: string): Promise<SearchResult[] | null> {
  const apiKey = process.env.GOOGLE_CUSTOM_SEARCH_KEY;
  const cseId = process.env.GOOGLE_CSE_ID;

  if (!apiKey || !cseId) {
    console.warn('[WebSearch Route] Google API Key or CSE ID not configured.');
    return null;
  }

  try {
    console.log(`[WebSearch Route] Performing Google search for: "${query}"`);
    const res = await customsearch.cse.list({
      auth: apiKey,
      cx: cseId,
      q: query,
      num: 5,
    });

    if (res.data.items && res.data.items.length > 0) {
      console.log(
        `[WebSearch Route] Google search found ${res.data.items.length} results.`,
      );
      return res.data.items
        .map((item) => ({
          title: item.title || '',
          link: item.link || '',
          snippet: item.snippet || '',
        }))
        .filter((item) => item.title && item.link && item.snippet);
    } else {
      console.log('[WebSearch Route] Google search returned no results.');
      return null;
    }
  } catch (error: any) {
    if (
      error.code === 429 ||
      (error.errors &&
        error.errors.some((e: any) => e.reason === 'quotaExceeded'))
    ) {
      console.warn('[WebSearch Route] Google Search Quota Exceeded.');
      return null; // 返回 null 以触发 fallback
    }
    console.error(
      '[WebSearch Route] Google Search Error:',
      error.message || error,
    );
    return null; // 其他 Google 错误也触发 fallback
  }
}

// --- searchDuckDuckGoFree 函数 ---
async function searchDuckDuckGoFree(
  query: string,
): Promise<SearchResult[] | null> {
  try {
    console.log(
      `[WebSearch Route] Performing DuckDuckGo (scrape) search for: "${query}"`,
    );
    const searchResults = await searchDuckDuckGoScrape(query, {
      safeSearch: SafeSearchType.STRICT,
    });

    if (searchResults.noResults) {
      console.log('[WebSearch Route] DuckDuckGo (scrape) returned no results.');
      return null;
    }

    const topResults = searchResults.results.slice(0, 5);

    console.log(
      `[WebSearch Route] DuckDuckGo (scrape) found ${topResults.length} results.`,
    );
    console.log('topResults', topResults);
    return topResults
      .map((item: any) => ({
        title: item.title || '',
        link: item.url || '',
        snippet: item.description || item.rawDescription || item.snippet || '',
      }))
      .filter((item: SearchResult) => item.title && item.link && item.snippet);
  } catch (error: any) {
    console.error(
      '[WebSearch Route] DuckDuckGo (scrape) Search Error:',
      error.message || error,
    );
    return null;
  }
}

// --- API 处理函数 ---
const handleSearchRequest = apiHandler(async (req: NextRequest) => {
  const { searchParams } = new URL(req.url);
  const query = searchParams.get('query');

  if (!query) {
    return createErrorResponse({
      message: '缺少搜索查询参数 (query)',
      statusCode: 400,
    });
  }

  try {
    // 1. 尝试 Google 搜索
    let results = await searchGoogle(query);

    // 2. 如果 Google 失败或无结果，尝试 DuckDuckGo
    if (!results || results.length === 0) {
      console.log(
        '[WebSearch Route] Google failed or no results, falling back to DuckDuckGo.',
      );
      results = await searchDuckDuckGoFree(query);
    }

    // 3. 返回结果或空数组
    if (results && results.length > 0) {
      console.log(`[WebSearch Route] Returning ${results.length} results.`);
      return NextResponse.json(results);
    } else {
      console.log('[WebSearch Route] No results found from any provider.');
      return NextResponse.json([]); // 返回空数组表示没有找到结果
    }
  } catch (error: any) {
    console.error('[WebSearch Route] Unexpected error:', error);
    return createErrorResponse({
      message: '执行网页搜索时发生内部错误',
      statusCode: 500,
    });
  }
});

// --- 导出 GET 方法 ---
// 使用 GET 更符合 RESTful 风格，因为搜索是幂等的
export const GET = handleSearchRequest;
