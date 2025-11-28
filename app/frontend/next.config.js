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
        ],
    },
    // Standalone output for production deployment
    output: process.env.NODE_ENV === 'production' ? 'standalone' : undefined,
    // Environment variables
    env: {
        NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001',
    },
};

module.exports = nextConfig;
