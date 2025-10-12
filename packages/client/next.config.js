/** @type {import('next').NextConfig} */
const nextConfig = {
  distDir: '../../.next',
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://localhost:3001/api/:path*',
      },
    ];
  },
};

module.exports = nextConfig;
