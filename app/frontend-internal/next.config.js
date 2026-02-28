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
            {
                source: '/uploads/:path*',
                // NEXT_PUBLIC_API_URL includes trailing slash check if needed, but standard is usually without or handle duplicate slashes
                // Given .env has slash, we remove one from string or rely on valid url construction
                // Safest: process.env.NEXT_PUBLIC_API_URL + 'uploads/:path*' if env has slash
                destination: process.env.NEXT_PUBLIC_API_URL + 'uploads/:path*',
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
