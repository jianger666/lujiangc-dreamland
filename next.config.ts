import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'source.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'store.is.autonavi.com',
      },
      {
        protocol: 'https',
        hostname: 'webapi.amap.com',
      },
      {
        protocol: 'https',
        hostname: 'restapi.amap.com',
      },
      {
        protocol: 'https',
        hostname: 'a.amap.com',
      },
      {
        protocol: 'https',
        hostname: 'lbs.amap.com',
      },
      {
        protocol: 'https',
        hostname: 'aos-comment.amap.com',
      },
    ],
  },
};

export default nextConfig;
