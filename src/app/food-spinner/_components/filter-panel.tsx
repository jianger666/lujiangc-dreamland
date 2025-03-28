'use client';

import { useState, useEffect } from 'react';
import { FilterOptions, FoodCategory } from './types';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Toggle } from '@/components/ui/toggle';
import { Input } from '@/components/ui/input';
import { useQueryState } from 'nuqs';

// 默认美食分类
const defaultCategories: FoodCategory[] = [
  { id: 'chinese', name: '中餐', selected: false },
  { id: 'hotpot', name: '火锅', selected: false },
  { id: 'bbq', name: '烧烤', selected: false },
  { id: 'western', name: '西餐', selected: false },
  { id: 'japanese', name: '日料', selected: false },
  { id: 'korean', name: '韩餐', selected: false },
  { id: 'dessert', name: '甜点', selected: false },
  { id: 'beverage', name: '饮品', selected: false },
  { id: 'fastfood', name: '快餐', selected: false },
  { id: 'noodle', name: '面馆', selected: false },
  { id: 'snack', name: '小吃', selected: false },
];

// 距离选项
const distanceOptions = [
  { value: -1, label: '无要求' },
  { value: 500, label: '500米' },
  { value: 1000, label: '1公里' },
  { value: 2000, label: '2公里' },
  { value: 3000, label: '3公里' },
  { value: 5000, label: '5公里' },
];

// 评分选项
const ratingOptions = [
  { value: -1, label: '无要求' },
  { value: 3.0, label: '3.0分以上' },
  { value: 3.5, label: '3.5分以上' },
  { value: 4.0, label: '4.0分以上' },
  { value: 4.5, label: '4.5分以上' },
];

// 价格范围选项
const priceRangeOptions = [
  { value: [-1, -1] as [number, number], label: '无要求' },
  { value: [0, 30] as [number, number], label: '30元以下' },
  { value: [30, 60] as [number, number], label: '30-60元' },
  { value: [60, 100] as [number, number], label: '60-100元' },
  { value: [100, 200] as [number, number], label: '100-200元' },
  { value: [200, 1000] as [number, number], label: '200元以上' },
];

interface FilterPanelProps {
  onChange: (filter: FilterOptions) => void;
}

