'use client';

import AMapLoader from '@amap/amap-jsapi-loader';
import { Restaurant } from './types';

// 从环境变量获取高德地图API密钥
const API_KEY = process.env.NEXT_PUBLIC_AMAP_KEY || '';
const SECURITY_KEY = process.env.NEXT_PUBLIC_AMAP_SECRET || '';

// 为Window添加高德地图安全配置接口
declare global {
  interface Window {
    _AMapSecurityConfig?: {
      securityJsCode: string;
    };
  }
}

// 设置安全配置的函数，确保只在客户端环境调用
function setupSecurityConfig() {
  // 确保安全密钥在客户端设置（在任何API加载之前）
  if (typeof window !== 'undefined' && SECURITY_KEY) {
    // 确保_AMapSecurityConfig只被设置一次
    if (!window._AMapSecurityConfig) {
      window._AMapSecurityConfig = {
        securityJsCode: SECURITY_KEY,
      };
      console.log('高德地图安全密钥已设置:', API_KEY.substring(0, 4) + '***');
    }
  }
}

// 定义AMap及相关类型
interface AMapPosition {
  lng: number;
  lat: number;
}

interface AMapGeolocationResult {
  position: AMapPosition;
  accuracy: number;
  location_type: string;
  message: string;
  isConverted: boolean;
  info: string;
  addressComponent: {
    province: string;
    city: string;
    district: string;
    township: string;
    street: string;
    streetNumber: string;
    neighborhood: string;
    building: string;
    adcode: string;
    citycode: string;
  };
  formattedAddress: string;
}

// 更新AMapPoiItem的biz_ext类型以包含所有可能的图片字段
interface AMapPoiItemBizExt {
  rating?: string;
  cost?: string | number;
  meal_ordering?: string;
  open_time?: string;
  opentime2?: string;
  image_urls?: string[];
  // 其他可能的字段
  [key: string]: unknown;
}

// 更新为与高德API实际返回结构匹配的接口
interface AMapPoiItem {
  id: string;
  name: string;
  type: string;
  typecode?: string;
  address?: string;
  location: string | { lng: number; lat: number }; // 支持两种坐标格式
  tel?: string;
  website?: string;
  distance?: string | number;
  photos?: {
    title?: string;
    url?: string;
  }[];
  biz_ext?: AMapPoiItemBizExt;
  // 其他可能的字段
  [key: string]: unknown;
}

// 在适当位置添加这个接口
interface PhotoObject {
  url?: string;
  title?: string;
  [key: string]: unknown;
}

// 更新为与高德API实际返回格式匹配
interface AMapSearchResult {
  status: string;
  info: string;
  infocode: string;
  count: string;
  suggestion?: {
    keywords: unknown[];
    cities: unknown[];
  };
  pois?: AMapPoiItem[]; // 直接包含pois数组
  poiList?: {
    // 兼容旧格式
    pois: AMapPoiItem[];
    pageIndex: number;
    pageSize: number;
    count: number;
  };
}

interface AMapGeolocationOptions {
  enableHighAccuracy: boolean;
  timeout: number;
  noIpLocate?: number;
  needAddress?: boolean;
  extensions?: string;
}

interface AMapSearchOptions {
  pageSize: number;
  pageIndex: number;
  type?: string;
  city?: string;
  citylimit?: boolean;
  autoFitView?: boolean;
  extensions?: string;
}

// 为Weather API结果定义接口
interface AMapWeatherResult {
  info: string;
  infocode: string;
  count: string;
  status: string;
  // 返回格式1：嵌套在lives数组中
  lives?: {
    province: string;
    city: string;
    adcode: string;
    weather: string;
    temperature: string;
    winddirection: string;
    windpower: string;
    humidity: string;
    reporttime: string;
    temperature_float?: string;
    humidity_float?: string;
  }[];
  // 返回格式2：嵌套在liveData对象中
  liveData?: {
    province: string;
    city: string;
    adcode: string;
    weather: string;
    temperature: string;
    windDirection: string;
    windPower: string;
    humidity: string;
    reportTime: string;
  };
  // 返回格式3：直接在结果对象中
  province?: string;
  city?: string;
  adcode?: string;
  weather?: string;
  temperature?: string | number;
  windDirection?: string;
  windPower?: string;
  winddirection?: string; // 小写版本
  windpower?: string; // 小写版本
  humidity?: string;
  reportTime?: string; // 大写版本
  reporttime?: string; // 小写版本
}

