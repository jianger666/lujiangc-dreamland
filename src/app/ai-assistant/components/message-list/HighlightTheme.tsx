"use client";

import { useTheme } from "next-themes";
import React from "react";

/**
 * 代码高亮主题组件 - 使用JSX直接加载样式
 */
export function HighlightTheme() {
  const { resolvedTheme } = useTheme();

  return (
    <>
      {/* eslint-disable-next-line @next/next/no-css-tags */}
      <link
        rel="stylesheet"
        href="/styles/highlight/atom-one-dark.css"
        media={resolvedTheme === "dark" ? "all" : "none"}
      />
      {/* eslint-disable-next-line @next/next/no-css-tags */}
      <link
        rel="stylesheet"
        href="/styles/highlight/atom-one-light.css"
        media={resolvedTheme === "dark" ? "none" : "all"}
      />
    </>
  );
}
