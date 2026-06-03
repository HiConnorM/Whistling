import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@whistling/domain', '@whistling/db', '@whistling/jobs'],
  experimental: {
    serverActions: {
      allowedOrigins: [process.env['NEXT_PUBLIC_APP_URL'] ?? 'http://localhost:3000'],
    },
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**.googleusercontent.com' },
      { protocol: 'https', hostname: '**.fbcdn.net' },
    ],
  },
}

export default nextConfig
