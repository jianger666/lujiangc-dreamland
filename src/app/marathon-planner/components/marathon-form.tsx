'use client';

import React, { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, FormProvider } from 'react-hook-form';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { useBreakpoint } from '@/hooks/use-breakpoint';

import {
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  InputField,
  RadioGroupField,
  DateField,
  TextareaField,
} from '@/components/forms';
import { MarathonPlanFormData, WEEKDAYS, MARATHON_TYPES } from '../types';

// 表单验证schema
const marathonFormSchema = z
  .object({
    raceName: z
      .string()
      .min(1, '比赛名称不能为空')
      .max(20, '比赛名称不能超过20个字符'),
    raceDate: z
      .date({
        required_error: '请选择比赛日期',
        invalid_type_error: '请选择有效的日期',
      })
      .refine((date) => date > new Date(), '比赛日期必须是未来的日期'),
    trainingStartDate: z
      .date({
        invalid_type_error: '请选择有效的日期',
      })
      .optional(),
    marathonType: z.enum(['half', 'full'], {
      required_error: '请选择马拉松类型',
    }),
    currentPB: z
      .string()
      .optional()
      .refine(
        (val) => {
          if (!val || val === '') return true; // 空值允许通过
          const num = Number(val);
          return !isNaN(num) && num >= 30 && num <= 600;
        },
        {
          message: '当前PB必须是30-600分钟之间的数字',
        }
      )
      .transform((val) => {
        if (!val || val === '') return undefined;
        return Number(val);
      }),
    targetTime: z.coerce
      .number({
        required_error: '请输入目标成绩',
        invalid_type_error: '请输入有效的数字',
      })
      .min(30, '目标成绩不能少于30分钟')
      .max(600, '目标成绩不能超过600分钟'),
    trainingDays: z.array(z.string()).min(1, '请至少选择一个训练日'),
    dailyTrainingTime: z
      .record(z.string(), z.number())
      .refine(
        (data) =>
          Object.values(data).every((time) => time >= 30 && time <= 300),
        '每日训练时长必须在30-300分钟之间'
      ),
    additionalNotes: z
      .string()
      .max(500, '额外备注不能超过500个字符')
      .optional(),
  })
  .refine(
    (data) => {
      // 验证每个选择的训练日都必须设置训练时长
      return data.trainingDays.every(
        (day) => data.dailyTrainingTime[day] && data.dailyTrainingTime[day] > 0
      );
    },
    {
      message: '请为所有选择的训练日设置训练时长',
      path: ['dailyTrainingTime'],
    }
  )
  .refine(
    (data) => {
      // 如果训练开始日期存在，检查它不应该晚于比赛日期
      if (data.trainingStartDate && data.raceDate) {
        return data.trainingStartDate <= data.raceDate;
      }
      return true;
    },
    {
      message: '训练开始日期不能晚于比赛日期',
      path: ['trainingStartDate'],
    }
  );

interface MarathonFormProps {
  onSubmit: (data: MarathonPlanFormData) => void;
  isSubmitting?: boolean;
  defaultValues?: Partial<MarathonPlanFormData>;
}

