'use client';

import { useState, useEffect } from 'react';
import { FilterPanel } from './filter-panel';
import { WheelSpinner } from './wheel-spinner';
import { RestaurantList } from './restaurant-list';
import { LocationWeather } from './location-weather';
import { FilterOptions, Restaurant } from './types';
import { searchNearbyRestaurants, getCurrentLocation } from './amap-service';
import { Card } from '@/components/ui/card';

export function FoodSpinnerContainer() {
  const [filterOptions, setFilterOptions] = useState<FilterOptions>({
    categories: [],
    price: [-1, -1],
    distance: -1,
    rating: -1,
    keywords: '',
  });

  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(
    null,
  );
  const [locationAddress, setLocationAddress] =
    useState<string>('正在获取位置...');
  const [cityCode, setCityCode] = useState<string>('');
  const [hasSearched, setHasSearched] = useState(false);

  // 添加一个标志，确保只在确认筛选后才触发API调用
  const [shouldSearch, setShouldSearch] = useState(false);

  // 获取用户位置
  useEffect(() => {
    // 确保代码只在客户端环境运行
    if (typeof window === 'undefined') return;

    let isMounted = true;

    async function fetchLocation() {
      try {
        const locationInfo = await getCurrentLocation();
        if (isMounted) {
          setUserLocation(locationInfo.location);
          setLocationAddress(locationInfo.address);
          setCityCode(locationInfo.cityCode);
          console.log('获取到用户位置:', locationInfo);
        }
      } catch (err) {
        console.error('获取位置失败:', err);
        // 使用默认位置
        if (isMounted) {
          setUserLocation([121.473701, 31.230416]);
          setLocationAddress('上海市');
          setCityCode('021');
        }
      }
    }

    fetchLocation();

    return () => {
      isMounted = false;
    };
  }, []);

  // 处理筛选器变化
  const handleFilterChange = (newFilters: FilterOptions) => {
    console.log('筛选条件已更新:', newFilters);
    setFilterOptions(newFilters);
    // 设置搜索标志，确保会执行搜索
    setShouldSearch(true);
  };

  // 当筛选条件确认后，搜索餐厅
  useEffect(() => {
    // 确保代码只在客户端环境运行
    if (typeof window === 'undefined') return;

    // 如果不需要搜索，则跳过
    if (!shouldSearch) return;

    // 执行搜索
    const searchId = setTimeout(() => {
      console.log('开始执行搜索...');
      searchRestaurants();
      // 重置搜索标志
      setShouldSearch(false);
    }, 300);

    return () => {
      clearTimeout(searchId);
    };

    async function searchRestaurants() {
      console.log('执行搜索餐厅函数');
      setIsLoading(true);
      setError(null);
      setHasSearched(true);

      try {
        if (!userLocation) {
          console.log('等待位置信息...');
          setIsLoading(false);
          return;
        }

        // 构建关键词搜索条件
        let searchKeywords = '';

        // 添加已选分类到关键词
        if (filterOptions.categories.length > 0) {
          searchKeywords = filterOptions.categories
            .map((c) => c.name)
            .join(' ');
        } else {
          // 如果没有选择任何分类，使用通用关键词
          searchKeywords = '美食';
        }

        // 添加用户输入的关键词
        if (filterOptions.keywords) {
          searchKeywords = searchKeywords
            ? `${searchKeywords} ${filterOptions.keywords}`
            : filterOptions.keywords;
        }

        // 如果没有关键词，使用默认值
        if (!searchKeywords) {
          searchKeywords = '美食';
        }

        console.log('搜索关键词:', searchKeywords);

        // 设置搜索距离，如果是-1则使用默认值5000米
        const searchDistance =
          filterOptions.distance === -1 ? 5000 : filterOptions.distance;

        // 使用高德地图API搜索
        console.log('使用高德地图API搜索...');
        try {
          const results = await searchNearbyRestaurants(
            userLocation,
            searchKeywords,
            searchDistance,
          );
          console.log('API搜索结果数量:', results.length);
          console.log('API搜索结果:', results);

          if (results.length === 0) {
            setError(
              '没有找到符合条件的餐厅，请尝试调整搜索条件或扩大搜索范围',
            );
            setRestaurants([]);
            setIsLoading(false);
            return;
          }

          // 筛选结果 - 根据价格和评分
          const filteredResults = results.filter((restaurant) => {
            const meetsPrice =
              filterOptions.price[0] === -1 || // 无要求
              (restaurant.price >= filterOptions.price[0] &&
                restaurant.price <= filterOptions.price[1]);

            const meetsRating =
              filterOptions.rating === -1 || // 无要求
              restaurant.rating >= filterOptions.rating;

            console.log(
              `餐厅 ${restaurant.name} - 价格:${restaurant.price}(${meetsPrice}) 评分:${restaurant.rating}(${meetsRating})`,
            );

            return meetsPrice && meetsRating;
          });

          console.log(
            `筛选后的结果: ${filteredResults.length}/${results.length}`,
          );

          setRestaurants(filteredResults);

          if (filteredResults.length === 0 && results.length > 0) {
            setError(
              '没有找到符合价格和评分筛选条件的餐厅，请尝试调整筛选条件',
            );
          } else if (filteredResults.length > 30) {
            setError(
              `共找到${filteredResults.length}个符合条件的美食，建议缩小筛选范围以获得更好的体验`,
            );
          }
        } catch (apiError) {
          console.error('高德地图API错误:', apiError);
          setError(
            `高德地图API错误: ${(apiError as Error).message || '未知错误'}`,
          );
          setRestaurants([]);
        }
      } catch (error) {
        console.error('搜索餐厅时出错:', error);
        setError('搜索美食时出错，请稍后再试');
        setRestaurants([]);
      } finally {
        setIsLoading(false);
      }
    }
  }, [filterOptions, userLocation, shouldSearch]);

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
      {/* 天气和位置信息 */}
      <div className="col-span-1 lg:col-span-2">
        <LocationWeather
          location={userLocation}
          address={locationAddress}
          cityCode={cityCode}
        />
      </div>

      {/* 左侧筛选区域 */}
      <div>
        <FilterPanel onChange={handleFilterChange} />
      </div>

      {/* 右侧转盘区域 */}
      <div>
        <WheelSpinner restaurants={restaurants} hasSearched={hasSearched} />
      </div>

      {/* 搜索结果数量提示 */}
      <div className="col-span-1 lg:col-span-2">
        {isLoading ? (
          <Card className="p-4 text-center">
            <p className="text-muted-foreground">正在搜索中...</p>
          </Card>
        ) : error ? (
          <Card className="bg-red-50 p-4 text-center">
            <p className="text-red-600">{error}</p>
          </Card>
        ) : restaurants.length > 0 ? (
          <RestaurantList restaurants={restaurants} title="筛选结果" />
        ) : hasSearched ? (
          <Card className="p-4 text-center">
            <p className="text-muted-foreground">
              没有找到符合条件的美食，请尝试调整筛选条件或扩大搜索范围
            </p>
          </Card>
        ) : null}
      </div>
    </div>
  );
}
