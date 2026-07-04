/** @type {import('next').NextConfig} */
const demoAppUrl = process.env.DEMO_APP_URL ?? 'http://localhost:8081';

const nextConfig = {
  outputFileTracingRoot: new URL('../../', import.meta.url).pathname,
  async rewrites() {
    return [
      { source: '/embed', destination: `${demoAppUrl}/` },
      { source: '/embed/:path*', destination: `${demoAppUrl}/:path*` },
    ];
  },
};

export default nextConfig;