export function FilterPanel({ onChange }: FilterPanelProps) {
  // 从URL获取状态
  const [categoriesStr, setCategoriesStr] = useQueryState('categories', {
    defaultValue: '',
    history: 'replace',
    throttleMs: 500,
  });
  const [priceMin, setPriceMin] = useQueryState('price_min', {
    defaultValue: '',
    history: 'replace',
    throttleMs: 500,
  });
  const [priceMax, setPriceMax] = useQueryState('price_max', {
    defaultValue: '',
    history: 'replace',
    throttleMs: 500,
  });
  const [distanceParam, setDistanceParam] = useQueryState('distance', {
    defaultValue: '',
    history: 'replace',
    throttleMs: 500,
  });
  const [ratingParam, setRatingParam] = useQueryState('rating', {
    defaultValue: '',
    history: 'replace',
    throttleMs: 500,
  });
  const [keywordsParam, setKeywordsParam] = useQueryState('keywords', {
    defaultValue: '',
    history: 'replace',
    throttleMs: 500,
  });

  // 本地状态
  const [categories, setCategories] =
    useState<FoodCategory[]>(defaultCategories);
  const [distance, setDistance] = useState<number>(-1);
  const [rating, setRating] = useState<number>(-1);
  const [priceRange, setPriceRange] = useState<[number, number]>([-1, -1]);
  const [keywords, setKeywords] = useState<string>('');

  // 添加状态更新锁，防止循环更新
  const [isUpdatingFromUrl, setIsUpdatingFromUrl] = useState(false);

  // 添加确认筛选状态
  const [pendingChanges, setPendingChanges] = useState(false);

  // 从URL更新本地状态
  useEffect(() => {
    // 无需检查是否有URL参数，我们始终更新本地状态
    setIsUpdatingFromUrl(true);

    try {
      // 解析分类
      if (categoriesStr) {
        const selectedIds = categoriesStr.split(',');
        const updatedCategories = defaultCategories.map((category) => ({
          ...category,
          selected: selectedIds.includes(category.id),
        }));
        setCategories(updatedCategories);
      } else {
        // 如果URL没有分类参数，重置为默认状态（全部不选中）
        const resetCategories = defaultCategories.map((category) => ({
          ...category,
          selected: false,
        }));
        setCategories(resetCategories);
      }

      // 设置其他值，根据URL参数确定，如果没有则使用默认值
      setDistance(distanceParam ? Number(distanceParam) : -1);
      setRating(ratingParam ? Number(ratingParam) : -1);

      if (priceMin && priceMax) {
        setPriceRange([Number(priceMin), Number(priceMax)]);
      } else {
        setPriceRange([-1, -1]);
      }

      setKeywords(keywordsParam || '');
    } finally {
      // 确保状态锁解除
      setTimeout(() => {
        setIsUpdatingFromUrl(false);
        setPendingChanges(false); // 重置确认状态
      }, 100);
    }
  }, [
    categoriesStr,
    distanceParam,
    ratingParam,
    priceMin,
    priceMax,
    keywordsParam,
  ]);

  // 当确认筛选时，更新URL参数
  const applyFilters = () => {
    console.log('确认筛选，更新URL参数');
    // 检查是否有选中的分类
    const hasSelectedCategories = categories.some((c) => c.selected);

    // 更新URL参数
    if (hasSelectedCategories) {
      const selectedIds = categories
        .filter((c) => c.selected)
        .map((c) => c.id)
        .join(',');

      setCategoriesStr(selectedIds);

      // 只有当不是"无要求"时才设置参数
      if (distance !== -1) {
        setDistanceParam(distance.toString());
      } else {
        setDistanceParam('');
      }

      if (rating !== -1) {
        setRatingParam(rating.toString());
      } else {
        setRatingParam('');
      }

      if (priceRange[0] !== -1) {
        setPriceMin(priceRange[0].toString());
        setPriceMax(priceRange[1].toString());
      } else {
        setPriceMin('');
        setPriceMax('');
      }

      setKeywordsParam(keywords);
    } else {
      // 如果没有选中的分类，清空所有URL参数
      setCategoriesStr('');
      setPriceMin('');
      setPriceMax('');
      setDistanceParam('');
      setRatingParam('');
      setKeywordsParam('');
    }

    // 标记有待确认的更改
    setPendingChanges(false);

    // 通知父组件更新筛选条件
    onChange({
      categories: categories.filter((c) => c.selected),
      price: priceRange,
      distance,
      rating,
      keywords,
    });

    console.log('筛选条件已确认', {
      categories: categories.filter((c) => c.selected),
      price: priceRange,
      distance,
      rating,
      keywords,
    });
  };

  // 当有本地更改时，标记有待确认的更改
  useEffect(() => {
    if (!isUpdatingFromUrl) {
      setPendingChanges(true);
    }
  }, [categories, priceRange, distance, rating, keywords, isUpdatingFromUrl]);

  // 切换分类选择状态
  const toggleCategory = (id: string) => {
    setCategories((prev) =>
      prev.map((category) => ({
        ...category,
        // 如果是当前点击的分类，切换它的选中状态；其他分类都设为不选中
        selected: category.id === id ? !category.selected : false,
      })),
    );
  };

  // 重置筛选条件
  const resetFilters = () => {
    // 重置本地状态，所有分类不选中
    const resetCategories = defaultCategories.map((category) => ({
      ...category,
      selected: false,
    }));
    setCategories(resetCategories);
    setDistance(-1);
    setRating(-1);
    setPriceRange([-1, -1]);
    setKeywords('');

    // 同时重置URL参数
    setCategoriesStr('');
    setDistanceParam('');
    setRatingParam('');
    setPriceMin('');
    setPriceMax('');
    setKeywordsParam('');

    // 标记有待确认的更改已应用
    setPendingChanges(false);

    // 通知父组件更新筛选条件
    onChange({
      categories: [],
      price: [-1, -1],
      distance: -1,
      rating: -1,
      keywords: '',
    });
  };

  return (
    <Card className="mb-8 p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-semibold">筛选条件</h2>
        {pendingChanges && (
          <div className="animate-pulse text-sm font-medium text-amber-500">
            已修改，请点击确认筛选
          </div>
        )}
      </div>

      {/* 美食分类 */}
      <div className="mb-6">
        <h3 className="mb-2 font-medium">美食分类</h3>
        <div className="flex flex-wrap gap-2">
          {categories.map((category) => (
            <Toggle
              key={category.id}
              variant="outline"
              size="sm"
              pressed={category.selected}
              onPressedChange={() => toggleCategory(category.id)}
              className={
                category.selected
                  ? 'hover:bg-primary/90 border-2 border-primary bg-primary text-primary-foreground shadow-sm hover:text-primary-foreground'
                  : 'border border-input bg-background hover:bg-muted hover:text-foreground'
              }
            >
              {category.name}
            </Toggle>
          ))}
        </div>
      </div>

      {/* 距离范围 */}
      <div className="mb-6">
        <h3 className="mb-2 font-medium">距离范围</h3>
        <div className="flex flex-wrap gap-2">
          {distanceOptions.map((option) => (
            <Toggle
              key={option.value}
              variant="outline"
              size="sm"
              pressed={distance === option.value}
              onPressedChange={() => setDistance(option.value)}
              className={
                distance === option.value
                  ? 'hover:bg-primary/90 border-2 border-primary bg-primary text-primary-foreground shadow-sm hover:text-primary-foreground'
                  : 'border border-input bg-background hover:bg-muted hover:text-foreground'
              }
            >
              {option.label}
            </Toggle>
          ))}
        </div>
      </div>

      {/* 最低评分 */}
      <div className="mb-6">
        <h3 className="mb-2 font-medium">最低评分</h3>
        <div className="flex flex-wrap gap-2">
          {ratingOptions.map((option) => (
            <Toggle
              key={option.value}
              variant="outline"
              size="sm"
              pressed={rating === option.value}
              onPressedChange={() => setRating(option.value)}
              className={
                rating === option.value
                  ? 'hover:bg-primary/90 border-2 border-primary bg-primary text-primary-foreground shadow-sm hover:text-primary-foreground'
                  : 'border border-input bg-background hover:bg-muted hover:text-foreground'
              }
            >
              {option.label}
            </Toggle>
          ))}
        </div>
      </div>

      {/* 价格范围 */}
      <div className="mb-6">
        <h3 className="mb-2 font-medium">价格范围</h3>
        <div className="flex flex-wrap gap-2">
          {priceRangeOptions.map((option) => (
            <Toggle
              key={option.label}
              variant="outline"
              size="sm"
              pressed={
                priceRange[0] === option.value[0] &&
                priceRange[1] === option.value[1]
              }
              onPressedChange={() => setPriceRange(option.value)}
              className={
                priceRange[0] === option.value[0] &&
                priceRange[1] === option.value[1]
                  ? 'hover:bg-primary/90 border-2 border-primary bg-primary text-primary-foreground shadow-sm hover:text-primary-foreground'
                  : 'border border-input bg-background hover:bg-muted hover:text-foreground'
              }
            >
              {option.label}
            </Toggle>
          ))}
        </div>
      </div>

      {/* 关键词搜索 */}
      <div className="mb-6">
        <h3 className="mb-2 font-medium">关键词</h3>
        <div className="flex gap-2">
          <Input
            type="text"
            placeholder="可选，输入喜好的食物，如牛肉面、汉堡等"
            value={keywords}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setKeywords(e.target.value)
            }
            className="w-full"
          />
        </div>
      </div>

      {/* 按钮区域 - 重置在左，确认在右 */}
      <div className="mt-6 flex justify-between">
        <Button variant="outline" onClick={resetFilters}>
          重置筛选条件
        </Button>
        <Button
          onClick={applyFilters}
          className={pendingChanges ? 'animate-pulse' : ''}
        >
          确认筛选
        </Button>
      </div>
    </Card>
  );
}
