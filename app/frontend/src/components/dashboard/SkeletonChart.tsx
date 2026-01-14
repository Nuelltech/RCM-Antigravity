"use client";

export function SkeletonChart() {
    return (
        <div className="bg-white rounded-lg shadow p-6">
            {/* Title skeleton */}
            <div className="h-6 bg-gray-200 rounded w-40 mb-6 animate-pulse"></div>

            {/* Chart area skeleton */}
            <div className="relative h-64 bg-gray-50 rounded animate-pulse">
                {/* Simulated chart bars */}
                <div className="absolute bottom-0 left-0 right-0 flex items-end justify-around h-full p-4 gap-2">
                    <div className="bg-gray-200 rounded-t w-full" style={{ height: '40%' }}></div>
                    <div className="bg-gray-200 rounded-t w-full" style={{ height: '60%' }}></div>
                    <div className="bg-gray-200 rounded-t w-full" style={{ height: '35%' }}></div>
                    <div className="bg-gray-200 rounded-t w-full" style={{ height: '75%' }}></div>
                    <div className="bg-gray-200 rounded-t w-full" style={{ height: '50%' }}></div>
                </div>
            </div>

            {/* Legend skeleton */}
            <div className="flex justify-center gap-6 mt-4">
                <div className="flex items-center gap-2">
                    <div className="h-3 w-3 bg-gray-200 rounded-full animate-pulse"></div>
                    <div className="h-3 bg-gray-200 rounded w-16 animate-pulse"></div>
                </div>
                <div className="flex items-center gap-2">
                    <div className="h-3 w-3 bg-gray-200 rounded-full animate-pulse"></div>
                    <div className="h-3 bg-gray-200 rounded w-16 animate-pulse"></div>
                </div>
            </div>
        </div>
    );
}
