/** @type {import('next').NextConfig} */
const nextConfig = {
    experimental: {
        turbo: false,
    },
    images: {
        domains: ['qcxsrkpddxkljwaiqyux.supabase.co'],
        remotePatterns: [
          {
            protocol: 'https',
            hostname: 'images.weserv.nl',
            pathname: '/**',
          },
        ],
      },
};

export default nextConfig;
