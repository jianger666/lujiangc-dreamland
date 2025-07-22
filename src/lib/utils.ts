import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * 将分钟数格式化为 "X小时Y分钟" 的字符串，用于表单描述
 * @param minutes 分钟数
 * @returns 格式化的时间字符串，例如 "约等于：3小时30分钟"
 */
export const formatTime = (minutes: number): string => {
  if (!minutes || minutes <= 0) return '';
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (hours === 0) {
    return `即 ${remainingMinutes}分钟`;
  } else if (remainingMinutes === 0) {
    return `即 ${hours}小时`;
  } else {
    return `即 ${hours}小时${remainingMinutes}分钟`;
  }
};

/**
 * 将分钟数格式化为 "X小时Y分钟" 的字符串，用于AI提示词
 * @param minutes 分钟数
 * @returns 格式化的时间字符串
 */
export function formatTargetTime(minutes: number): string {
  if (!minutes || minutes <= 0) return '未指定';
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (hours > 0 && remainingMinutes > 0) {
    return `${hours}小时${remainingMinutes}分钟`;
  }
  if (hours > 0) {
    return `${hours}小时`;
  }
  return `${remainingMinutes}分钟`;
}

/**
 * 将日期对象格式化为 "YYYY年M月D日"
 * @param date 日期对象
 * @returns 格式化的日期字符串
 */
export function formatDateString(date: Date): string {
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}
