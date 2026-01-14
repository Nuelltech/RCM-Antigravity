import { theme } from '../ui/theme';

export const getAlertParams = (type: string) => {
    switch (type) {
        case 'cmv': return { label: 'CMV ELEVADO' };
        case 'cost_increase': return { label: 'AUMENTO CUSTO' };
        case 'inactivity': return { label: 'INATIVIDADE' };
        case 'stale_price': return { label: 'PREÇO DESATUALIZADO' };
        default: return { label: 'ALERTA' };
    }
};

export const getSeverityColor = (severity: string) => {
    switch (severity) {
        case 'high': return theme.colors.error;      // Critical/Red
        case 'warning': return theme.colors.warning; // Warning/Orange
        case 'info': return theme.colors.primary;    // Info/Blue
        default: return theme.colors.surface;
    }
};
