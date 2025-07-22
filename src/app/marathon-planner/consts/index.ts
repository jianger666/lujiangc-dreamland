export const MARATHON_TYPES = [
  { value: 'full', label: '全程马拉松' },
  { value: 'half', label: '半程马拉松' },
] as const;

export const EXPERIENCE_LEVELS = [
  { value: 'newbie', label: '新手 (跑龄<1年)' },
  { value: 'intermediate', label: '中级 (跑龄1-3年)' },
  { value: 'advanced', label: '进阶 (跑龄>3年)' },
] as const;

export const EXPERIENCE_LEVEL_MAP = {
  newbie: '新手 (跑龄<1年)',
  intermediate: '中级 (跑龄1-3年)',
  advanced: '进阶 (跑龄>3年)',
} as const;

export const WEEKDAYS = [
  { day: 'Monday', label: '周一' },
  { day: 'Tuesday', label: '周二' },
  { day: 'Wednesday', label: '周三' },
  { day: 'Thursday', label: '周四' },
  { day: 'Friday', label: '周五' },
  { day: 'Saturday', label: '周六' },
  { day: 'Sunday', label: '周日' },
] as const; 