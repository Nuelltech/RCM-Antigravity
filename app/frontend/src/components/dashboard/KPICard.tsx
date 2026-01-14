import { TrendingUp, TrendingDown } from 'lucide-react';
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface KPICardProps {
    title: string;
    value: number | string;
    change?: number;
    trend?: 'up' | 'down';
    isPercentage?: boolean;
    isCurrency?: boolean;
    icon?: React.ReactNode;
    description?: string;
    valueClassName?: string;
}

export function KPICard({
    title,
    value,
    change,
    trend,
    isPercentage = false,
    isCurrency = false,
    icon,
    description,
    valueClassName
}: KPICardProps) {
    const displayValue = isPercentage
        ? `${value}%`
        : isCurrency
            ? `€ ${typeof value === 'number' ? value.toFixed(2) : value}`
            : value;

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">
                    {title}
                </CardTitle>
                {icon && <div className="text-gray-400">{icon}</div>}
            </CardHeader>
            <CardContent>
                <div className={`text-2xl font-bold ${valueClassName || 'text-gray-900'}`}>
                    {displayValue}
                </div>
                {(change !== undefined && trend) ? (
                    <div className="flex items-center gap-1 mt-1">
                        {trend === 'up' ? (
                            <TrendingUp className="w-4 h-4 text-green-600" />
                        ) : (
                            <TrendingDown className="w-4 h-4 text-red-600" />
                        )}
                        <span className={`text-sm font-medium ${trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>
                            {change > 0 ? '+' : ''}{change}%
                        </span>
                        <span className="text-sm text-gray-500 ml-1">
                            desde último mês
                        </span>
                    </div>
                ) : description ? (
                    <p className="text-xs text-muted-foreground mt-1">
                        {description}
                    </p>
                ) : null}
            </CardContent>
        </Card>
    );
}
