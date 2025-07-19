import { useState, useEffect } from "react";
// Import shared breakpoints and type
import { SCREEN_BREAKPOINTS, type BreakpointKey } from "@/consts/breakpoints";

/**
 * 一个自定义 React Hook，用于检测视口宽度是否达到指定的 Tailwind CSS 断点。
 * @param breakpointKey Tailwind 断点的键名 (e.g., 'sm', 'md', 'lg').
 * @returns 如果当前视口宽度大于或等于指定的断点，则返回 true，否则返回 false。
 *          在 SSR 或客户端首次渲染完成前，返回 false。
 */
export function useBreakpoint(breakpointKey: BreakpointKey): boolean {
  const [isMatch, setIsMatch] = useState(false);

  useEffect(() => {
    // 确保只在客户端执行
    if (typeof window === "undefined") {
      return;
    }

    // Use imported screens object
    const breakpointValue = SCREEN_BREAKPOINTS[breakpointKey];
    if (!breakpointValue) {
      // Keep the warning for potentially invalid keys during runtime
      console.warn(`[useBreakpoint] 无效的断点键: ${breakpointKey}`);
      return;
    }

    const mediaQuery = window.matchMedia(`(min-width: ${breakpointValue})`);

    // 定义处理函数
    const handleChange = (event: MediaQueryListEvent) => {
      setIsMatch(event.matches);
    };

    // 初始检查
    setIsMatch(mediaQuery.matches);

    // 添加监听器
    // 使用 addEventListener/removeEventListener 替代旧的 addListener/removeListener
    try {
      mediaQuery.addEventListener("change", handleChange);
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (_e) {
      // 兼容旧版浏览器
      mediaQuery.addListener(handleChange);
    }

    // 清理函数
    return () => {
      try {
        mediaQuery.removeEventListener("change", handleChange);
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
      } catch (_e) {
        // 兼容旧版浏览器
        mediaQuery.removeListener(handleChange);
      }
    };
  }, [breakpointKey]); // 当 breakpointKey 变化时重新执行 effect

  return isMatch;
}
