/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable TypeScript and ESLint checking during build
  typescript: {
    ignoreBuildErrors: false,
  },
  eslint: {
    ignoreDuringBuilds: false,
  },
  
  // Configure build output
  distDir: '../../../.next',
  
  // Enable React strict mode
  reactStrictMode: true,
  
  // Configure images if needed
  images: {
    domains: [], // Add domains for external images if needed
  },
   experimental: {
    serverComponentsExternalPackages: ['knex', 'sqlite3', 'oracledb', 'mysql2', 'pg'],
  },
};

module.exports = nextConfig;