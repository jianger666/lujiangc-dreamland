import { NextRequest } from 'next/server';
import { apiHandler } from '@/lib/api/handler';
import { createErrorResponse, createStreamResponse } from '@/lib/api/response';
import { AIModelEnum, AiRoleEnum } from '@/types/ai-assistant';
import {
  tryChatCompletionWithFailover,
  handleStreamResponse,
  createStreamErrorResponse,
} from '@/app/api/ai-assistant/_utils';
import {
  readPromptMarkdown,
  formatTargetTime,
  formatDateString,
} from '@/lib/utils/prompt-loader';
import { MarathonPlanFormData, WEEKDAYS } from '@/app/marathon-planner/types';
import type { ChatCompletionChunk } from 'openai/resources';

/**
 * POST处理器 - 生成马拉松训练课表
 */
const handleGenerateSchedule = apiHandler(async (req: NextRequest) => {
  try {
    const formData: MarathonPlanFormData = await req.json();

    // 验证必填字段
    const {
      raceName,
      raceDate,
      trainingStartDate,
      marathonType,
      targetTime,
      trainingDays,
      dailyTrainingTime,
      currentPB,
    } = formData;

    if (
      !raceName ||
      !raceDate ||
      !marathonType ||
      !targetTime ||
      !trainingDays ||
      !dailyTrainingTime
    ) {
      return createErrorResponse({
        message: '缺少必填字段',
        statusCode: 400,
      });
    }

    // 格式化训练安排
    const trainingSchedule = trainingDays
      .map((day) => {
        const dayLabel = WEEKDAYS.find((w) => w.value === day)?.label || day;
        const timeInMinutes = dailyTrainingTime[day] || 0;
        const timeFormatted =
          timeInMinutes >= 60
            ? `${Math.floor(timeInMinutes / 60)}小时${timeInMinutes % 60 > 0 ? `${timeInMinutes % 60}分钟` : ''}`
            : `${timeInMinutes}分钟`;
        return `${dayLabel}: ${timeFormatted}`;
      })
      .join('、');

    // 准备提示词变量
    const variables = {
      raceName,
      currentPB: currentPB ? currentPB.toString() : '',
      raceDate: formatDateString(new Date(raceDate)),
      trainingStartDate: formatDateString(
        trainingStartDate ? new Date(trainingStartDate) : new Date()
      ),
      marathonType: marathonType === 'half' ? '半程马拉松' : '全程马拉松',
      targetTime: formatTargetTime(targetTime),
      trainingSchedule,
      additionalNotes: formData.additionalNotes || '无特殊要求',
    };

    // 读取并处理提示词模板
    const prompt = readPromptMarkdown(
      'prompts/marathon-schedule.md',
      variables
    );

    // 准备AI请求选项
    const requestOptions = {
      messages: [{ role: AiRoleEnum.User, content: prompt }],
      stream: true,
      temperature: 0.7,
    };

    // 调用AI生成课表 - 流式响应
    const response = (await tryChatCompletionWithFailover(
      AIModelEnum.Default,
      requestOptions
    )) as AsyncIterable<ChatCompletionChunk>;

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
    console.error('生成马拉松课表错误:', error);

    // 返回流式错误响应，保持与前端的一致性
    const errorMessage =
      error instanceof Error ? error.message : '生成训练计划时出错，请稍后重试';

    // 使用统一的流式错误响应函数
    return createStreamErrorResponse(
      `生成训练计划时遇到了问题：${errorMessage}\n\n请检查您的输入信息并重试，或稍后再试。如果问题持续存在，请联系技术支持。`
    );
  }
});

export const POST = handleGenerateSchedule;
