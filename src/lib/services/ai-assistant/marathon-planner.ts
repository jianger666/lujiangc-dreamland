import httpClient from '@/lib/api/http';
import {
  MarathonPlanFormData,
  ScheduleResponse,
} from '@/app/marathon-planner/types';

/**
 * 生成马拉松训练课表
 * @param formData 表单数据
 * @returns 生成的课表内容
 */
export const generateMarathonSchedule = async (
  formData: MarathonPlanFormData,
): Promise<ScheduleResponse> => {
  return httpClient.post<ScheduleResponse>(
    '/api/marathon-planner/generate-schedule',
    formData,
    { skipErrorHandler: true },
  );
};