export function MarathonForm({
  onSubmit,
  isSubmitting = false,
  defaultValues,
}: MarathonFormProps) {
  const [selectedDays, setSelectedDays] = useState<string[]>(
    defaultValues?.trainingDays || []
  );
  const [dailyTimes, setDailyTimes] = useState<Record<string, number>>(
    defaultValues?.dailyTrainingTime || {}
  );

  const isDesktop = useBreakpoint('lg');

  const form = useForm<MarathonPlanFormData>({
    resolver: zodResolver(marathonFormSchema),
    defaultValues: {
      raceName: '',
      raceDate: undefined,
      trainingStartDate: new Date(), // 默认为今天
      marathonType: undefined,
      currentPB: undefined,
      targetTime: undefined,
      trainingDays: [],
      dailyTrainingTime: {},
      additionalNotes: '',
      ...defaultValues,
    },
  });

  // 监听成绩变化
  const currentPB = form.watch('currentPB');
  const targetTime = form.watch('targetTime');

  // 将分钟转换为小时分钟格式
  const formatTime = (minutes: number): string => {
    if (!minutes || minutes <= 0) return '';
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;

    if (hours === 0) {
      return `约等于：${remainingMinutes}分钟`;
    } else if (remainingMinutes === 0) {
      return `约等于：${hours}小时`;
    } else {
      return `约等于：${hours}小时${remainingMinutes}分钟`;
    }
  };

  const handleDayChange = (dayValue: string, checked: boolean) => {
    let newSelectedDays: string[];

    if (checked) {
      newSelectedDays = [...selectedDays, dayValue];
    } else {
      newSelectedDays = selectedDays.filter((day) => day !== dayValue);
      const newDailyTimes = { ...dailyTimes };
      delete newDailyTimes[dayValue];
      setDailyTimes(newDailyTimes);
      form.setValue('dailyTrainingTime', newDailyTimes);
    }

    setSelectedDays(newSelectedDays);
    form.setValue('trainingDays', newSelectedDays);
  };

  const handleTimeChange = (dayValue: string, minutes: number) => {
    const newDailyTimes = { ...dailyTimes, [dayValue]: minutes };
    setDailyTimes(newDailyTimes);
    form.setValue('dailyTrainingTime', newDailyTimes);
  };

  const handleSubmit = (data: MarathonPlanFormData) => {
    onSubmit(data);
  };

  return (
    <div className="mx-auto w-full max-w-4xl">
      <FormProvider {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>马拉松训练计划</CardTitle>
            </CardHeader>
            <CardContent>
              <div
                className={`space-y-6 ${isDesktop ? 'lg:grid lg:grid-cols-2 lg:gap-8 lg:space-y-0' : ''}`}
              >
                {/* 左侧：比赛信息 */}
                <div className="space-y-4">
                  <h3 className="text-base font-semibold">比赛信息</h3>

                  <InputField
                    name="raceName"
                    label="比赛名称"
                    placeholder="如：2024年上海马拉松"
                  />

                  <DateField
                    name="raceDate"
                    label="比赛日期"
                    placeholder="选择比赛日期"
                  />

                  <DateField
                    name="trainingStartDate"
                    label="训练开始日期"
                    placeholder="选择训练开始日期"
                  />

                  <RadioGroupField
                    name="marathonType"
                    label="马拉松类型"
                    options={[...MARATHON_TYPES]}
                  />

                  <InputField
                    name="currentPB"
                    label="当前PB（分钟）（选填）"
                    type="number"
                    placeholder="如：300（5小时），没有可不填"
                    description={currentPB ? formatTime(currentPB) : ''}
                  />

                  <InputField
                    name="targetTime"
                    label="目标成绩（分钟）"
                    type="number"
                    placeholder="如：240（4小时）"
                    description={formatTime(targetTime)}
                  />
                </div>

                {/* 右侧：训练安排 */}
                <div className="space-y-4">
                  <h3 className="text-base font-semibold">训练安排</h3>

                  <FormField
                    control={form.control}
                    name="trainingDays"
                    render={() => (
                      <FormItem>
                        <FormLabel>每周可支配时间</FormLabel>
                        <div className="space-y-2">
                          {WEEKDAYS.map((day) => {
                            const isSelected = selectedDays.includes(day.value);
                            return (
                              <div
                                key={day.value}
                                className="flex items-center justify-between rounded-md border p-3"
                              >
                                <div className="flex items-center space-x-3">
                                  <Checkbox
                                    id={day.value}
                                    checked={isSelected}
                                    onCheckedChange={(checked) =>
                                      handleDayChange(
                                        day.value,
                                        checked as boolean
                                      )
                                    }
                                  />
                                  <label
                                    htmlFor={day.value}
                                    className="text-sm font-medium"
                                  >
                                    {day.label}
                                  </label>
                                </div>

                                {isSelected && (
                                  <div className="flex flex-col space-y-1">
                                    <div className="flex items-center space-x-2">
                                      <Input
                                        type="number"
                                        className={`h-8 w-16 text-center text-sm transition-colors ${
                                          dailyTimes[day.value] &&
                                          (dailyTimes[day.value] < 30 ||
                                            dailyTimes[day.value] > 300)
                                            ? 'bg-destructive/10 border-destructive focus-visible:ring-destructive'
                                            : ''
                                        }`}
                                        value={dailyTimes[day.value] || ''}
                                        onChange={(e) => {
                                          const inputValue = e.target.value;
                                          const value = inputValue
                                            ? parseInt(inputValue)
                                            : 0;
                                          handleTimeChange(day.value, value);
                                        }}
                                        placeholder=""
                                      />
                                      <span className="text-sm text-muted-foreground">
                                        分钟
                                      </span>
                                    </div>
                                    {/* 显示错误提示：未填写时长或时长不在有效范围 */}
                                    {(!dailyTimes[day.value] ||
                                      dailyTimes[day.value] === 0) && (
                                      <p className="text-xs text-destructive">
                                        请输入训练时长
                                      </p>
                                    )}
                                    {!!dailyTimes[day.value] &&
                                      dailyTimes[day.value] > 0 &&
                                      (dailyTimes[day.value] < 30 ||
                                        dailyTimes[day.value] > 300) && (
                                        <p className="text-xs text-destructive">
                                          请输入30-300分钟
                                        </p>
                                      )}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <TextareaField
                    name="additionalNotes"
                    label="备注信息（可选）"
                    placeholder="如：期望周三跑强度、希望周六跑LSD、希望周日休息等..."
                    rows={3}
                    maxLength={500}
                  />
                </div>
              </div>

              <div className="mt-6 flex justify-center">
                <Button
                  type="submit"
                  size="lg"
                  className="min-w-[200px]"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <div className="flex items-center space-x-2">
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent" />
                      <span>正在生成...</span>
                    </div>
                  ) : (
                    '生成训练计划'
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </form>
      </FormProvider>
    </div>
  );
}