interface AMapType {
  Geolocation: new (options: AMapGeolocationOptions) => {
    getCurrentPosition: (
      callback: (status: string, result: AMapGeolocationResult) => void,
    ) => void;
  };
  PlaceSearch: new (options: AMapSearchOptions) => {
    searchNearBy: (
      keywords: string,
      location: [number, number],
      distance: number,
      callback: (status: string, result: AMapSearchResult) => void,
    ) => void;
  };
  Weather: new () => {
    getLive: (
      city: string | number,
      callback: (err: string | null, result: AMapWeatherResult) => void,
    ) => void;
  };
  plugin: (name: string[], callback: () => void) => void;
  SecurityConfig?: {
    securityJsCode: string;
  };
}

interface AMapLoaderOptions {
  key: string;
  version: string;
  plugins?: string[];
  AMapUI?: {
    version?: string;
    plugins?: string[];
  };
  Loca?: {
    version?: string;
  };
  // 安全密钥相关属性
  securityJsCode?: string;
  // 其他可能的自定义属性
  [key: string]:
    | string
    | string[]
    | boolean
    | number
    | undefined
    | Record<string, unknown>;
}

// 加载高德地图JS API
let amapInitPromise: Promise<AMapType> | null = null;

export async function initAMap(): Promise<AMapType> {
  // 确保只在客户端环境执行
  if (typeof window === 'undefined') {
    throw new Error('高德地图只能在客户端环境中初始化');
  }

  // 设置安全配置
  setupSecurityConfig();

  if (!amapInitPromise) {
    // 构建加载配置
    const options: AMapLoaderOptions = {
      key: API_KEY,
      version: '2.0',
      plugins: [
        'AMap.PlaceSearch',
        'AMap.Geolocation',
        'AMap.Scale',
        'AMap.Weather',
      ],
      AMapUI: {
        version: '1.1',
        plugins: [],
      },
      Loca: {
        version: '2.0.0',
      },
    };

    // 加载API并处理错误
    amapInitPromise = AMapLoader.load(options)
      .then((AMap) => {
        console.log('高德地图加载成功');
        return AMap as AMapType;
      })
      .catch((error) => {
        console.error('高德地图加载失败:', error);
        throw new Error(`高德地图初始化失败: ${error.message}`);
      });
  }
  return amapInitPromise;
}

// 获取当前位置并返回详细地址信息
export async function getCurrentLocation(): Promise<{
  location: [number, number];
  address: string;
  cityCode: string;
  adcode: string;
}> {
  // 确保只在客户端环境执行
  if (typeof window === 'undefined') {
    console.warn('getCurrentLocation 只能在客户端环境中使用，返回默认位置');
    return {
      location: [121.473701, 31.230416], // 默认位置 - 上海
      address: '上海市',
      cityCode: '021',
      adcode: '310000',
    };
  }

  const AMap = await initAMap();

  return new Promise((resolve) => {
    const geolocation = new AMap.Geolocation({
      enableHighAccuracy: true,
      timeout: 10000,
      noIpLocate: 0,
      needAddress: true,
      extensions: 'all',
    });

    geolocation.getCurrentPosition(
      (status: string, result: AMapGeolocationResult) => {
        if (status === 'complete') {
          const { position, addressComponent, formattedAddress } = result;
          console.log('获取位置成功，详细信息:', result);
          console.log('地址组件:', addressComponent);

          // 确保获取adcode和citycode
          const adcode = addressComponent.adcode || '310000'; // 默认上海
          const citycode = addressComponent.citycode || '021';

          console.log(
            `获取到的城市代码: citycode=${citycode}, adcode=${adcode}`,
          );

          resolve({
            location: [position.lng, position.lat],
            address: formattedAddress,
            cityCode: citycode,
            adcode: adcode,
          });
        } else {
          console.warn('获取位置失败，使用默认位置', status, result);
          // 默认位置 - 上海市中心
          resolve({
            location: [121.473701, 31.230416],
            address: '上海市',
            cityCode: '021',
            adcode: '310000',
          });
        }
      },
    );
  });
}

