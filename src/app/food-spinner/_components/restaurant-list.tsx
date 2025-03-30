'use client';

import { Restaurant } from './types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
  DialogBody,
} from '@/components/ui/dialog';
import { Card } from '@/components/ui/card';
import { Search, ChevronRight, Store, Bot } from 'lucide-react';
import Image from 'next/image';
import { useState } from 'react';
import { AIAssistant } from '@/components/ui/jiangerAI/ai-assistant';

interface RestaurantListProps {
  restaurants: Restaurant[];
  title: string;
}

export function RestaurantList({ restaurants, title }: RestaurantListProps) {
  // 餐厅评分等级
  const getRatingClass = (rating: number) => {
    if (rating >= 4.5) return 'text-green-500 font-bold';
    if (rating >= 4.0) return 'text-green-400 font-semibold';
    if (rating >= 3.5) return 'text-yellow-500';
    if (rating >= 3.0) return 'text-yellow-400';
    return 'text-muted-foreground';
  };

  // 格式化距离
  const formatDistance = (distance: number) => {
    if (distance < 1000) {
      return `${distance}米`;
    }
    return `${(distance / 1000).toFixed(1)}公里`;
  };

  // 格式化价格
  const formatPrice = (price: number) => {
    if (price === 0) return '未知';
    return `¥${price}`;
  };

  // 检查图片URL是否有效
  const isValidImageUrl = (url?: string) => {
    return url && (url.startsWith('http://') || url.startsWith('https://'));
  };

  // 存储加载失败的图片ID
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});

  // 图片加载错误处理
  const handleImageError = (id: string) => {
    setFailedImages((prev) => ({ ...prev, [id]: true }));
    console.log(`餐厅[${id}]图片加载失败`);
  };

  // 打开AI助手
  return (
    <>
      <Dialog>
        <DialogTrigger asChild>
          <Card className="hover:border-primary/40 group relative cursor-pointer border-2 p-5 text-center transition-all hover:shadow-md">
            <div className="absolute right-2 top-2 opacity-0 transition-opacity group-hover:opacity-100">
              <ChevronRight className="h-5 w-5 text-primary" />
            </div>
            <p className="flex items-center justify-center gap-2">
              <Search className="h-5 w-5 text-primary" />
              {title}{' '}
              <span className="font-semibold text-primary">
                {restaurants.length}
              </span>{' '}
              个美食选项
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              点击查看详细列表
            </p>
          </Card>
        </DialogTrigger>
        <DialogContent className="min-h-[50vh]">
          <DialogHeader>
            <DialogTitle>筛选结果</DialogTitle>
            <DialogDescription>
              共找到 {restaurants.length} 个符合条件的美食选项
            </DialogDescription>
          </DialogHeader>

          <DialogBody className="min-h-[300px]">
            <div className="grid gap-3">
              {restaurants.map((restaurant) => {
                return (
                  <Card
                    key={restaurant.id}
                    className="cursor-pointer overflow-hidden transition-all hover:shadow-md"
                  >
                    <div className="flex flex-col md:flex-row">
                      {/* 餐厅图片 */}
                      <div className="relative h-40 w-full md:h-auto md:w-1/3">
                        {isValidImageUrl(restaurant.photos?.[0]) &&
                        !failedImages[restaurant.id] ? (
                          <Image
                            src={restaurant.photos![0]}
                            alt={restaurant.name}
                            fill
                            className="object-cover"
                            onError={() => handleImageError(restaurant.id)}
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center bg-muted">
                            <Store className="h-10 w-10 text-muted-foreground" />
                          </div>
                        )}
                      </div>

                      {/* 餐厅信息 */}
                      <div className="flex-1 p-4">
                        <div className="mb-2 flex items-center justify-between">
                          <h3 className="text-base font-semibold">
                            {restaurant.name}
                          </h3>
                          <span className={getRatingClass(restaurant.rating)}>
                            {restaurant.rating}分
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-x-3 text-sm text-muted-foreground">
                          <span>{restaurant.category}</span>
                          <span>{formatDistance(restaurant.distance)}</span>
                          <span>{formatPrice(restaurant.price)}/人</span>
                        </div>

                        <p className="mt-3 border-t border-muted pt-2 text-sm text-muted-foreground">
                          地址: {restaurant.address}
                        </p>

                        <div className="mt-3 flex justify-end space-x-2">
                          <AIAssistant
                            initialPrompt={`请帮我查询一下这家餐厅："${restaurant.name}"怎么样？它位于${restaurant.address}。请帮我分析一下这家店的评价和值得推荐的菜品。`}
                            searchQuery={`${restaurant.name} ${restaurant.address} 点评 推荐菜品`}
                            triggerLabel={
                              <div className="flex items-center gap-1 text-xs">
                                <Bot className="h-3 w-3" />
                                问问江耳的替身
                              </div>
                            }
                          />
                        </div>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          </DialogBody>
        </DialogContent>
      </Dialog>
    </>
  );
}
