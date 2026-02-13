"use client";

import { Check, X } from 'lucide-react';

interface Feature {
    key: string;
    name: string;
    included: boolean;
}

interface FeatureListProps {
    features: Feature[];
    compact?: boolean;
}

export function FeatureList({ features, compact = false }: FeatureListProps) {
    return (
        <ul className={`space-y-${compact ? '1' : '2'}`}>
            {features.map((feature) => (
                <li
                    key={feature.key}
                    className={`flex items-center gap-2 ${compact ? 'text-sm' : 'text-base'
                        }`}
                >
                    {feature.included ? (
                        <Check className="h-4 w-4 flex-shrink-0 text-green-500" />
                    ) : (
                        <X className="h-4 w-4 flex-shrink-0 text-gray-300" />
                    )}
                    <span
                        className={
                            feature.included
                                ? 'text-gray-900'
                                : 'text-gray-400 line-through'
                        }
                    >
                        {feature.name}
                    </span>
                </li>
            ))}
        </ul>
    );
}
