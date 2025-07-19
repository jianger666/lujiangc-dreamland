'use client';

import React, { useState, useRef } from 'react';
import { MarathonForm } from './components/marathon-form';
import { ScheduleDisplay } from './components/schedule-display';
import { ScheduleActions } from './components/schedule-actions';
import { MarathonPlanFormData } from './types';
import { CheckCircleIcon, ArrowDownIcon } from 'lucide-react';
import { fetchEventSource } from '@microsoft/fetch-event-source';

export default function MarathonPlannerPage() {
  const [formData, setFormData] = useState<MarathonPlanFormData | null>(null);
  const [schedule, setSchedule] = useState<string>('');
  const [streamingSchedule, setStreamingSchedule] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string>('');
  const [showScrollHint, setShowScrollHint] = useState(false);

  const scheduleRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const generateSchedule = async (data: MarathonPlanFormData) => {
    setIsGenerating(true);
    setError('');
    setSchedule('');
    setStreamingSchedule('');
    setFormData(data);
    setShowScrollHint(false);

    // 如果存在之前的请求，取消它
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // 创建新的AbortController
    abortControllerRef.current = new AbortController();

    let accumulatedContent = '';

    try {
      await fetchEventSource('/api/marathon-planner/generate-schedule', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
        signal: abortControllerRef.current.signal,
        openWhenHidden: true,

        onmessage: (event) => {
          if (event.data === '[DONE]') {
            // 流结束，将累积的内容设置为最终结果
            setSchedule(accumulatedContent);
            setStreamingSchedule('');
            setIsGenerating(false);
            setShowScrollHint(true);

            // 延迟滚动，确保内容已渲染
            setTimeout(() => {
              scheduleRef.current?.scrollIntoView({
                behavior: 'smooth',
                block: 'start',
                inline: 'nearest',
              });
              // 3秒后隐藏滚动提示
              setTimeout(() => setShowScrollHint(false), 3000);
            }, 500);
            return;
          }

          try {
            const parsedData = JSON.parse(event.data);
            const { type, message } = parsedData;

            if (type === 'text') {
              accumulatedContent += message;
              setStreamingSchedule(accumulatedContent);
            }
            // 忽略 'think' 类型的消息，因为对用户来说不重要
          } catch (parseError) {
            console.error('解析流数据出错:', parseError);
          }
        },

        onerror: (error) => {
          console.error('流式请求错误:', error);
          setError('生成训练计划失败，请检查网络连接后重试');
          setIsGenerating(false);
        },
      });
    } catch (err) {
      console.error('生成训练计划错误:', err);
      if (!abortControllerRef.current?.signal.aborted) {
        setError('生成训练计划失败，请检查网络连接后重试');
      }
      setIsGenerating(false);
    }
  };

  const handleRegenerate = () => {
    if (formData) {
      generateSchedule(formData);
    }
  };

  const getContentElement = () => {
    const element = document.getElementById('marathon-schedule-content');
    return element as HTMLDivElement | null;
  };

  return (
    <div
      className="mx-auto space-y-6 px-4 py-6 sm:px-6"
      style={{ overflowX: 'hidden' }}
    >
      {/* 页面标题 */}
      <div className="space-y-2 text-center">
        <h1 className="text-3xl font-bold tracking-tight lg:text-4xl">
          🏃‍♂️ 马拉松训练计划
        </h1>
        <p className="mx-auto max-w-3xl text-lg text-muted-foreground lg:text-xl">
          基于AI的个性化马拉松训练计划制定工具，为您的比赛目标量身定制专业训练方案
        </p>
      </div>

      {/* 功能说明 - 移动到表单上方，移除条件渲染 */}
      <div className="mx-auto max-w-4xl">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-lg border bg-card p-4 transition-all duration-200 hover:scale-[1.02] hover:shadow-lg lg:p-6">
            <div className="mb-3 text-2xl">🎯</div>
            <h3 className="mb-2 text-lg font-semibold">个性化定制</h3>
            <p className="text-sm text-muted-foreground">
              根据您的目标成绩、训练时间安排和个人情况，AI为您制定专属的训练计划
            </p>
          </div>

          <div className="rounded-lg border bg-card p-4 transition-all duration-200 hover:scale-[1.02] hover:shadow-lg lg:p-6">
            <div className="mb-3 text-2xl">📋</div>
            <h3 className="mb-2 text-lg font-semibold">详细计划</h3>
            <p className="text-sm text-muted-foreground">
              包含分阶段训练安排、具体跑量配速建议、营养恢复指导等完整内容
            </p>
          </div>

          <div className="rounded-lg border bg-card p-4 transition-all duration-200 hover:scale-[1.02] hover:shadow-lg sm:col-span-2 lg:col-span-1 lg:p-6">
            <div className="mb-3 text-2xl">📱</div>
            <h3 className="mb-2 text-lg font-semibold">便捷使用</h3>
            <p className="text-sm text-muted-foreground">
              生成后可下载精美图片保存到手机，或直接复制分享给教练和跑友
            </p>
          </div>
        </div>
      </div>

      {/* 表单区域 */}
      <div className="w-full">
        <MarathonForm
          onSubmit={generateSchedule}
          isSubmitting={isGenerating}
          defaultValues={formData || undefined}
        />
      </div>

      {/* 滚动提示 */}
      {showScrollHint && schedule && (
        <div className="flex flex-col items-center justify-center space-y-2 py-4">
          <div className="flex items-center space-x-2 text-green-600">
            <CheckCircleIcon className="h-5 w-5" />
            <span className="font-medium">训练计划已生成！</span>
          </div>
          <div className="flex animate-bounce items-center space-x-1 text-sm text-muted-foreground">
            <ArrowDownIcon className="h-4 w-4" />
            <span>向下查看您的专属训练计划</span>
          </div>
        </div>
      )}

      {/* 生成的课表展示区域 - 修改渲染条件，让骨架屏在生成开始时就显示 */}
      {(schedule || streamingSchedule || isGenerating) && (
        <div ref={scheduleRef} className="mb-6" style={{ overflowX: 'hidden' }}>
          <ScheduleDisplay
            schedule={schedule || streamingSchedule}
            isLoading={isGenerating}
            error={error}
            raceName={formData?.raceName || '马拉松训练计划'}
          />
          {showScrollHint && (
            <div className="mt-4 flex items-center justify-center rounded-md bg-muted p-3">
              <ArrowDownIcon className="mr-2 h-4 w-4 animate-bounce text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                计划已生成完成，向下查看详细内容
              </span>
            </div>
          )}
        </div>
      )}

      {/* 课表操作按钮 */}
      {schedule && formData && !isGenerating && !error && (
        <div className="mt-6 flex justify-center">
          <ScheduleActions
            onRegenerate={handleRegenerate}
            getContentElement={getContentElement}
            formData={formData}
            isRegenerating={isGenerating}
          />
        </div>
      )}
    </div>
  );
}
