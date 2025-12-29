/**
 * Lead Status Badge Component
 * Shows colorful badge for each lead status
 */

interface LeadStatusBadgeProps {
    status: string;
}

const statusConfig: Record<string, { label: string; className: string }> = {
    new: {
        label: 'Novo',
        className: 'bg-blue-100 text-blue-800 border-blue-200',
    },
    contacted: {
        label: 'Contactado',
        className: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    },
    qualified: {
        label: 'Qualificado',
        className: 'bg-green-100 text-green-800 border-green-200',
    },
    proposal_sent: {
        label: 'Proposta Enviada',
        className: 'bg-purple-100 text-purple-800 border-purple-200',
    },
    demo_scheduled: {
        label: 'Demo Agendada',
        className: 'bg-indigo-100 text-indigo-800 border-indigo-200',
    },
    won: {
        label: 'Ganho 🎉',
        className: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    },
    lost: {
        label: 'Perdido',
        className: 'bg-red-100 text-red-800 border-red-200',
    },
    rejected: {
        label: 'Rejeitado',
        className: 'bg-gray-100 text-gray-800 border-gray-200',
    },
};

export function LeadStatusBadge({ status }: LeadStatusBadgeProps) {
    const config = statusConfig[status] || {
        label: status,
        className: 'bg-gray-100 text-gray-800 border-gray-200'
    };

    return (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${config.className}`}>
            {config.label}
        </span>
    );
}
