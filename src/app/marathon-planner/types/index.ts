export interface MarathonPlanFormData {
  raceName: string; // 比赛名称
  raceDate: Date; // 比赛日期
  trainingStartDate?: Date; // 训练开始日期（可选，默认今天）
  marathonType: "half" | "full"; // 马拉松类型
  currentPB?: number; // 当前PB(分钟)
  targetTime: number; // 目标成绩(分钟)
  trainingDays: string[]; // 训练日期(周一到周日)
  dailyTrainingTime: Record<string, number>; // 每日训练时长
  additionalNotes?: string; // 额外备注
}

export interface ScheduleResponse {
  schedule: string; // AI生成的markdown课表
  success: boolean;
  error?: string;
}

export const WEEKDAYS = [
  { value: "monday", label: "周一" },
  { value: "tuesday", label: "周二" },
  { value: "wednesday", label: "周三" },
  { value: "thursday", label: "周四" },
  { value: "friday", label: "周五" },
  { value: "saturday", label: "周六" },
  { value: "sunday", label: "周日" },
] as const;

export const MARATHON_TYPES = [
  { value: "half", label: "半马" },
  { value: "full", label: "全马" },
] as const;
