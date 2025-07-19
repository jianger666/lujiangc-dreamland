import fs from 'fs';
import path from 'path';

/**
 * 读取提示词markdown文件并替换变量
 * @param relativePath 相对于项目根目录的提示词文件路径
 * @param variables 要替换的变量对象
 * @returns 处理后的提示词内容
 */
export function readPromptMarkdown(
  relativePath: string,
  variables: Record<string, string> = {},
): string {
  try {
    // 获取项目根目录路径
    const projectRoot = process.cwd();
    const mdPath = path.resolve(projectRoot, relativePath);

    // 读取markdown文件
    let content = fs.readFileSync(mdPath, 'utf-8');

    // 替换变量
    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`{{${key}}}`, 'g');
      content = content.replace(regex, value);
    }

    return content;
  } catch (error) {
    console.error('读取提示词文件失败:', error);
    throw new Error(`无法读取提示词文件: ${relativePath}`);
  }
}

/**
 * 格式化训练时间显示
 * @param minutes 训练时长（分钟）
 * @returns 格式化后的时间字符串
 */
export function formatTrainingTime(minutes: number): string {
  if (minutes < 60) {
    return `${minutes}分钟`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (remainingMinutes === 0) {
    return `${hours}小时`;
  }

  return `${hours}小时${remainingMinutes}分钟`;
}

/**
 * 格式化目标成绩显示
 * @param minutes 目标成绩（分钟）
 * @returns 格式化后的成绩字符串
 */
export function formatTargetTime(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (hours === 0) {
    return `${minutes}分钟`;
  }

  if (remainingMinutes === 0) {
    return `${hours}小时`;
  }

  return `${hours}小时${remainingMinutes}分钟`;
}

/**
 * 格式化日期显示
 * @param date 日期对象
 * @returns 格式化后的日期字符串
 */
export function formatDateString(date: Date): string {
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  });
}
