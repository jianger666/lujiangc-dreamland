"use client";

import { useState, useEffect } from "react";
import { FilterPanel, FilterFormValues } from "./filter-panel";
import { WheelSpinner } from "./wheel-spinner";
import { RestaurantList } from "./restaurant-list";
import { LocationWeather } from "./location-weather";
import { Restaurant } from "../types";
import {
  getCurrentLocation,
  searchNearbyRestaurants,
  AMapPoiItem,
} from "../utils";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Loading } from "@/components/ui/loading";

export function FoodSpinnerContainer() {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isMapInitializing, setIsMapInitializing] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(
    null,
  );
  const [locationAddress, setLocationAddress] =
    useState<string>("正在获取位置...");
  const [cityCode, setCityCode] = useState<string>("");
  const [hasSearched, setHasSearched] = useState(false);
  const [hasInitializedWheelData, setHasInitializedWheelData] = useState(false);

  // 获取用户位置
  const fetchLocation = async () => {
    try {
      setIsMapInitializing(true);
      const locationInfo = await getCurrentLocation();
      setUserLocation(locationInfo.location);
      setLocationAddress(locationInfo.address);
      setCityCode(locationInfo.cityCode);
    } catch (err) {
      console.error("获取位置失败:", err);
      setLocationAddress("位置获取失败");
    } finally {
      setIsMapInitializing(false);
    }
  };

  // 初始化位置信息
  useEffect(() => {
    if (typeof window === "undefined") return;

    let isMounted = true;
    fetchLocation().then(() => {
      if (!isMounted) return;
      // 初始化一个空的轮盘数据，避免闪烁
      if (!hasInitializedWheelData) {
        setHasInitializedWheelData(true);
      }
    });

    return () => {
      isMounted = false;
    };
  }, []);

  // 根据筛选条件搜索美食
  const searchRestaurants = async (formValues: FilterFormValues) => {
    try {
      if (!userLocation) {
        return setError("请先允许获取位置信息");
      }

      // 优化：直接使用表单值，不再进行冗余的数据转换
      // 构建搜索关键词：类别 + 用户输入的关键词
      const searchKeywords = [formValues.category, formValues.keywords]
        .filter(Boolean)
        .join(" ");

      // 设置搜索距离
      const searchDistance = formValues.distance
        ? Number(formValues.distance)
        : 5000;

      // 搜索附近餐厅，获取原始POI数据
      const poisResults: AMapPoiItem[] = await searchNearbyRestaurants(
        userLocation,
        searchKeywords,
        searchDistance,
      );

      if (poisResults.length === 0) {
        setError("没有找到符合条件的餐厅，请尝试调整搜索条件或扩大搜索范围");
        setRestaurants([]);
        return;
      }

      // 解析价格范围
      let minPrice = 0,
        maxPrice = 0;
      if (formValues.priceRange) {
        const [min, max] = formValues.priceRange.split("_");
        minPrice = parseInt(min, 10);
        maxPrice = max === "1000" ? 99999 : parseInt(max, 10);
      }

      // 解析最低评分
      const minRating = formValues.rating ? parseFloat(formValues.rating) : 0;

      // 将POI数据转换为Restaurant格式并根据价格和评分筛选结果
      const filteredResults = poisResults
        .map((poi) => ({
          id: poi.id,
          name: poi.name,
          address: poi.address || "地址未知",
          distance: poi.distance,
          rating: poi.rating ? parseFloat(poi.rating) : 3.5,
          price: poi.cost ? parseFloat(poi.cost) : 0,
          category: poi.type,
          coordinates: poi.location,
          tel: poi.tel,
          website: poi.website,
          photos:
            typeof poi.photos === "string"
              ? []
              : poi.photos?.map((photo) => photo.url) || [],
        }))
        .filter((restaurant) => {
          // 价格过滤逻辑 - 简化条件判断
          const meetsPrice =
            !formValues.priceRange ||
            (restaurant.price > 0 &&
              restaurant.price >= minPrice &&
              restaurant.price <= maxPrice);

          // 评分过滤逻辑 - 简化条件判断
          const meetsRating =
            !minRating ||
            (restaurant.rating > 0 && restaurant.rating >= minRating);

          return meetsPrice && meetsRating;
        });

      console.log("筛选条件:", formValues);
      console.log(
        "已筛选餐厅数:",
        filteredResults.length,
        "总POI数:",
        poisResults.length,
      );

      console.log(poisResults);

      setRestaurants(filteredResults);

      // 设置适当的提示信息
      if (filteredResults.length === 0 && poisResults.length > 0) {
        setError("没有找到符合价格和评分筛选条件的餐厅，请尝试调整筛选条件");
      } else {
        setError(null);
      }
    } catch (error) {
      console.error("搜索餐厅时出错:", error);
      setError("搜索美食时出错，请稍后再试");
      setRestaurants([]);
    }
  };

  // 处理筛选器提交
  const handleFilterSubmit = async (
    formValues: FilterFormValues,
  ): Promise<void> => {
    setHasSearched(true);
    setError(null);
    setIsLoading(true);

    // 优化：直接传递表单值到搜索函数，不再进行冗余的转换
    await searchRestaurants(formValues);

    setIsLoading(false);
  };

  // 渲染地图初始化中的骨架屏
  const renderMapInitializingSkeleton = () => (
    <>
      <Loading overlay text="地图插件加载中..." />
      {/* 位置信息骨架屏 */}
      <div className="col-span-1 lg:col-span-2">
        <Card className="p-4">
          <div className="flex items-center space-x-4">
            <Skeleton className="h-12 w-12 rounded-full" />
            <div className="space-y-2">
              <Skeleton
                lines={["24px", "16px", "32px"]}
                className="h-5"
                lineGap="flex gap-3 items-center"
              />
            </div>
          </div>
        </Card>
      </div>

      {/* 筛选面板骨架屏 */}
      <div>
        <Card className="p-6">
          <Skeleton lines={5} className="h-4 w-[90%]" />
        </Card>
      </div>

      {/* 转盘骨架屏 */}
      <div>
        <Card className="p-6">
          <div className="mb-4 flex items-center justify-center">
            <Skeleton className="h-32 w-32 rounded-full" />
          </div>
          <div className="flex justify-center">
            <Skeleton className="h-10 w-32" />
          </div>
        </Card>
      </div>
    </>
  );

  // 渲染搜索结果区域
  const renderSearchResults = () => {
    if (isLoading) {
      return (
        <Card className="flex items-center justify-center p-6 text-center">
          <div className="w-full space-y-3">
            {Array(3)
              .fill(0)
              .map((_, i) => (
                <div key={i} className="flex items-center space-x-4">
                  <Skeleton className="h-12 w-12 rounded-full" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-[200px]" />
                    <Skeleton className="h-4 w-[160px]" />
                  </div>
                </div>
              ))}
          </div>
        </Card>
      );
    }

    if (error) {
      return (
        <Card className="bg-secondary/20 p-4 text-center">
          <p className="text-foreground">{error}</p>
        </Card>
      );
    }

    if (restaurants.length > 0) {
      return <RestaurantList restaurants={restaurants} title="筛选结果" />;
    }

    if (hasSearched) {
      return (
        <Card className="p-4 text-center">
          <p className="text-muted-foreground">
            没有找到符合条件的美食，请尝试调整筛选条件或扩大搜索范围
          </p>
        </Card>
      );
    }

    return null;
  };

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
      {isMapInitializing ? (
        renderMapInitializingSkeleton()
      ) : (
        <>
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
            <FilterPanel onFinish={handleFilterSubmit} />
          </div>

          {/* 右侧转盘区域 */}
          <div>
            <WheelSpinner
              restaurants={restaurants}
              hasSearched={hasSearched}
              isLoading={isLoading}
            />
          </div>
        </>
      )}

      {/* 搜索结果区域 */}
      <div className="col-span-1 lg:col-span-2">{renderSearchResults()}</div>
    </div>
  );
}
