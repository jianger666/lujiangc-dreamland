'use client';

import AMapLoader from '@amap/amap-jsapi-loader';
import { WeatherInfo } from '../types';

// 从环境变量获取高德地图API密钥
const API_KEY = process.env._AMAP_KEY || '';
const SECURITY_KEY = process.env.AMAP_SECRET || '';

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

// 更新AMapPoiItem的照片类型
interface AMapPoiPhoto {
  title: string;
  url: string;
}

// 更新为与高德API实际返回结构匹配的接口
export interface AMapPoiItem {
  id: string;
  name: string;
  type: string;
  location: [number, number];
  address: string;
  tel: string;
  distance: number;
  shopinfo: string;
  website: string;
  pcode: string;
  citycode: string;
  adcode: string;
  postcode: string;
  pname: string;
  cityname: string;
  adname: string;
  email: string;
  photos?: AMapPoiPhoto[] | '';
  entr_location: [number, number] | null;
  exit_location: [number, number] | null;
  groupbuy: boolean;
  discount: boolean;
  indoor_map: boolean;
  rating: string;
  cost: string;
  meal_ordering: string;
}

// 更新为与高德API实际返回格式匹配
interface AMapSearchResult {
  status: string;
  info: string;
  infocode: string;
  count: string;
  poiList: {
    count: number;
    pageIndex: number;
    pageSize: number;
    pois: AMapPoiItem[];
  }; // 直接包含poiList数组
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
  // 响应状态信息
  info: string; // 状态信息，如"OK"
  infocode: string;
  status: string;
  // 直接在结果对象中的主要字段
  province?: string;
  city?: string;
  adcode?: string;
  weather?: string;
  temperature?: string | number;
  windDirection?: string;
  windPower?: string;
  winddirection?: string; // 小写版本备用
  windpower?: string; // 小写版本备用
  humidity?: string;
  reportTime?: string;
  reporttime?: string; // 小写版本备用
}

interface AMapType {
  Geolocation: new (options: AMapGeolocationOptions) => {
    getCurrentPosition: (
      callback: (status: string, result: AMapGeolocationResult) => void
    ) => void;
  };
  PlaceSearch: new (options: AMapSearchOptions) => {
    searchNearBy: (
      keywords: string,
      location: [number, number],
      distance: number,
      callback: (status: string, result: AMapSearchResult) => void
    ) => void;
  };
  Weather: new () => {
    getLive: (
      city: string | number,
      callback: (err: string | null, result: AMapWeatherResult) => void
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
    };

    // 初始化高德地图API
    amapInitPromise = AMapLoader.load(options) as Promise<AMapType>;
  }

  try {
    return await amapInitPromise;
  } catch (error) {
    console.error('高德地图API加载失败:', error);
    amapInitPromise = null;
    throw error;
  }
}

// 获取当前地理位置
export async function getCurrentLocation(): Promise<{
  location: [number, number];
  address: string;
  cityCode: string;
  adcode: string;
}> {
  const AMap = await initAMap();

  // 创建定位对象
  const geolocation = new AMap.Geolocation({
    enableHighAccuracy: true, // 使用高精度定位
    timeout: 10000, // 超时时间为10秒
    noIpLocate: 0, // 关闭IP定位
    needAddress: true, // 需要获取详细地址
    extensions: 'all', // 获取所有定位信息
  });

  return new Promise((resolve, reject) => {
    geolocation.getCurrentPosition((status, result) => {
      if (status === 'complete') {
        // 解析返回的结果
        const { position, addressComponent, formattedAddress } =
          result as AMapGeolocationResult;

        // 返回标准化的位置信息
        resolve({
          location: [position.lng, position.lat],
          address: formattedAddress,
          cityCode: addressComponent.citycode,
          adcode: addressComponent.adcode,
        });
      } else {
        // 备用方案：如果高精度定位失败，尝试使用IP定位
        console.warn('高精度定位失败，使用IP定位');
        reject(new Error('定位失败: ' + status));
      }
    });
  });
}

// 搜索附近餐厅
export async function searchNearbyRestaurants(
  location: [number, number],
  keywords: string,
  distance: number
): Promise<AMapPoiItem[]> {
  const AMap = await initAMap();

  // 创建搜索实例
  const placeSearch = new AMap.PlaceSearch({
    pageSize: 50, // 每页结果数
    pageIndex: 1, // 页码
    type: '餐饮', // 搜索类型限定为餐饮
    extensions: 'all', // 返回详细信息
  });

  return new Promise((resolve, reject) => {
    // 搜索周边
    placeSearch.searchNearBy(keywords, location, distance, (status, result) => {
      if (status === 'complete' && result.poiList) {
        // 成功获取结果
        const restaurants = result.poiList.pois;
        resolve(restaurants);
      } else {
        // 搜索失败
        console.error('搜索失败:', status, result);
        reject(new Error('搜索餐厅失败: ' + status));
      }
    });
  });
}

// 获取当前位置的天气信息
export async function getWeatherInfo(
  location: [number, number]
): Promise<WeatherInfo | null> {
  try {
    console.log('调用getWeatherInfo，传入坐标:', location);
    const AMap = await initAMap();
    const weather = new AMap.Weather();

    // 获取行政区编码
    let adcode: string;

    try {
      // 当前仍然使用getCurrentLocation获取adcode，但保留传入的位置信息用于调试
      const locationInfo = await getCurrentLocation();
      console.log('locationInfo', locationInfo);

      adcode = locationInfo.adcode;
      console.log(
        '获取到行政区编码:',
        adcode,
        '当前位置:',
        locationInfo.location
      );
    } catch (error) {
      console.error('获取行政区编码失败:', error);
      return null;
    }

    return new Promise<WeatherInfo>((resolve, reject) => {
      weather.getLive(adcode, (err, result) => {
        if (err) {
          reject(new Error('获取天气信息失败: ' + err));
          return;
        }
        console.log('result', JSON.stringify(result));

        // 检查响应是否成功
        const isSuccess = result.status === '1' || result.info === 'OK';

        // 直接处理返回的数据格式
        if (result && isSuccess && result.weather) {
          const windDirection =
            result.windDirection || result.winddirection || '';
          const windPower = result.windPower || result.windpower || '';

          const weatherData: WeatherInfo = {
            weather: result.weather,
            temperature: result.temperature?.toString() || '',
            wind: `${windDirection}风 ${windPower}`,
            humidity: result.humidity || '',
            reportTime: result.reportTime || result.reporttime || '',
            city: result.city || '',
          };

          resolve(weatherData);
        } else {
          reject(new Error('获取天气信息失败'));
        }
      });
    });
  } catch (error) {
    console.error('获取天气信息过程中出错:', error);
    return null;
  }
}
