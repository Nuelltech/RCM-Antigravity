/**
 * Basic logging utility
 * 
 * Simple console logging for now.
 * Can be upgraded to Pino with file rotation later.
 */

export interface LogEvent {
    event: string;
    timestamp: string;
    [key: string]: any;
}

export function logInvoiceEvent(event: string, data: any): void {
    const logEntry: LogEvent = {
        event,
        timestamp: new Date().toISOString(),
        ...data
    };

    console.log(`[InvoiceLog] ${JSON.stringify(logEntry)}`);
}

export const logger = {
    info: (message: string, data?: any) => {
        console.log(`[INFO] ${message}`, data || '');
    },
    warn: (message: string, data?: any) => {
        console.warn(`[WARN] ${message}`, data || '');
    },
    error: (message: string, data?: any) => {
        console.error(`[ERROR] ${message}`, data || '');
    }
};
