"use client";

import React, { forwardRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";
import { useBreakpoint } from "@/hooks/use-breakpoint";
import { cn } from "@/lib/utils";

interface SchedulePosterProps {
  schedule: string;
  raceName?: string;
  className?: string;
}

export const SchedulePoster = forwardRef<HTMLDivElement, SchedulePosterProps>(
  ({ schedule, raceName = "马拉松训练计划", className }, ref) => {
    const isDesktop = useBreakpoint("md");

    if (!schedule) {
      return (
        <div
          ref={ref}
          className="flex items-center justify-center p-8 text-muted-foreground"
        >
          暂无训练计划内容
        </div>
      );
    }

    return (
      <div
        ref={ref}
        className={cn(
          "schedule-poster-container relative overflow-hidden rounded-xl shadow-2xl",
          isDesktop ? "max-w-4xl" : "max-w-full",
          "min-h-[600px]",
          className,
        )}
        style={{
          // 复杂渐变背景需要保留内联样式，Tailwind 的预设渐变不够灵活
          background: isDesktop
            ? "linear-gradient(135deg, #667eea 0%, #764ba2 25%, #f093fb 50%, #f5576c 75%, #4facfe 100%)"
            : "linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)",
          // 移动端严格控制宽度，防止横向滚动条
          ...(!isDesktop
            ? {
                maxWidth: "390px",
                margin: "0 auto",
                width: "100%",
              }
            : {
                width: "1024px",
              }),
        }}
      >
        {/* 装饰性背景元素 */}
        <div className="absolute inset-0 overflow-hidden">
          <div
            className={cn(
              "absolute rounded-full bg-white/10",
              isDesktop
                ? "-right-40 -top-40 h-80 w-80"
                : "-right-20 -top-20 h-40 w-40",
            )}
            style={{ filter: "blur(60px)" }}
          />
          <div
            className={cn(
              "absolute rounded-full bg-white/10",
              isDesktop
                ? "-bottom-40 -left-40 h-80 w-80"
                : "-bottom-20 -left-20 h-40 w-40",
            )}
            style={{ filter: "blur(60px)" }}
          />
          <div
            className={cn(
              "absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/5",
              isDesktop ? "h-60 w-60" : "h-30 w-30",
            )}
            style={{ filter: "blur(40px)" }}
          />
        </div>

        {/* 主要内容区域 */}
        <div className="relative z-10 flex h-full min-h-[600px] flex-col">
          {/* 头部 */}
          <div className="flex items-center justify-between border-b border-white/20 bg-white/15 px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/20 text-center shadow-lg">
                <span className="flex h-full w-full items-center justify-center text-2xl">
                  🏃‍♂️
                </span>
              </div>
              <div>
                <h2 className="text-xl font-bold text-white drop-shadow-md sm:text-2xl">
                  {raceName}
                </h2>
                <p className="text-sm text-white/80 drop-shadow-sm">
                  个性化训练计划
                </p>
              </div>
            </div>
            <div className="rounded-lg bg-white/10 px-3 py-1 text-sm font-medium text-white">
              {new Date().toLocaleDateString("zh-CN")}
            </div>
          </div>

          {/* 内容区域 */}
          <div className="flex-1 bg-white/95 p-6 sm:p-8">
            <div
              className={cn(
                "prose prose-slate max-w-none prose-td:align-middle prose-th:align-middle",
                // 移动端使用更小字体
                !isDesktop && "prose-sm text-sm",
              )}
            >
              <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]}>
                {schedule}
              </ReactMarkdown>
            </div>
          </div>

          {/* 底部 */}
          <div className="flex items-center justify-center gap-6 border-t border-white/20 bg-white/15 px-6 py-4">
            <div className="flex items-center gap-6 text-sm text-white">
              <div className="flex items-center gap-2">
                <div className="h-2.5 w-2.5 rounded-full bg-blue-400 shadow-sm" />
                <span className="drop-shadow-sm">专业训练</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-2.5 w-2.5 rounded-full bg-green-400 shadow-sm" />
                <span className="drop-shadow-sm">科学规划</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-2.5 w-2.5 rounded-full bg-orange-400 shadow-sm" />
                <span className="drop-shadow-sm">个性定制</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  },
);

SchedulePoster.displayName = "SchedulePoster";
