"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
// @ts-expect-error 类型定义文件缺失
import type { ThemeProviderProps } from "next-themes/dist/types";

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}
