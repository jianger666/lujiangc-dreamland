import { NextRequest } from 'next/server';
import { apiHandler } from '@/lib/api/handler';
import { createStreamResponse } from '@/lib/api/response';
import { AIModelEnum, AiRoleEnum } from '@/types/ai-assistant';
import {
  tryChatCompletionWithFailover,
  handleStreamResponse,
  createStreamErrorResponse,
} from '@/app/api/ai-assistant/_utils';
import { formatTargetTime, formatDateString } from '@/lib/utils';
import { readPromptMarkdown } from '@/lib/utils/prompt-loader';
import { MarathonPlanFormData } from '@/app/marathon-planner/types';
import { EXPERIENCE_LEVEL_MAP } from '@/app/marathon-planner/consts';
import type { ChatCompletionChunk } from 'openai/resources';

const handleGenerateSchedule = apiHandler(async (req: NextRequest) => {
  try {
    const formData: MarathonPlanFormData = await req.json();

    const {
      marathonType,
      currentPB,
      targetTime,
      raceDate,
      trainingStartDate,
      trainingSchedule: trainingScheduleData,
      experienceLevel,
      ...restFormData
    } = formData;

    const trainingSchedule = trainingScheduleData
      .filter((item) => item.enabled)
      .map((item) => `${item.label}(${item.duration}分钟)`)
      .join(', ');

    const variables = {
      ...restFormData,
      raceDate: formatDateString(new Date(raceDate)),
      trainingStartDate: formatDateString(new Date(trainingStartDate)),
      marathonType: marathonType === 'half' ? '半程马拉松' : '全程马拉松',
      experienceLevel: EXPERIENCE_LEVEL_MAP[experienceLevel],
      currentPB: currentPB ? formatTargetTime(currentPB) : '无',
      targetTime: formatTargetTime(targetTime),
      currentWeeklyMileage: formData.currentWeeklyMileage.toString(),
      maxHeartRate: formData.maxHeartRate.toString(),
      lactateThresholdHeartRate:
        formData.lactateThresholdHeartRate?.toString() || '未提供',
      trainingSchedule,
      additionalNotes: formData.additionalNotes || '无特殊要求',
    };

    const prompt = readPromptMarkdown(
      'prompts/marathon-schedule.md',
      variables
    );

    const requestOptions = {
      messages: [{ role: AiRoleEnum.User, content: prompt }],
      stream: true,
      temperature: 0.7,
    };

    const response = (await tryChatCompletionWithFailover(
      AIModelEnum.DeepSeekV31,
      requestOptions
    )) as AsyncIterable<ChatCompletionChunk>;

    const stream = new ReadableStream({
      async start(controller) {
        await handleStreamResponse({
          response: response,
          controller,
        });
      },
    });

    return createStreamResponse(stream);
  } catch (error) {
    console.error('生成马拉松课表错误:', error);
    const errorMessage =
      error instanceof Error ? error.message : '生成训练计划时出错，请稍后重试';
    return createStreamErrorResponse(
      `生成训练计划时遇到了问题：${errorMessage}\n\n请检查您的输入信息并重试，或稍后再试。如果问题持续存在，请联系技术支持。`
    );
  }
});

export const POST = handleGenerateSchedule;