// 搜索周边餐厅
export async function searchNearbyRestaurants(
  location: [number, number],
  keywords: string,
  distance: number,
  type: string = '餐饮',
): Promise<Restaurant[]> {
  // 确保只在客户端环境执行
  if (typeof window === 'undefined') {
    console.warn('searchNearbyRestaurants 只能在客户端环境中使用，返回空数组');
    return [];
  }

  console.log('高德地图API搜索参数:', { location, keywords, distance, type });

  try {
    const AMap = await initAMap();
    console.log('高德地图API初始化成功，开始搜索...');

    return new Promise<Restaurant[]>((resolve, reject) => {
      try {
        const placeSearch = new AMap.PlaceSearch({
          pageSize: 25,
          pageIndex: 1,
          type,
          city: '全国',
          citylimit: false,
          autoFitView: false,
          extensions: 'all',
        });
        console.log('PlaceSearch实例创建成功');

        placeSearch.searchNearBy(
          keywords,
          location,
          distance,
          (status: string, result: AMapSearchResult) => {
            console.log(
              '高德地图搜索回调状态:',
              status,
              '详情:',
              result?.info || '无详情',
            );

            // 完整打印返回结果以进行调试
            console.log('高德地图原始返回结果:', result);

            // 检查result是否包含了正确的数据结构
            if (result && typeof result === 'object') {
              console.log(
                '返回结果类型:',
                Object.prototype.toString.call(result),
              );
              console.log('返回结果的顶级属性:', Object.keys(result));

              // 检查是否有pois属性
              if (Array.isArray(result.pois)) {
                console.log('pois是数组，长度:', result.pois.length);

                // 检查第一个POI
                if (result.pois.length > 0) {
                  const firstPoi = result.pois[0];
                  console.log('第一个POI的结构:', Object.keys(firstPoi));
                }
              } else if (result.poiList && Array.isArray(result.poiList.pois)) {
                // 兼容旧格式
                console.log(
                  '旧格式：poiList.pois是数组，长度:',
                  result.poiList.pois.length,
                );
              }
            }

            // 使用条件逻辑处理两种可能的数据结构
            let pois: AMapPoiItem[] = [];

            if (status === 'complete') {
              // 尝试从result.pois获取
              if (result.pois && Array.isArray(result.pois)) {
                pois = result.pois;
              }
              // 兼容旧格式，从result.poiList.pois获取
              else if (result.poiList && Array.isArray(result.poiList.pois)) {
                pois = result.poiList.pois;
              }

              console.log('获取到的POI数量:', pois.length);

              if (pois.length > 0) {
                const restaurants: Restaurant[] = pois.map(
                  (poi: AMapPoiItem) => {
                    console.log(`处理餐厅: ${poi.name}`);

                    // 详细打印photos字段，用于调试
                    console.log(`餐厅[${poi.name}]的photos字段:`, poi.photos);

                    // 从location中提取坐标
                    let coordinates: [number, number] = [0, 0];

                    if (typeof poi.location === 'string') {
                      // 处理字符串格式的location (如 "104.041739,30.499227")
                      const parts = poi.location.split(',');
                      if (parts.length === 2) {
                        coordinates = [
                          parseFloat(parts[0]),
                          parseFloat(parts[1]),
                        ];
                      }
                    } else if (
                      poi.location &&
                      typeof poi.location === 'object'
                    ) {
                      // 处理对象格式的location (如 {lng: 104.041739, lat: 30.499227})
                      if ('lng' in poi.location && 'lat' in poi.location) {
                        // 使用更精确的类型断言
                        const loc = poi.location as unknown as {
                          lng: number;
                          lat: number;
                        };
                        coordinates = [loc.lng, loc.lat];
                      }
                    }

                    // 修正photos处理逻辑
                    const photoUrls: string[] = [];

                    // 1. 从photos数组中获取
                    if (poi.photos && Array.isArray(poi.photos)) {
                      console.log(
                        `餐厅[${poi.name}]的photos字段详情:`,
                        JSON.stringify(poi.photos),
                      );
                      poi.photos.forEach((photo: PhotoObject) => {
                        if (photo && typeof photo === 'object' && photo.url) {
                          photoUrls.push(photo.url);
                        }
                      });
                    }

                    // 2. 从biz_ext.image_urls获取 - 某些API版本可能使用这个字段
                    if (
                      photoUrls.length === 0 &&
                      poi.biz_ext &&
                      poi.biz_ext.image_urls
                    ) {
                      console.log(
                        `餐厅[${poi.name}]的biz_ext.image_urls字段:`,
                        poi.biz_ext.image_urls,
                      );
                      const imageUrls = poi.biz_ext.image_urls;
                      if (Array.isArray(imageUrls)) {
                        imageUrls.forEach((url: string) => {
                          if (url) photoUrls.push(url);
                        });
                      }
                    }

                    // 3. 检查其他可能包含图片的字段
                    if (photoUrls.length === 0) {
                      // 记录所有字段以便调试
                      console.log(
                        `餐厅[${poi.name}]的所有字段:`,
                        Object.keys(poi),
                      );

                      // 通用方式检查任何包含photo或image的字段
                      for (const key in poi) {
                        if (key.includes('photo') || key.includes('image')) {
                          const value = poi[key] as unknown;
                          console.log(`检查字段[${key}]:`, value);

                          if (
                            typeof value === 'string' &&
                            value.startsWith('http')
                          ) {
                            photoUrls.push(value);
                            break;
                          } else if (Array.isArray(value)) {
                            value.forEach((item: unknown) => {
                              if (
                                typeof item === 'string' &&
                                item.startsWith('http')
                              ) {
                                photoUrls.push(item);
                              } else if (item && typeof item === 'object') {
                                const imgObj = item as Record<string, unknown>;
                                if (
                                  typeof imgObj.url === 'string' &&
                                  imgObj.url.startsWith('http')
                                ) {
                                  photoUrls.push(imgObj.url);
                                }
                              }
                            });
                            if (photoUrls.length > 0) break;
                          }
                        }
                      }
                    }

                    // 4. 如果仍然没有图片，使用默认图片
                    if (photoUrls.length === 0) {
                      // 根据餐厅类别设置默认图片
                      const categoryNames = poi.type ? poi.type.split(';') : [];
                      const mainCategory = categoryNames[0] || '餐饮';

                      // 构建一个默认图片URL，可以根据分类选择不同的默认图片
                      const defaultImageUrl = `https://source.unsplash.com/800x600/?food,${encodeURIComponent(
                        mainCategory.toLowerCase(),
                      )},restaurant`;

                      photoUrls.push(defaultImageUrl);
                      console.log(
                        `餐厅[${poi.name}]使用默认图片:`,
                        defaultImageUrl,
                      );
                    }

                    console.log(
                      `餐厅[${poi.name}]处理后的图片URLs:`,
                      photoUrls,
                    );

                    return {
                      id: poi.id,
                      name: poi.name,
                      address: poi.address || '地址未知',
                      distance:
                        typeof poi.distance === 'string'
                          ? Number(poi.distance)
                          : (poi.distance as number) || 0,
                      rating: poi.biz_ext?.rating
                        ? parseFloat(poi.biz_ext.rating)
                        : 3.5,
                      price: poi.biz_ext?.cost
                        ? parseFloat(String(poi.biz_ext.cost))
                        : 0,
                      category: poi.type,
                      coordinates: coordinates,
                      businessHours:
                        poi.biz_ext?.open_time || poi.biz_ext?.opentime2,
                      tel: poi.tel,
                      website: poi.website,
                      photos: photoUrls, // 更新为处理后的图片URLs
                    };
                  },
                );

                resolve(restaurants);
              } else {
                console.warn('没有找到POI数据');
                resolve([]);
              }
            } else {
              console.warn('高德地图搜索无结果或发生错误', status, result);
              if (result?.info === 'INVALID_USER_SCODE') {
                console.error('高德地图API密钥校验失败，请检查密钥配置');
                reject(new Error('高德地图API密钥校验失败，请检查密钥配置'));
              } else {
                console.warn('返回空结果');
                resolve([]);
              }
            }
          },
        );
      } catch (error) {
        console.error('执行高德地图搜索时出错:', error);
        reject(error);
      }
    });
  } catch (error) {
    console.error('高德地图API初始化失败:', error);
    throw error;
  }
}

