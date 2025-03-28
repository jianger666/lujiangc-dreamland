'use client';

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Restaurant } from './types';
import { Utensils, Frown, Store } from 'lucide-react';

// 动态导入Wheel组件，禁用SSR以避免"window is not defined"错误
const Wheel = dynamic(
  () => import('react-custom-roulette').then((mod) => mod.Wheel),
  { ssr: false },
);

// 创建触发confetti效果的函数
function triggerConfetti() {
  // 仅在客户端环境执行
  if (typeof window !== 'undefined') {
    // 动态导入confetti
    import('react-canvas-confetti').then((confetti) => {
      confetti.default({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
      });
    });
  }
}

interface WheelSpinnerProps {
  restaurants: Restaurant[];
  hasSearched?: boolean;
}

// 生成转盘的分段颜色（循环使用）
const generateSegmentColors = (count: number): string[] => {
  const baseColors = [
    '#F94144',
    '#F3722C',
    '#F8961E',
    '#F9C74F',
    '#90BE6D',
    '#43AA8B',
    '#577590',
    '#277DA1',
    '#9D4EDD',
    '#C77DFF',
  ];

  if (count <= baseColors.length) {
    return baseColors.slice(0, count);
  }

  const result: string[] = [];
  for (let i = 0; i < count; i++) {
    result.push(baseColors[i % baseColors.length]);
  }

  return result;
};

// 截断长餐厅名称
const truncateText = (text: string, maxLength: number = 8): string => {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
};

// 检查图片URL是否有效
const isValidImageUrl = (url?: string) => {
  return url && (url.startsWith('http://') || url.startsWith('https://'));
};

export function WheelSpinner({
  restaurants,
  hasSearched = false,
}: WheelSpinnerProps) {
  const [mustSpin, setMustSpin] = useState(false);
  const [prizeNumber, setPrizeNumber] = useState(0);
  const [winner, setWinner] = useState<Restaurant | null>(null);
  const [wheelData, setWheelData] = useState<Array<{ option: string }>>([]);
  const [colors, setColors] = useState<string[]>([]);
  const [error, setError] = useState(false);

  // 根据餐厅列表生成轮盘数据
  useEffect(() => {
    if (restaurants.length > 0) {
      const newColors = generateSegmentColors(restaurants.length);
      const newWheelData = restaurants.map((restaurant) => ({
        option: truncateText(restaurant.name),
      }));

      setWheelData(newWheelData);
      setColors(newColors);
      setWinner(null);
    } else {
      setWheelData([]);
      setColors([]);
    }
  }, [restaurants]);

  const handleSpinClick = () => {
    if (!mustSpin && restaurants.length > 0) {
      // 生成随机结果
      const newPrizeNumber = Math.floor(Math.random() * restaurants.length);
      setPrizeNumber(newPrizeNumber);
      setMustSpin(true);
    }
  };

  const handleStopSpinning = () => {
    setMustSpin(false);
    const winningRestaurant = restaurants[prizeNumber];
    setWinner(winningRestaurant);

    if (winningRestaurant) {
      // 触发彩带效果
      triggerConfetti();
    }
  };

  // 图片加载错误处理
  const handleImageError = () => {
    setError(true);
    console.log('图片加载失败');
  };

  return (
    <Card className="flex flex-col items-center p-6">
      <h2 className="mb-4 text-xl font-semibold">美食命运转盘</h2>

      {wheelData.length === 0 ? (
        <div className="bg-muted/20 flex h-[300px] w-full flex-col items-center justify-center rounded-lg p-6">
          {!hasSearched ? (
            <>
              <Utensils className="mb-4 h-16 w-16 text-muted-foreground" />
              <p className="mb-2 text-center font-medium text-muted-foreground">
                请先筛选美食，结果将显示在转盘上
              </p>
              <p className="text-muted-foreground/80 text-center text-sm">
                选择您喜欢的美食分类、价格范围和评分，点击确认筛选按钮开始
              </p>
            </>
          ) : (
            <>
              <Frown className="mb-4 h-16 w-16 text-muted-foreground" />
              <p className="mb-2 text-center font-medium text-muted-foreground">
                未找到符合条件的美食选项
              </p>
              <p className="text-muted-foreground/80 text-center text-sm">
                请尝试调整筛选条件或减少限制条件
              </p>
            </>
          )}
        </div>
      ) : (
        <>
          <div className="mb-6 flex w-full max-w-md justify-center">
            <Wheel
              mustStartSpinning={mustSpin}
              prizeNumber={prizeNumber}
              data={wheelData}
              backgroundColors={colors}
              textColors={Array(wheelData.length).fill('#ffffff')}
              outerBorderColor="#f3799e"
              outerBorderWidth={2}
              innerRadius={30}
              innerBorderColor="#f3799e"
              innerBorderWidth={5}
              radiusLineColor="#f9c7d9"
              radiusLineWidth={1}
              fontSize={14}
              fontWeight={700}
              perpendicularText={false}
              textDistance={60}
              spinDuration={0.8}
              onStopSpinning={handleStopSpinning}
            />
          </div>

          <Button
            onClick={handleSpinClick}
            disabled={mustSpin || wheelData.length === 0}
            className="mt-4"
            size="lg"
          >
            {mustSpin ? '转盘旋转中...' : '开始转动'}
          </Button>

          {winner && (
            <div className="mt-8 w-full max-w-md">
              <h3 className="mb-4 text-center text-lg font-semibold">
                今天就吃这家！
              </h3>
              <div className="overflow-hidden rounded-lg shadow-md">
                <div className="relative h-48 w-full">
                  {isValidImageUrl(winner.photos?.[0]) && !error ? (
                    <Image
                      src={winner.photos![0]}
                      alt={winner.name}
                      fill
                      className="object-cover"
                      priority
                      onError={handleImageError}
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-muted">
                      <Store className="h-12 w-12 text-muted-foreground" />
                    </div>
                  )}
                </div>

                <div className="bg-card p-4">
                  <p className="text-xl font-bold text-card-foreground">
                    {winner.name}
                  </p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {winner.category} · 评分: {winner.rating}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    距离: {(winner.distance / 1000).toFixed(1)}公里 · 人均: ¥
                    {winner.price || '未知'}
                  </p>
                  <p className="mt-2 border-t border-muted pt-2 text-sm text-muted-foreground">
                    地址: {winner.address}
                  </p>
                  {winner.businessHours && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      营业时间: {winner.businessHours}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </Card>
  );
}
