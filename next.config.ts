import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  output: 'export', // 启用静态HTML导出
  basePath: process.env.NODE_ENV === 'production' ? '/lujiangc-dreamland' : '',
  images: {
    unoptimized: true, // 对于静态导出，需要禁用图片优化
    domains: [
      'images.unsplash.com',
      'source.unsplash.com',
      'store.is.autonavi.com',
      'webapi.amap.com',
      'restapi.amap.com',
      'a.amap.com',
      'lbs.amap.com',
      'aos-comment.amap.com',
    ],
  },
};

export default nextConfig;
