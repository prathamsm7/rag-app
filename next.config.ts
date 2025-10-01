import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['pdf-parse'],
  typescript: {
    // Skip type checking during build for production
    ignoreBuildErrors: process.env.NODE_ENV === 'production',
  },
  eslint: {
    // Skip ESLint during build for production
    ignoreDuringBuilds: process.env.NODE_ENV === 'production',
  },
  webpack: (config) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
    };
    return config;
  },
};

export default nextConfig;
