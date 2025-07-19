import React, { useState } from 'react';
import { useFormContext } from 'react-hook-form';
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
  FormMessage,
} from '@/components/ui/form';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface DateFieldProps {
  name: string;
  label?: string;
  description?: string;
  placeholder?: string;
  disabled?: boolean;
  fromYear?: number;
  toYear?: number;
  className?: string;
  tooltip?: string;
}

export function DateField({
  name,
  label,
  description,
  placeholder = '选择日期',
  disabled = false,
  fromYear = new Date().getFullYear(),
  toYear = new Date().getFullYear() + 2,
  className,
  tooltip,
}: DateFieldProps) {
  const { control } = useFormContext();
  const [open, setOpen] = useState(false);

  const formatDate = (date: Date | undefined) => {
    if (!date) return '';
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const renderTrigger = (field: any) => (
    <Button
      variant="outline"
      className={cn(
        'w-full justify-start text-left font-normal',
        !field.value && 'text-muted-foreground',
        className,
      )}
      disabled={disabled}
      onClick={() => !disabled && setOpen(true)}
    >
      <CalendarIcon className="mr-2 h-4 w-4" />
      {field.value ? formatDate(field.value) : placeholder}
    </Button>
  );

  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className="flex flex-col">
          {label && (
            <FormLabel className="px-1">
              {tooltip ? (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="cursor-help">{label}</span>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{tooltip}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              ) : (
                label
              )}
            </FormLabel>
          )}
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <FormControl>{renderTrigger(field)}</FormControl>
            </PopoverTrigger>
            <PopoverContent
              className={cn(
                "overflow-hidden p-0",
                // 移动端适配：确保不会超出屏幕
                "sm:w-auto"
              )}
              align="start"
              side="bottom"
              sideOffset={8}
              avoidCollisions={true}
              collisionPadding={16}
            >
              <Calendar
                mode="single"
                selected={field.value}
                onSelect={(date) => {
                  field.onChange(date);
                  setOpen(false);
                }}
                disabled={(date: Date) => date < new Date() || disabled}
                captionLayout="dropdown"
                fromYear={fromYear}
                toYear={toYear}
                initialFocus
                className={cn(
                  // 移动端适配样式
                  "sm:w-fit w-full max-w-none",
                  "[--cell-size:2.75rem] sm:[--cell-size:2rem]", // 移动端增大触摸目标
                )}
              />
            </PopoverContent>
          </Popover>
          {description && <FormDescription>{description}</FormDescription>}
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
