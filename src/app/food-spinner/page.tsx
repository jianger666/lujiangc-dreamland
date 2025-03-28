import { FoodSpinnerContainer } from './_components/food-spinner-container';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';

export default function FoodSpinnerPage() {
  // 检查是否设置了高德地图API密钥
  const hasApiKey = !!process.env.NEXT_PUBLIC_AMAP_KEY;

  return (
    <div className="container mx-auto py-8">
      <h1 className="mb-8 text-3xl font-bold">吃啥转转</h1>
      <p className="mb-8 text-muted-foreground">
        再也不用为「今天吃什么」而烦恼！筛选喜欢的美食种类，让转盘来决定你的命运！
      </p>

      {!hasApiKey && (
        <Alert variant="destructive" className="mb-8">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>请配置高德地图API密钥</AlertTitle>
          <AlertDescription>
            需要在环境变量中设置 NEXT_PUBLIC_AMAP_KEY 和
            NEXT_PUBLIC_AMAP_SECRET。
            您可以在高德开放平台申请密钥：https://lbs.amap.com/
          </AlertDescription>
        </Alert>
      )}

      <FoodSpinnerContainer />
    </div>
  );
}
