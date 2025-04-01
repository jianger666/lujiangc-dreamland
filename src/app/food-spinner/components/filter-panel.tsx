'use client';

import { Card } from '@/components/ui/card';
import {
  FormContainer,
  ToggleGroupField,
  InputField,
} from '@/components/forms';
import { z } from 'zod';
import { FoodCategory, FilterOptions } from '../types';

// 默认美食分类
const defaultCategories = [
  { value: '中餐', label: '中餐' },
  { value: '火锅', label: '火锅' },
  { value: '烧烤', label: '烧烤' },
  { value: '西餐', label: '西餐' },
  { value: '日料', label: '日料' },
  { value: '韩餐', label: '韩餐' },
  { value: '甜点', label: '甜点' },
  { value: '饮品', label: '饮品' },
  { value: '快餐', label: '快餐' },
  { value: '面馆', label: '面馆' },
  { value: '小吃', label: '小吃' },
];

// 距离选项 - 不包含"无要求"选项
const distanceOptions = [
  { value: '500', label: '500米' },
  { value: '1000', label: '1公里' },
  { value: '2000', label: '2公里' },
  { value: '3000', label: '3公里' },
  { value: '5000', label: '5公里' },
];

// 评分选项 - 不包含"无要求"选项
const ratingOptions = [
  { value: '3.0', label: '3.0分以上' },
  { value: '3.5', label: '3.5分以上' },
  { value: '4.0', label: '4.0分以上' },
  { value: '4.5', label: '4.5分以上' },
];

// 价格范围选项 - 不包含"无要求"选项
const priceRangeOptions = [
  { value: '0_30', label: '￥30元以下/人' },
  { value: '30_60', label: '￥30-60元/人' },
  { value: '60_100', label: '￥60-100元/人' },
  { value: '100_200', label: '￥100-200元/人' },
  { value: '200_1000', label: '￥200元以上/人' },
];

// 默认初始值 - 字段为空表示无要求
const defaultInitialValues = {
  category: '',
  distance: '',
  rating: '',
  priceRange: '',
  keywords: '',
};

// 定义表单验证模式 - 所有筛选字段都是可选的
const filterSchema = z.object({
  category: z.string().optional(),
  distance: z.string().optional(),
  rating: z.string().optional(),
  priceRange: z.string().optional(),
  keywords: z.string().optional(),
});

export type FilterFormValues = z.infer<typeof filterSchema>;

interface FilterPanelProps {
  onFinish: (values: FilterFormValues) => Promise<void>;
}

export function FilterPanel({ onFinish }: FilterPanelProps) {
  return (
    <Card className="mb-8 p-6">
      <div className="mb-4">
        <h2 className="text-xl font-semibold">筛选条件</h2>
      </div>

      <FormContainer
        initialValues={defaultInitialValues}
        onFinish={onFinish}
        submitText="确认筛选"
        showReset={true}
        resetText="重置筛选条件"
        syncToUrl={true}
        schema={filterSchema}
      >
        <div className="space-y-4">
          <ToggleGroupField
            name="category"
            label="美食分类"
            options={defaultCategories}
            mode="single"
            size="small"
            buttonStyle="solid"
            className="mb-6"
          />

          <ToggleGroupField
            name="distance"
            label="距离范围"
            options={distanceOptions}
            mode="single"
            className="mb-6"
          />

          <ToggleGroupField
            name="rating"
            label="最低评分"
            options={ratingOptions}
            mode="single"
            className="mb-6"
          />

          <ToggleGroupField
            name="priceRange"
            label="价格范围"
            options={priceRangeOptions}
            mode="single"
            className="mb-6"
          />

          <InputField
            name="keywords"
            label="关键词"
            description="可选，输入喜好的食物，如牛肉面、汉堡等"
            placeholder="请输入关键词"
            allowClear={true}
          />
        </div>
      </FormContainer>
    </Card>
  );
}
