/** @type {import('next').NextConfig} */
const nextConfig = {
  // IMPORTANT: NEXT_PUBLIC_API_URL must be set BEFORE running `next build`
  // In .env.production (local):  NEXT_PUBLIC_API_URL=https://api.homegenny.com/api/v1
  // In Docker build:             --build-arg NEXT_PUBLIC_API_URL=https://api.homegenny.com/api/v1
  // Environment: block in docker-compose does NOT work for NEXT_PUBLIC vars

  experimental: {
    serverActions: {
      allowedOrigins: ['localhost:3000'],
    },
  },

  images: {
    domains: [
      'localhost',
      'storage.googleapis.com',
    ],
  },

  // Rewrite /api/v1/* → Nest backend in development.
  // Important: do NOT gate this on NEXT_PUBLIC_API_URL containing "localhost".
  // If env points to a remote API, the browser may still use same-origin
  // `/api/v1` (when NEXT_PUBLIC_API_URL is unset) — then this proxy is required.
  async rewrites() {
    if (process.env.NODE_ENV !== 'development') {
      return [];
    }
    const target = (process.env.BACKEND_PROXY_URL || 'http://127.0.0.1:3001/api/v1').replace(/\/$/, '');
    return [{ source: '/api/v1/:path*', destination: `${target}/:path*` }];
  },
};

module.exports = nextConfig;
