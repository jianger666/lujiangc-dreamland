
'use client';

import { useState } from 'react';
import { fetchEventSource } from '@microsoft/fetch-event-source';
import { MarathonForm } from './components/marathon-form';
import { ScheduleDisplay } from './components/schedule-display';
import { MarathonPlanFormData } from './types';
import { useToast } from '@/hooks/use-toast';

export default function MarathonPlannerPage() {
  const { toast } = useToast();
  const [schedule, setSchedule] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [formData, setFormData] = useState<MarathonPlanFormData | null>(null);

  const handleGenerateSchedule = async (data: MarathonPlanFormData) => {
    setError('');
    setSchedule('');
    setIsLoading(true);
    setFormData(data);

    await fetchEventSource('/api/marathon-planner/generate-schedule', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
      onmessage(event) {
        if (event.data === '[DONE]') {
          setIsLoading(false);
          return;
        }
        const parsedData = JSON.parse(event.data);
        setSchedule(prev => prev + (parsedData.message || ''));
      },
      onerror(err) {
        setIsLoading(false);
        setError('生成计划时出错，请稍后重试。');
        toast({
          title: '生成失败',
          description: err.message || '未知错误',
          variant: 'destructive',
        });
        throw err; // It's important to re-throw the error to stop the connection
      },
      onclose() {
        setIsLoading(false);
      },
    });
  };

  return (
    <main className="container mx-auto px-4 py-8">
      <div className="space-y-8">
        <MarathonForm
          onSubmit={handleGenerateSchedule}
          isLoading={isLoading}
        />
        {(schedule || isLoading) && formData && (
          <div className="flex flex-col items-center space-y-6">
                          <ScheduleDisplay
                schedule={schedule}
                isLoading={isLoading}
                raceName={formData.raceName}
                showActions={!isLoading && !!schedule}
                formData={formData}
                onRegenerate={() => handleGenerateSchedule(formData)}
                isRegenerating={isLoading}
              />
          </div>
        )}
        {error && (
          <div className="text-destructive">
            <p>生成计划时出错:</p>
            <pre className="whitespace-pre-wrap">{error}</pre>
          </div>
        )}
      </div>
    </main>
  );
}

