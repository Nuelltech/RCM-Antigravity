
'use client';

import { useSubscription } from '@/contexts/SubscriptionContext';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export function TrialBanner() {
    const { status, trialEnd, daysRemaining, loading } = useSubscription();

    console.log('[TrialBanner] Debug:', { status, trialEnd, daysRemaining, loading });

    if (loading) return null;

    // Logic to determine if banner should be shown
    const isTrial = status === 'trial';
    const isGracePeriod = status === 'grace_period';
    const hasTrialDate = !!trialEnd && new Date(trialEnd) > new Date();

    if (!isTrial && !isGracePeriod && !hasTrialDate) return null;

    // Calculate days if missing from context
    const days = daysRemaining ?? (trialEnd ? Math.ceil((new Date(trialEnd).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) : 0);

    if (isGracePeriod) {
        return (
            <div className="bg-red-600 text-white px-4 py-3 shadow-sm">
                <div className="container mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
                    <p className="font-medium">
                        A sua subscrição expirou! Tem {days} dias para renovar antes que a conta seja suspensa.
                    </p>
                    <Button variant="secondary" size="sm" asChild className="whitespace-nowrap bg-white text-red-600 hover:bg-gray-100 border-none">
                        <Link href="/settings/subscription">
                            Renovar Agora
                        </Link>
                    </Button>
                </div>
            </div>
        );
    }

    if (isTrial || hasTrialDate) {
        // Show orange warning if < 3 days
        const isUrgent = days <= 3;
        const bgColor = isUrgent ? 'bg-orange-600' : 'bg-blue-600';

        return (
            <div className={`${bgColor} text-white px-4 py-3 shadow-sm`}>
                <div className="container mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
                    <p className="font-medium">
                        {isUrgent
                            ? `O seu período de teste termina em ${days} dias. Subscreva para não perder acesso.`
                            : `Está a utilizar a versão de teste. Restam ${days} dias.`
                        }
                    </p>
                    <Button variant="secondary" size="sm" asChild className={`whitespace-nowrap bg-white ${isUrgent ? 'text-orange-600' : 'text-blue-600'} hover:bg-gray-100 border-none`}>
                        <Link href="/settings/subscription">
                            Subscrever
                        </Link>
                    </Button>
                </div>
            </div>
        );
    }

    return null;
}
