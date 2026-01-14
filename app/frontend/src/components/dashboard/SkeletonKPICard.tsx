"use client";

interface SkeletonKPICardProps {
    className?: string;
}

export function SkeletonKPICard({ className = "" }: SkeletonKPICardProps) {
    return (
        <div className={`bg-white rounded-lg shadow p-6 ${className}`}>
            <div className="flex items-center justify-between mb-2">
                {/* Title skeleton */}
                <div className="h-4 bg-gray-200 rounded w-24 animate-pulse"></div>
                {/* Icon skeleton */}
                <div className="h-5 w-5 bg-gray-200 rounded animate-pulse"></div>
            </div>

            {/* Value skeleton */}
            <div className="h-8 bg-gray-200 rounded w-32 mb-1 animate-pulse"></div>

            {/* Subtitle skeleton */}
            <div className="h-3 bg-gray-200 rounded w-20 animate-pulse"></div>
        </div>
    );
}
