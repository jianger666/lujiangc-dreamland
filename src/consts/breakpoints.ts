// src/config/breakpoints.ts
export const SCREEN_BREAKPOINTS = {
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
} as const; // 使用 as const 确保类型推断为字面量类型

export type BreakpointKey = keyof typeof SCREEN_BREAKPOINTS;
