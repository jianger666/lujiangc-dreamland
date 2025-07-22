'use client';

import React, { useRef } from 'react';
import { SchedulePoster } from './schedule-poster';
import { ScheduleActions } from './schedule-actions';
import type { MarathonPlanFormData } from '../types';

interface ScheduleDisplayProps {
  schedule: string;
  isLoading?: boolean;
  error?: string;
  raceName?: string;
  showActions?: boolean;
  formData?: MarathonPlanFormData;
  onRegenerate?: () => void;
  isRegenerating?: boolean;
}

export function ScheduleDisplay({
  schedule,
  isLoading,
  error,
  raceName = '马拉松训练计划',
  showActions = false,
  formData,
  onRegenerate,
  isRegenerating = false,
}: ScheduleDisplayProps) {
  const contentRef = useRef<HTMLDivElement>(null);

  if (isLoading && !schedule) {
    return (
      <div className="w-full max-w-4xl rounded-lg border bg-card p-6">
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
    <div className="flex flex-col items-center space-y-6">
      {/* 课表内容区域 */}
      <div
        className="w-full max-w-4xl overflow-hidden rounded-lg bg-card flex justify-center"
        id="marathon-schedule-content"
      >
        <SchedulePoster
          ref={contentRef}
          schedule={schedule}
          raceName={raceName}
        />
      </div>
      
      {/* 流式加载状态指示 */}
      {isLoading && schedule && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-r-transparent" />
          <span>正在生成中...</span>
        </div>
      )}
      
      {/* 操作按钮 - 仅在加载完成且有内容时显示 */}
      {showActions && formData && onRegenerate && (
        <ScheduleActions
          onRegenerate={onRegenerate}
          getContentElement={() => contentRef.current}
          formData={formData}
          isRegenerating={isRegenerating}
        />
      )}
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
    <div className="flex flex-col items-center space-y-6">
      <div
        className="w-full max-w-4xl overflow-hidden rounded-lg bg-card flex justify-center"
        id="marathon-schedule-content"
      >
        <SchedulePoster
          ref={contentRef}
          schedule={props.schedule}
          raceName={props.raceName}
        />
      </div>
    </div>
  );
});

ScheduleDisplayWithRef.displayName = 'ScheduleDisplayWithRef';
