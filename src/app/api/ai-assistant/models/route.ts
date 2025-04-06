import { getAllModels } from '../_config';
import { apiHandler } from '@/lib/api/handler';

/**
 * GET请求处理器 - 返回可用的AI模型列表
 */

const handleGetModels = apiHandler(async () => {
  try {
    return getAllModels();
  } catch (error) {
    console.error('处理获取模型请求错误:', error);
    throw error;
  }
});
export const GET = handleGetModels;
