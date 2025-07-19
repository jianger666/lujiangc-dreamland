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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

type ValueType = string | number;

interface RadioOption<T extends ValueType = string> {
  value: T;
  label: string;
  disabled?: boolean;
}

interface RadioGroupFieldProps<T extends ValueType = string> {
  name: string;
  label?: string;
  description?: string;
  options: RadioOption<T>[];
  className?: string;
  direction?: 'horizontal' | 'vertical';
  optionType?: 'default' | 'button';
  buttonStyle?: 'outline' | 'solid';
  size?: 'small' | 'middle' | 'large';
  disabled?: boolean;
  onChange?: (value: T) => void;
  tooltip?: string;
}

export function RadioGroupField<T extends ValueType = string>({
  name,
  label,
  description,
  options,
  className,
  direction = 'vertical',
  // 暂未实现的属性，后续可扩展
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  optionType = 'default',
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  buttonStyle = 'outline',
  size = 'middle',
  disabled = false,
  onChange,
  tooltip,
}: RadioGroupFieldProps<T>) {
  const { control } = useFormContext();

  // 方向样式
  const radioGroupClassName = cn({
    'flex flex-col space-y-2': direction === 'vertical',
    'flex flex-row flex-wrap gap-4': direction === 'horizontal',
  });

  // 尺寸样式
  const radioItemClassName = cn({
    'text-sm': size === 'small',
    'text-base': size === 'middle',
    'text-lg': size === 'large',
  });

  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => {
        // 将值转换为字符串以兼容RadioGroup组件
        const stringValue =
          field.value !== undefined &&
          field.value !== null &&
          field.value !== ''
            ? String(field.value)
            : undefined;

        // 处理值变更
        const handleValueChange = (value: string) => {
          if (value === '') {
            // 如果是空字符串，则设为空值
            field.onChange('');
            onChange?.('' as unknown as T);
            return;
          }

          // 找到对应的原始类型的选项值
          const selectedOption = options.find(
            (opt) => String(opt.value) === value
          );
          const typedValue = selectedOption?.value || value;

          // 更新表单值
          field.onChange(typedValue);

          // 调用外部回调
          onChange?.(typedValue as T);
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
              <RadioGroup
                value={stringValue}
                onValueChange={handleValueChange}
                className={radioGroupClassName}
                disabled={disabled}
              >
                {options.map((option) => {
                  const isDisabled = option.disabled || disabled;
                  const id = `${name}-${option.value}`;

                  return (
                    <div
                      key={id}
                      className={cn(
                        'flex items-center space-x-2',
                        radioItemClassName
                      )}
                    >
                      <RadioGroupItem
                        value={String(option.value)}
                        id={id}
                        disabled={isDisabled}
                      />
                      <Label
                        htmlFor={id}
                        className={isDisabled ? 'opacity-50' : ''}
                      >
                        {option.label}
                      </Label>
                    </div>
                  );
                })}
              </RadioGroup>
            </FormControl>
            {description && <FormDescription>{description}</FormDescription>}
            <FormMessage />
          </FormItem>
        );
      }}
    />
  );
}
