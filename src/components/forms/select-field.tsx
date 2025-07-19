import React, { useState } from "react";
import { useFormContext } from "react-hook-form";
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { XCircle } from "lucide-react";

type ValueType = string | number;

interface SelectOption<T extends ValueType = string> {
  value: T;
  label: string;
  disabled?: boolean;
}

interface SelectFieldProps<T extends ValueType = string> {
  name: string;
  label?: string;
  description?: string;
  options: SelectOption<T>[];
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  loading?: boolean;
  allowClear?: boolean;
  size?: "default" | "large" | "small";
  status?: "error" | "warning";
  style?: React.CSSProperties;
  onChange?: (value: T | null) => void;
  tooltip?: string;
}

export function SelectField<T extends ValueType = string>({
  name,
  label,
  description,
  options,
  placeholder = "请选择...",
  className,
  disabled = false,
  loading = false,
  allowClear = false,
  size = "default",
  status,
  style,
  onChange,
  tooltip,
}: SelectFieldProps<T>) {
  const { control } = useFormContext();
  const [isFocused, setIsFocused] = useState(false);

  // 根据尺寸和状态设置样式
  const triggerClassName = cn(
    "w-full",
    // 尺寸样式
    {
      "h-8 text-sm": size === "small",
      "h-10": size === "default",
      "h-11 text-lg": size === "large",
    },
    // 状态样式
    status === "error" && "border-destructive",
    status === "warning" && "border-warning",
    // 加载状态样式
    loading && "opacity-70 cursor-not-allowed",
  );

  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => {
        // 将值转换为字符串以兼容Select组件
        const stringValue =
          field.value !== undefined &&
          field.value !== null &&
          field.value !== ""
            ? String(field.value)
            : undefined;

        // 处理值变更
        const handleValueChange = (value: string) => {
          if (value === "") {
            // 如果是空字符串，可能是清除操作
            field.onChange("");
            onChange?.(null);
            return;
          }

          // 找到对应的原始类型选项值
          const selectedOption = options.find(
            (opt) => String(opt.value) === value,
          );
          const typedValue = selectedOption?.value || value;

          // 更新表单值
          field.onChange(typedValue);

          // 调用外部回调
          onChange?.(typedValue as T);
        };

        // 处理清除操作
        const handleClear = (e: React.MouseEvent) => {
          e.preventDefault();
          e.stopPropagation();

          if (field.value !== undefined && field.value !== null) {
            // 始终将值设置为空字符串，而不是null
            field.onChange("");
            onChange?.(null);
          }
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
            <div
              className="relative"
              onFocus={() => setIsFocused(true)}
              onBlur={(e) => {
                // 如果不是因为点击清除按钮导致的失焦，则设置为false
                if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                  setIsFocused(false);
                }
              }}
            >
              <Select
                onValueChange={handleValueChange}
                value={stringValue}
                disabled={disabled || loading}
                onOpenChange={(open) => {
                  if (open) setIsFocused(true);
                }}
              >
                <FormControl>
                  <SelectTrigger className={triggerClassName} style={style}>
                    <SelectValue placeholder={placeholder} />
                    {loading && (
                      <span className="absolute right-8 h-4 w-4 animate-spin rounded-full border-2 border-primary border-r-transparent" />
                    )}
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {options.map((option) => (
                    <SelectItem
                      key={String(option.value)}
                      value={String(option.value)}
                      disabled={option.disabled}
                    >
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {allowClear && field.value && (isFocused || loading) && (
                <button
                  type="button"
                  className={cn(
                    "absolute right-8 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground",
                    "opacity-0 transition-opacity duration-200",
                    (isFocused || loading) && "opacity-100",
                    "focus:opacity-100",
                  )}
                  onClick={handleClear}
                  aria-label="清除选择"
                >
                  <XCircle className="h-4 w-4" />
                </button>
              )}
            </div>
            {description && <FormDescription>{description}</FormDescription>}
            <FormMessage />
          </FormItem>
        );
      }}
    />
  );
}
