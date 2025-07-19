'use client';

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { HeartIcon } from 'lucide-react';
import Image from 'next/image';

interface DonationSectionProps {
  className?: string;
}

export function DonationSection({ className = '' }: DonationSectionProps) {
  return (
    <Card
      className={`border-2 border-dashed border-orange-200 bg-gradient-to-r from-orange-50 to-amber-50 dark:border-orange-800 dark:from-orange-950/20 dark:to-amber-950/20 ${className}`}
    >
      <CardContent className="p-6 text-center">
        <div className="mb-4">
          <HeartIcon className="mx-auto h-8 w-8 animate-pulse fill-current text-orange-500" />
        </div>

        <h3 className="mb-3 text-lg font-semibold text-orange-900 dark:text-orange-100">
          💝 感谢您的支持
        </h3>

        <p className="mx-auto mb-6 max-w-md text-sm leading-relaxed text-orange-700 dark:text-orange-200">
          如果生成的课表对您有帮助，可以进行打赏，多少是心意，您的赞助是对开发者最大的支持
        </p>

        {/* 收款码展示区域 */}
        <div className="mb-4 flex flex-col items-center justify-center gap-6 sm:flex-row">
          {/* 微信收款码 */}
          <div className="space-y-2 text-center">
            <div className="overflow-hidden rounded-lg border-2 border-green-200 shadow-md">
              <Image
                src="/images/WechatIMG251.jpg"
                alt="微信收款码"
                width={200}
                height={200}
                className="object-contain"
                priority
              />
            </div>
            <p className="text-sm font-medium text-green-600">微信支付</p>
          </div>

          {/* 支付宝收款码 */}
          <div className="space-y-2 text-center">
            <div className="overflow-hidden rounded-lg border-2 border-blue-200 shadow-md">
              <Image
                src="/images/WechatIMG252.jpg"
                alt="支付宝收款码"
                width={200}
                height={200}
                className="object-contain"
                priority
              />
            </div>
            <p className="text-sm font-medium text-blue-600">支付宝</p>
          </div>
        </div>

        <div className="text-center">
          <p className="text-xs text-orange-600 dark:text-orange-300">
            谢谢您的慷慨支持，这将激励我们持续优化产品 🙏
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
