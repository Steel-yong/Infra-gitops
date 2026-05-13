/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@pubg-helper/shared'],
  allowedDevOrigins: ['172.20.0.2', '127.0.0.1'],
  webpack: (config) => {
    config.watchOptions = {
      poll: 2000,
      aggregateTimeout: 300,
      ignored: ['**/node_modules/**', '**/.next/**'],
    };
    return config;
  },
};

module.exports = nextConfig;