// 获取天气信息
export async function getWeatherInfo(
  location: [number, number],
): Promise<import('./types').WeatherInfo | null> {
  // 确保只在客户端环境执行
  if (typeof window === 'undefined') {
    console.warn('getWeatherInfo 只能在客户端环境中使用，返回null');
    return null;
  }

  try {
    const AMap = await initAMap();
    console.log('天气API: 高德地图初始化成功，开始获取天气信息...', location);

    // 先尝试获取城市编码
    let adcode = '310000'; // 默认上海
    try {
      const locationInfo = await getCurrentLocation();
      // 使用adcode替代cityCode
      adcode = locationInfo.adcode;
      console.log('使用城市编码获取天气:', adcode);
    } catch (err) {
      console.warn('获取城市编码失败，使用默认值:', err);
    }

    return new Promise((resolve, reject) => {
      // 加载天气查询插件
      AMap.plugin(['AMap.Weather'], function () {
        // 创建天气查询实例
        const weather = new AMap.Weather();

        // 获取实时天气信息 - 直接传入adcode作为参数，而不是对象
        weather.getLive(
          adcode, // 直接使用adcode作为第一个参数
          function (err, result: AMapWeatherResult) {
            console.log('天气查询结果:', err, result);

            if (!err && result) {
              // 三种可能的数据格式
              let weatherData;
              if (result.lives && result.lives.length > 0) {
                // Web API格式1
                weatherData = result.lives[0];
                resolve({
                  weather: weatherData.weather,
                  temperature: weatherData.temperature,
                  wind: `${weatherData.winddirection}风 ${weatherData.windpower}级`,
                  humidity: weatherData.humidity,
                  reportTime: weatherData.reporttime,
                  city: weatherData.city,
                });
              } else if (result.liveData) {
                // JS API格式2
                weatherData = result.liveData;
                resolve({
                  weather: weatherData.weather,
                  temperature: weatherData.temperature,
                  wind: `${weatherData.windDirection}风 ${weatherData.windPower}级`,
                  humidity: weatherData.humidity,
                  reportTime: weatherData.reportTime,
                  city: weatherData.city,
                });
              } else if (result.weather && result.city) {
                // 直接返回的天气对象格式3
                // 处理不同格式的风向和风力
                const windDirection =
                  result.windDirection || result.winddirection || '未知';
                const windPower =
                  result.windPower || result.windpower || '未知';
                // 处理不同格式的上报时间
                const reportTime =
                  result.reportTime ||
                  result.reporttime ||
                  new Date().toISOString();

                resolve({
                  weather: result.weather || '未知',
                  temperature:
                    typeof result.temperature === 'number'
                      ? result.temperature.toString()
                      : result.temperature || '0',
                  wind: `${windDirection}风 ${windPower}级`,
                  humidity: result.humidity || '0',
                  reportTime: reportTime,
                  city: result.city || '未知',
                });
              } else {
                console.error('天气数据格式不支持:', result);
                console.log('天气数据属性:', Object.keys(result));
                reject(
                  new Error(`天气数据格式不支持: ${JSON.stringify(result)}`),
                );
              }
            } else {
              console.error('获取天气信息失败:', err, result);
              reject(new Error(`获取天气信息失败: ${err || '未知错误'}`));
            }
          },
        );
      });
    });
  } catch (error) {
    console.error('天气API初始化失败:', error);
    return null;
  }
}
