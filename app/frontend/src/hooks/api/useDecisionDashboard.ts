import useSWR from 'swr';
import { fetchClient } from '@/lib/api';

export interface StructuralProblem {
    id: string; // menu_item_id as string
    name: string;
    loss: number;
    cmv: number;
    targetCmv: number;
    suggestedAction: string;
}

export interface RecentChange {
    id: string; // alert id as string
    name: string;
    deltaLoss: number;
    extraSalesNeeded?: number;
    priceAdjustment?: number;
    menuItemId: number;
}

export interface ActionTask {
    id: string;
    label: string;
    completed: boolean;
    linkedItemId: string;
    type: 'structural' | 'recent';
}

export interface DecisionDashboardData {
    marginStatus: {
        currentLoss: number;
        currentGain: number;
        netBalance: number;
        additionalRisk: number;
        cmv: number;
        targetCmv: number;
    };
    structuralProblems: {
        items: StructuralProblem[];
        totalItems: number;
    };
    recentChanges: {
        items: RecentChange[];
        totalItems: number;
    };
    actionList: {
        tasks: ActionTask[];
    };
}

export function useDecisionDashboard() {
    const fetcher = async (url: string) => {
        return fetchClient(url, { method: 'GET' });
    };

    const { data, error, isLoading, isValidating, mutate } = useSWR<DecisionDashboardData>(
        '/dashboard/decision',
        fetcher,
        {
            revalidateOnFocus: true,
            revalidateIfStale: true
        }
    );

    const refreshDashboard = async () => {
        // Ignora a cache do SWR invocando manualmente o pedido e forçando erro ao cache do backend
        await fetchClient('/dashboard/decision?refresh=true', { method: 'GET' });
        mutate();
    };

    return {
        data,
        isLoading,
        error,
        mutate,
        refreshDashboard,
        isValidating // Expose isValidating for loading state
    };
}
