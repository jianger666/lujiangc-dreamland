import React from 'react';
import { useFormContext } from 'react-hook-form';
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
  FormMessage,
} from '@/components/ui/form';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

type ValueType = string | number;

interface CheckboxOption<T extends ValueType = string> {
  value: T;
  label: string;
  disabled?: boolean;
}

interface CheckboxGroupFieldProps<T extends ValueType = string> {
  name: string;
  label?: string;
  description?: string;
  options: CheckboxOption<T>[];
  className?: string;
  direction?: 'horizontal' | 'vertical';
  disabled?: boolean;
  onChange?: (values: T[]) => void;
  tooltip?: string;
  size?: 'small' | 'middle' | 'large';
}

export function CheckboxGroupField<T extends ValueType = string>({
  name,
  label,
  description,
  options,
  className,
  direction = 'vertical',
  disabled = false,
  onChange,
  tooltip,
  size = 'middle',
}: CheckboxGroupFieldProps<T>) {
  const { control } = useFormContext();

  // 布局方向样式
  const groupClassName = cn({
    'space-y-2': direction === 'vertical',
    'flex flex-wrap gap-4': direction === 'horizontal',
  });

  // 尺寸样式
  const labelClassName = cn('font-normal', {
    'text-sm': size === 'small',
    'text-base': size === 'middle',
    'text-lg': size === 'large',
  });

  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => {
        // 确保值是数组类型
        const selectedValues: T[] = Array.isArray(field.value)
          ? field.value
          : field.value
            ? [field.value as T] // 如果是单个值，转换为数组
            : [];

        // 处理复选框状态变更
        const handleCheckedChange = (checked: boolean, value: T) => {
          let newValues: T[];

          if (checked) {
            // 添加新值
            newValues = [...selectedValues, value];
          } else {
            // 移除取消选中的值
            newValues = selectedValues.filter((v) => v !== value);
          }

          // 更新表单值
          field.onChange(newValues);

          // 调用外部onChange回调
          onChange?.(newValues);
        };

        return (
          <FormItem className={className}>
            {label && (
              <FormLabel>
                {label}
                {tooltip && (
                  <TooltipProvider delayDuration={0}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="ml-1 inline-flex h-4 w-4 cursor-help items-center justify-center rounded-full border text-xs text-muted-foreground">
                          ?
                        </span>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{tooltip}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </FormLabel>
            )}
            <FormControl>
              <div className={groupClassName}>
                {options.map((option) => {
                  const isChecked = selectedValues.includes(option.value);
                  const isDisabled = option.disabled || disabled;
                  const id = `${name}-${option.value}`;

                  return (
                    <div key={id} className="flex items-center space-x-2">
                      <Checkbox
                        id={id}
                        checked={isChecked}
                        onCheckedChange={(checked) =>
                          handleCheckedChange(!!checked, option.value)
                        }
                        disabled={isDisabled}
                      />
                      <Label
                        htmlFor={id}
                        className={cn(
                          labelClassName,
                          isDisabled ? 'opacity-50' : '',
                        )}
                      >
                        {option.label}
                      </Label>
                    </div>
                  );
                })}
              </div>
            </FormControl>
            {description && <FormDescription>{description}</FormDescription>}
            <FormMessage />
          </FormItem>
        );
      }}
    />
  );
}
