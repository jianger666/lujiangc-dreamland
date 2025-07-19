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
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Eye, EyeOff, XCircle } from 'lucide-react';

interface InputFieldProps {
  name: string;
  label?: string;
  description?: string;
  placeholder?: string;
  className?: string;
  type?: 'text' | 'password' | 'number' | 'email' | 'tel' | 'url';
  disabled?: boolean;
  readOnly?: boolean;
  allowClear?: boolean;
  size?: 'small' | 'default' | 'large';
  status?: 'error' | 'warning';
  prefix?: React.ReactNode;
  suffix?: React.ReactNode;
  onChange?: (value: string) => void;
  onBlur?: () => void;
  onFocus?: () => void;
  tooltip?: string;
  autoComplete?: string;
  min?: number;
  max?: number;
  step?: number;
}

export function InputField({
  name,
  label,
  description,
  placeholder,
  className,
  type = 'text',
  disabled = false,
  readOnly = false,
  allowClear = false,
  size = 'default',
  status,
  prefix,
  suffix,
  onChange,
  onBlur,
  onFocus,
  tooltip,
  autoComplete,
  min,
  max,
  step,
}: InputFieldProps) {
  const { control } = useFormContext();
  const [showPassword, setShowPassword] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  // 根据尺寸和状态设置样式
  const inputClassName = cn(
    'w-full',
    // 尺寸样式
    {
      'h-8 text-sm px-2': size === 'small',
      'h-10 px-3': size === 'default',
      'h-12 text-lg px-4': size === 'large',
    },
    // 状态样式
    status === 'error' && 'border-destructive',
    status === 'warning' && 'border-warning',
    // 前后缀样式
    (prefix || suffix) && 'pl-8',
    // 带清除按钮样式
    allowClear && 'pr-8',
    // 聚焦样式
    isFocused && 'ring-2 ring-ring ring-offset-0'
  );

  // 获取实际输入类型
  const inputType = type === 'password' && showPassword ? 'text' : type;

  // 处理聚焦和失焦
  const handleFocus = () => {
    setIsFocused(true);
    onFocus?.();
  };

  const handleBlur = () => {
    setIsFocused(false);
    onBlur?.();
  };

  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => {
        // 清除输入值
        const handleClear = () => {
          field.onChange('');
          onChange?.('');
        };

        // 切换密码可见性
        const togglePasswordVisibility = () => {
          setShowPassword((prev) => !prev);
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
            <div className="relative">
              {/* 前缀 */}
              {prefix && (
                <div className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground">
                  {prefix}
                </div>
              )}

              <FormControl>
                <Input
                  {...field}
                  type={inputType}
                  placeholder={placeholder}
                  disabled={disabled}
                  readOnly={readOnly}
                  className={inputClassName}
                  onChange={(e) => {
                    field.onChange(e);
                    onChange?.(e.target.value);
                  }}
                  onFocus={handleFocus}
                  onBlur={handleBlur}
                  autoComplete={autoComplete}
                  min={min}
                  max={max}
                  step={step}
                />
              </FormControl>

              {/* 后缀或清除按钮 */}
              <div className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center space-x-1">
                {suffix && (
                  <span className="text-muted-foreground">{suffix}</span>
                )}

                {type === 'password' && field.value && (
                  <button
                    type="button"
                    onClick={togglePasswordVisibility}
                    className="text-muted-foreground hover:text-foreground"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                )}

                {allowClear && field.value && (
                  <button
                    type="button"
                    onClick={handleClear}
                    className="text-muted-foreground hover:text-foreground"
                    aria-label="清除输入"
                    tabIndex={-1}
                  >
                    <XCircle className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>

            {description && <FormDescription>{description}</FormDescription>}
            <FormMessage />
          </FormItem>
        );
      }}
    />
  );
}
