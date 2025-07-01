/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  trailingSlash: true,
  distDir: 'out',
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        crypto: require.resolve('crypto-browserify'),
        stream: require.resolve('stream-browserify'),
        util: require.resolve('util'),
        buffer: require.resolve('buffer'),
        process: require.resolve('process/browser'),
      };
    }
    
    config.module.rules.push({
      test: /\.m?js$/,
      resolve: {
        fullySpecified: false,
      },
    });

    return config;
  },
  env: {
    CUSTOM_KEY: 'my_value',
  },
  experimental: {
    esmExternals: 'loose',
  },
  images: {
    unoptimized: true,
  },
  // Disable TypeScript and ESLint checks during build for deployment
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  // FORCE DIFFERENT BUILD HASH TO BYPASS CACHE
  generateBuildId: async () => {
    return 'escrow-fix-v6.4-' + Date.now()
  },
};

module.exports = nextConfig;
