/** @type {import('next').NextConfig} */
const nextConfig = {
    images: {
        domains: ['localhost', 'res.cloudinary.com'],
        remotePatterns: [
            {
                protocol: 'https',
                hostname: '**.onrender.com',
            },
            {
                protocol: 'https',
                hostname: '**.vercel.app',
            },
            {
                protocol: 'https',
                hostname: 'rcm-app.com',
            },
            {
                protocol: 'https',
                hostname: '*.rcm-app.com',
            },
        ],
    },
    // API Proxy for development/Codespaces (avoids CORS issues)
    // In production, this is ignored and frontend calls backend directly via NEXT_PUBLIC_API_URL
    async rewrites() {
        // Only enable proxy in development
        if (process.env.NODE_ENV !== 'production') {
            return [
                {
                    source: '/api/:path*',
                    destination: 'http://localhost:3001/api/:path*',
                },
            ];
        }
        return [];
    },
    // Standalone output for production deployment
    output: 'standalone',
    // Environment variables
    env: {
        NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001',
    },
};

module.exports = nextConfig;
