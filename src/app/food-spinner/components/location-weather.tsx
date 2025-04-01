'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { WeatherInfo } from '../types';
import { MapPin, CloudRain, Cloud, Sun, CloudSun } from 'lucide-react';
import { getWeatherInfo } from '../utils';
import { Skeleton } from '@/components/ui/skeleton';

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

  // 获取天气信息
  const fetchWeatherInfo = async () => {
    if (!location) return;

    setIsLoading(true);
    setError(null);

    try {
      const info = await getWeatherInfo(location);
      if (info) {
        setWeatherInfo(info);
      } else {
        setError('无法获取天气信息');
      }
    } catch {
      setError('天气信息获取失败');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchWeatherInfo();
  }, [location, cityCode]);

  // 获取天气图标
  const getWeatherIcon = (weather: string) => {
    if (weather.includes('雨')) {
      return <CloudRain className="h-5 w-5 text-blue-500" />;
    }

    if (weather.includes('云') || weather.includes('阴')) {
      return <Cloud className="h-5 w-5 text-gray-500" />;
    }

    if (weather.includes('晴') && weather.includes('多云')) {
      return <CloudSun className="h-5 w-5 text-yellow-500" />;
    }

    if (weather.includes('晴')) {
      return <Sun className="h-5 w-5 text-yellow-500" />;
    }

    // 默认图标
    return <Cloud className="h-5 w-5 text-gray-500" />;
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
          <div className="flex items-center gap-3">
            <Skeleton
              lines={['24px', '16px', '32px']}
              className="h-5"
              lineGap="flex gap-3 items-center"
            />
          </div>
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
