"use client";

import React, { useRef } from "react";
import { SchedulePoster } from "./schedule-poster";

interface ScheduleDisplayProps {
  schedule: string;
  isLoading?: boolean;
  error?: string;
  raceName?: string;
}

export function ScheduleDisplay({
  schedule,
  isLoading,
  error,
  raceName = "马拉松训练计划",
}: ScheduleDisplayProps) {
  const contentRef = useRef<HTMLDivElement>(null);

  if (isLoading) {
    return (
      <div className="w-full rounded-lg border bg-card p-6">
        <div className="mb-4 flex items-center gap-2">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-r-transparent" />
          <h3 className="text-lg font-semibold">正在生成马拉松训练计划...</h3>
        </div>
        <div className="space-y-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <div className="h-4 animate-pulse rounded bg-muted" />
              <div className="bg-muted/60 h-4 w-3/4 animate-pulse rounded" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full rounded-lg border border-destructive bg-card p-6">
        <h3 className="mb-2 text-lg font-semibold text-destructive">
          生成失败
        </h3>
        <p className="text-muted-foreground">{error}</p>
      </div>
    );
  }

  if (!schedule) {
    return null;
  }

  return (
    <div
      className="w-full overflow-hidden rounded-lg bg-card"
      id="marathon-schedule-content"
    >
      <SchedulePoster
        ref={contentRef}
        schedule={schedule}
        raceName={raceName}
      />
    </div>
  );
}

// 使用ref转发来暴露getContentElement方法
export const ScheduleDisplayWithRef = React.forwardRef<
  { getContentElement: () => HTMLDivElement | null },
  ScheduleDisplayProps
>((props, ref) => {
  const contentRef = useRef<HTMLDivElement>(null);

  React.useImperativeHandle(ref, () => ({
    getContentElement: () => contentRef.current,
  }));

  return (
    <div
      className="w-full overflow-hidden rounded-lg bg-card"
      id="marathon-schedule-content"
    >
      <SchedulePoster
        ref={contentRef}
        schedule={props.schedule}
        raceName={props.raceName}
      />
    </div>
  );
});

ScheduleDisplayWithRef.displayName = "ScheduleDisplayWithRef";
