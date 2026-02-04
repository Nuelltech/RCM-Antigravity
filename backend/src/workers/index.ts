import './recalculation-worker';
import './invoice-processing.worker';
import './sales-processing.worker';
import './invoice-retry.worker';
import { recoveryService } from './recovery.service';

// Run recovery on startup (after a slight delay to ensure connections)
setTimeout(() => {
    recoveryService.recoverStuckInvoices().catch(err =>
        console.error('[WORKER-MANAGER] Failed to run recovery:', err)
    );
}, 5000);

console.log('=================================================');
console.log('[WORKER-MANAGER] 🚀 All workers have been initialized');
console.log('[WORKER-MANAGER] 1. Recalculation Worker');
console.log('[WORKER-MANAGER] 2. Invoice Processing Worker');
console.log('[WORKER-MANAGER] 3. Sales Processing Worker');
console.log('[WORKER-MANAGER] 4. Invoice Retry Worker');
console.log('=================================================');

// Keep process alive and handle signals
process.on('SIGTERM', () => {
    console.log('[WORKER-MANAGER] 🛑 Receiving SIGTERM, workers handling shutdown internally...');
});

process.on('SIGINT', () => {
    console.log('[WORKER-MANAGER] 🛑 Receiving SIGINT, workers handling shutdown internally...');
});
