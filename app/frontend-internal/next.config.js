/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,
    // API calls to backend
    async rewrites() {
        return [
            {
                source: '/api/:path*',
                destination: process.env.NEXT_PUBLIC_API_URL + '/:path*',
            },
        ];
    },
    // Allow images from multiple sources
    images: {
        remotePatterns: [
            {
                protocol: 'https',
                hostname: '**',
            },
        ],
    },
};

module.exports = nextConfig;
