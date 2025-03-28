'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { WeatherInfo } from './types';
import { MapPin, CloudRain } from 'lucide-react';
import { getWeatherInfo } from './amap-service';

interface LocationWeatherProps {
  location: [number, number] | null;
  address?: string;
  cityCode?: string;
}

export function LocationWeather({
  location,
  address,
  cityCode,
}: LocationWeatherProps) {
  const [weatherInfo, setWeatherInfo] = useState<WeatherInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchWeatherInfo() {
      if (!location) return;

      setIsLoading(true);
      setError(null);

      try {
        // 尝试使用cityCode获取天气
        console.log('开始获取天气信息，位置:', location, '城市代码:', cityCode);
        const info = await getWeatherInfo(location);
        if (info) {
          setWeatherInfo(info);
          console.log('成功获取天气信息:', info);
        } else {
          setError('无法获取天气信息');
          console.error('天气API返回空结果');
        }
      } catch (err) {
        console.error('获取天气信息失败:', err);
        setError('天气信息获取失败');
      } finally {
        setIsLoading(false);
      }
    }

    fetchWeatherInfo();
  }, [location, cityCode]);

  // 获取天气图标
  const getWeatherIcon = (weather: string) => {
    // 这里可以根据不同的天气状况返回不同的图标
    // 简单实现，后续可以扩展
    if (weather.includes('雨'))
      return <CloudRain className="h-5 w-5 text-blue-500" />;
    if (weather.includes('云') || weather.includes('阴'))
      return <CloudRain className="h-5 w-5 text-gray-500" />;
    // 其他天气状况可以添加更多图标
    return <CloudRain className="h-5 w-5 text-yellow-500" />;
  };

  return (
    <Card className="mb-6 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MapPin className="h-5 w-5 text-primary" />
          <h3 className="font-medium">
            {address ? address : weatherInfo?.city || '正在获取位置...'}
          </h3>
        </div>

        {isLoading ? (
          <div className="text-sm text-muted-foreground">获取天气信息中...</div>
        ) : error ? (
          <div className="text-sm text-red-500">{error}</div>
        ) : weatherInfo ? (
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              {getWeatherIcon(weatherInfo.weather)}
              <span className="text-sm font-medium">{weatherInfo.weather}</span>
            </div>
            <div className="text-sm text-muted-foreground">
              {weatherInfo.temperature}°C
            </div>
            <div className="hidden text-xs text-muted-foreground md:block">
              {weatherInfo.wind} 湿度:{weatherInfo.humidity}%
            </div>
          </div>
        ) : null}
      </div>
    </Card>
  );
}
