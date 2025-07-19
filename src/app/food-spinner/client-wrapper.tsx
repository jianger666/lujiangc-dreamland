'use client';

import { Suspense } from 'react';
import dynamic from 'next/dynamic';

// 动态导入食品转盘组件，禁用SSR
const FoodSpinnerContainer = dynamic(
  () =>
    import('./components/food-spinner-container').then(
      (mod) => mod.FoodSpinnerContainer
    ),
  { ssr: false }
);

export function FoodSpinnerClientWrapper() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[400px] items-center justify-center">
          加载中...
        </div>
      }
    >
      <FoodSpinnerContainer />
    </Suspense>
  );
}
