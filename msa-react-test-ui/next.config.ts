import type { NextConfig } from 'next';

const gatewayUrl = process.env.GATEWAY_URL ?? 'http://127.0.0.1:8000';

const nextConfig: NextConfig = {
  output: 'standalone',
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${gatewayUrl}/:path*`,
      },
    ];
  },
};

export default nextConfig;
