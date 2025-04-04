import { NextResponse } from 'next/server';
import { getAvailableModels } from '../_config';

/**
 * GET请求处理器 - 返回可用的AI模型列表
 */
export async function GET() {
  try {
    const models = getAvailableModels();
    return NextResponse.json({ models });
  } catch (error) {
    console.error('处理获取模型请求错误:', error);
    return NextResponse.json(
      { error: '服务器处理请求时出错' },
      { status: 500 },
    );
  }
}
