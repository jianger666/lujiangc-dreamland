export interface MarathonPlanFormData {
  raceName: string;
  raceDate: Date;
  trainingStartDate: Date;
  marathonType: 'half' | 'full';
  currentPB?: number;
  targetTime: number;
  currentWeeklyMileage: number;
  experienceLevel: 'newbie' | 'intermediate' | 'advanced';
  maxHeartRate: number;
  lactateThresholdHeartRate?: number;
  trainingSchedule: {
    day: string;
    label: string;
    enabled: boolean;
    duration: number;
  }[];
  additionalNotes?: string;
}

export interface ScheduleResponse {
  schedule: string; // AI生成的markdown课表
  success: boolean;
  error?: string;
}

export const WEEKDAYS = [
  { value: 'monday', label: '周一' },
  { value: 'tuesday', label: '周二' },
  { value: 'wednesday', label: '周三' },
  { value: 'thursday', label: '周四' },
  { value: 'friday', label: '周五' },
  { value: 'saturday', label: '周六' },
  { value: 'sunday', label: '周日' },
] as const;

export const MARATHON_TYPES = [
  { value: 'half', label: '半马' },
  { value: 'full', label: '全马' },
] as const;
