// 美食分类（保留供将来扩展使用）
export interface FoodCategory {
  id: string;
  name: string;
  icon?: string; // 可选图标
  selected: boolean;
}

// 筛选条件（保留供将来扩展使用）
export interface FilterOptions {
  category: string; // 单选食物分类
  price: [number, number]; // 价格范围
  distance: number; // 距离，单位：米
  rating: number; // 最低评分
  keywords: string; // 关键词搜索
}

// 天气信息接口
export interface WeatherInfo {
  weather: string;
  temperature: string;
  wind: string;
  humidity: string;
  reportTime: string;
  city?: string;
}

// 地图上的餐厅点位
export interface Restaurant {
  id: string;
  name: string;
  address: string;
  distance: number; // 距离，单位：米
  rating: number; // 评分
  price: number; // 人均价格
  category: string; // 分类
  coordinates: [number, number]; // 坐标 [经度, 纬度]
  tel?: string; // 电话
  website?: string; // 网站
  photos?: string[]; // 餐厅图片URL数组
}
