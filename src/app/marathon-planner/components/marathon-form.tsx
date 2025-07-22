'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useFieldArray, useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Form, FormLabel } from '@/components/ui/form';
import {
  InputField,
  DateField,
  RadioGroupField,
  TextareaField,
} from '@/components/forms';
import { MarathonPlanFormData } from '../types';
import { Loading } from '@/components/ui/loading';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { formatTime } from '@/lib/utils';
import { WEEKDAYS, EXPERIENCE_LEVELS, MARATHON_TYPES } from '../consts';

const formSchema = z.object({
  raceName: z.string().min(1, '比赛名称不能为空'),
  raceDate: z.date({
    required_error: '比赛日期不能为空',
  }),
  trainingStartDate: z.date({
    required_error: '训练开始日期不能为空',
  }),
  marathonType: z.enum(['half', 'full'], {
    required_error: '必须选择一个马拉松类型',
  }),
  currentPB: z.coerce
    .number({
      invalid_type_error: '当前PB必须是有效数字',
      required_error: '当前PB不能为空',
    })
    .positive('当前PB必须大于0')
    .optional(),
  targetTime: z.coerce
    .number({
      invalid_type_error: '目标成绩必须是有效数字',
      required_error: '目标成绩不能为空',
    })
    .positive('目标成绩必须大于0'),
  currentWeeklyMileage: z.coerce
    .number({
      invalid_type_error: '当前周跑量必须是有效数字',
      required_error: '当前周跑量不能为空',
    })
    .positive('周跑量必须大于0'),
  experienceLevel: z.enum(['newbie', 'intermediate', 'advanced'], {
    required_error: '必须选择一个经验水平',
  }),
  maxHeartRate: z.coerce
    .number({
      invalid_type_error: '最大心率必须是有效数字',
    })
    .positive('最大心率必须大于0')
    .optional(),
  trainingSchedule: z
    .array(
      z.object({
        day: z.string(),
        label: z.string(),
        enabled: z.boolean(),
        duration: z.coerce
          .number({
            invalid_type_error: '训练时长必须是有效数字',
          })
          .min(0, '时长不能为负')
          .max(300, '时长不能超过300分钟'),
      })
    )
    .refine(
      (schedule) => schedule.filter((day) => day.enabled).length > 0,
      '请至少选择一个训练日'
    )
    .refine(
      (schedule) =>
        schedule
          .filter((day) => day.enabled)
          .every((day) => day.duration >= 30 && day.duration <= 300),
      '已选训练日的时长必须在30-300分钟之间'
    ),
  additionalNotes: z.string().optional(),
});

interface MarathonFormProps {
  onSubmit: (data: MarathonPlanFormData) => void;
  isLoading: boolean;
}

export const MarathonForm: React.FC<MarathonFormProps> = ({
  onSubmit,
  isLoading,
}) => {
  const form = useForm<MarathonPlanFormData>({
    resolver: zodResolver(formSchema),
    mode: 'onSubmit',
    reValidateMode: 'onChange',
    defaultValues: {
      raceName: '',
      trainingStartDate: new Date(),
      marathonType: 'full',
      trainingSchedule: WEEKDAYS.map((weekday) => ({
        day: weekday.day,
        label: weekday.label,
        enabled: false,
        duration: 60,
      })),
      experienceLevel: 'newbie',
      additionalNotes: '',
    },
  });

  const { fields, update } = useFieldArray({
    control: form.control,
    name: 'trainingSchedule',
  });

  const handleSubmit = (data: MarathonPlanFormData) => {
    onSubmit(data);
  };

  const handleFormError = (errors: any) => {
    // 当表单验证失败时，确保错误状态被正确触发
    console.log('表单验证失败:', errors);

    // 手动触发表单验证以确保错误状态更新
    form.trigger('trainingSchedule');
  };

  const currentPB = form.watch('currentPB');
  const targetTime = form.watch('targetTime');

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(handleSubmit, handleFormError)}
        className="space-y-8"
      >
        <div className="space-y-4">
          <InputField
            name="raceName"
            label="比赛名称"
            placeholder="例如: 2024 西安马拉松"
          />
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <DateField name="raceDate" label="比赛日期" />
            <DateField name="trainingStartDate" label="训练开始日期" />
          </div>
          <RadioGroupField
            name="marathonType"
            label="马拉松类型"
            options={MARATHON_TYPES.map((mt) => ({ ...mt }))}
          />
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <InputField
              name="currentPB"
              label="当前PB (分钟)"
              type="number"
              placeholder="例如: 210 (3小时30分), 选填"
              description={
                currentPB
                  ? `格式化后: ${formatTime(currentPB)}`
                  : '输入分钟数，如210'
              }
            />
            <InputField
              name="targetTime"
              label="目标成绩 (分钟)"
              type="number"
              placeholder="例如: 180 (3小时)"
              description={
                targetTime
                  ? `格式化后: ${formatTime(targetTime)}`
                  : '输入分钟数，如180'
              }
            />
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <InputField
              name="currentWeeklyMileage"
              label="当前平均周跑量 (公里)"
              type="number"
              placeholder="例如: 40"
            />
            <InputField
              name="maxHeartRate"
              label="最大心率 (BPM)"
              type="number"
              placeholder="选填, 不清楚可按 220-年龄 估算"
            />
          </div>
          <RadioGroupField
            name="experienceLevel"
            label="跑步经验"
            options={EXPERIENCE_LEVELS.map((el) => ({ ...el }))}
          />
          <div className="space-y-2">
            <FormLabel>选择你的每周训练日及可用时长</FormLabel>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-7">
              {fields.map((field, index) => (
                <div key={field.id} className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      checked={field.enabled}
                      onCheckedChange={(checked) => {
                        const newDuration = checked
                          ? field.duration < 30
                            ? 60
                            : field.duration
                          : 0;
                        update(index, {
                          ...field,
                          enabled: !!checked,
                          duration: newDuration,
                        });
                      }}
                    />
                    <FormLabel>{field.label}</FormLabel>
                  </div>
                  <Input
                    type="number"
                    placeholder="分钟"
                    min={0}
                    max={300}
                    step={5}
                    disabled={!field.enabled}
                    {...form.register(`trainingSchedule.${index}.duration`, {
                      valueAsNumber: true,
                    })}
                  />
                  {form.formState.errors.trainingSchedule?.[index]?.duration
                    ?.message && (
                    <p className="text-[0.8rem] font-medium text-destructive">
                      {
                        form.formState.errors.trainingSchedule[index]?.duration
                          ?.message
                      }
                    </p>
                  )}
                </div>
              ))}
            </div>
            {(form.formState.errors.trainingSchedule?.message ||
              (form.formState.isSubmitted &&
                fields.filter((f) => f.enabled).length === 0)) && (
              <p className="text-[0.8rem] font-medium text-destructive">
                {form.formState.errors.trainingSchedule?.message}
              </p>
            )}
          </div>
          <TextareaField
            name="additionalNotes"
            label="额外备注 (选填)"
            placeholder="例如: 我想把强度安排到周三。我想把lsd安排到周天"
          />
        </div>
        <Button
          type="submit"
          disabled={isLoading}
          className="w-full"
          onClick={async () => {
            // 总是触发验证以确保错误显示
            await form.trigger();
          }}
        >
          {isLoading ? <Loading /> : '生成我的专属计划'}
        </Button>
      </form>
    </Form>
  );
};
