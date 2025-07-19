"use client";

import html2canvas from "html2canvas";
import { saveAs } from "file-saver";

/**
 * html2canvas 配置选项
 */
const getHtml2CanvasOptions = (element: HTMLElement) => {
  return {
    // 允许跨域图片
    allowTaint: true,

    // 使用 CORS 获取图片
    useCORS: true,

    // 使用设备像素比例，确保高清输出
    scale: window.devicePixelRatio || 2,

    // 背景颜色，使用白色作为默认背景
    backgroundColor: "transparent",

    // 移除 html2canvas 创建的临时容器
    // removeContainer: true,

    // 启用日志以便调试
    logging: true,

    // 元素的宽高，基于实际渲染尺寸
    width: element.scrollWidth,
    height: element.scrollHeight,

    // 外边框处理
    foreignObjectRendering: false,

    // 字体渲染优化
    letterRendering: true,

    // 忽略元素
    ignoreElements: (element: Element) => {
      // 忽略某些不需要渲染的元素
      return (
        element.tagName === "SCRIPT" ||
        element.tagName === "STYLE" ||
        element.classList.contains("no-capture")
      );
    },
  };
};

/**
 * 等待元素完全渲染
 * @param element 目标元素
 * @param timeout 超时时间（毫秒）
 */
async function waitForElementReady(
  element: HTMLElement,
  timeout = 3000,
): Promise<void> {
  return new Promise((resolve) => {
    // 检查图片是否加载完成
    const images = element.querySelectorAll("img");
    const imagePromises = Array.from(images).map((img) => {
      return new Promise<void>((resolveImg) => {
        if (img.complete) {
          resolveImg();
        } else {
          img.onload = () => resolveImg();
          img.onerror = () => resolveImg(); // 即使图片加载失败也继续
        }
      });
    });

    // 等待字体加载
    const fontPromise = document.fonts
      ? document.fonts.ready
      : Promise.resolve();

    Promise.all([...imagePromises, fontPromise])
      .then(() => {
        // 额外等待一小段时间确保渲染完成
        setTimeout(resolve, 500);
      })
      .catch(() => {
        // 即使有错误也继续，避免阻塞
        setTimeout(resolve, 500);
      });

    // 设置超时
    setTimeout(resolve, timeout);
  });
}

/**
 * 将 HTML 元素转换为 Canvas
 * @param element 要转换的 HTML 元素
 */
async function htmlToCanvas(element: HTMLElement): Promise<HTMLCanvasElement> {
  try {
    console.log("开始将 HTML 元素转换为 Canvas...");

    // 等待元素完全渲染
    await waitForElementReady(element);

    const options = getHtml2CanvasOptions(element);
    console.log("html2canvas 配置:", options);

    const canvas = await html2canvas(element, options);

    console.log(`Canvas 生成成功，尺寸: ${canvas.width}x${canvas.height}`);
    return canvas;
  } catch (error) {
    console.error("html2canvas 转换失败:", error);
    throw new Error(
      `转换为图片失败: ${error instanceof Error ? error.message : "未知错误"}`,
    );
  }
}

/**
 * 将 HTML 元素转换为图片并下载
 * @param element 要转换的 HTML 元素
 * @param filename 下载的文件名
 */
export async function downloadImageFromElement(
  element: HTMLElement,
  filename: string = "marathon-schedule.png",
): Promise<void> {
  try {
    console.log("开始下载训练计划图片...");

    const canvas = await htmlToCanvas(element);

    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (blob) {
            console.log("训练计划图片生成成功，开始下载");
            saveAs(blob, filename);
            resolve();
          } else {
            reject(new Error("无法生成图片 blob"));
          }
        },
        "image/png",
        1.0,
      );
    });
  } catch (error) {
    console.error("下载训练计划图片失败:", error);
    throw error;
  }
}

/**
 * 将 HTML 元素转换为图片并复制到剪贴板
 * @param element 要转换的 HTML 元素
 */
export async function copyImageFromElement(
  element: HTMLElement,
): Promise<void> {
  try {
    console.log("开始复制训练计划图片到剪贴板...");

    // 检查浏览器是否支持剪贴板API
    if (!navigator.clipboard) {
      throw new Error("浏览器不支持剪贴板功能");
    }

    const canvas = await htmlToCanvas(element);

    return new Promise((resolve, reject) => {
      canvas.toBlob(async (blob) => {
        if (blob) {
          try {
            const clipboardItem = new ClipboardItem({
              "image/png": blob,
            });
            await navigator.clipboard.write([clipboardItem]);
            console.log("训练计划图片复制到剪贴板成功");
            resolve();
          } catch (clipboardError) {
            console.error("写入剪贴板失败:", clipboardError);
            reject(new Error("写入剪贴板失败"));
          }
        } else {
          reject(new Error("无法生成图片 blob"));
        }
      }, "image/png");
    });
  } catch (error) {
    console.error("复制训练计划图片失败:", error);
    throw error;
  }
}

/**
 * 检查浏览器是否支持剪贴板功能
 * @returns boolean
 */
export function isClipboardSupported(): boolean {
  return !!(navigator.clipboard && navigator.clipboard.write);
}

/**
 * 获取元素渲染状态信息
 * @param element HTML 元素
 */
export function getMd2PosterInfo(element: HTMLElement): {
  hasCanvas: boolean;
  canvasSize?: { width: number; height: number };
  posterTheme?: string;
} {
  // 对于 html2canvas，我们检查元素是否可见和准备就绪
  const isVisible = element.offsetWidth > 0 && element.offsetHeight > 0;
  const rect = element.getBoundingClientRect();

  return {
    hasCanvas: isVisible, // html2canvas 不需要预先存在的 canvas
    canvasSize: isVisible
      ? { width: rect.width, height: rect.height }
      : undefined,
    posterTheme: element.className || undefined,
  };
}
