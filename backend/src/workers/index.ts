import './recalculation-worker';
import './invoice-processing.worker';
import './sales-processing.worker';
import './invoice-retry.worker';
import './seed-data.worker';
import './global-catalog.worker';
import { subscriptionCheckWorker, scheduleSubscriptionChecks } from './subscription-check.worker';
import { catalogScanWorker, scheduleCatalogScan } from './catalog-scan.worker';
import './alerts-processing.worker';
import { erosionAlertsWorker, scheduleErosionAlerts } from './erosion-alerts.worker';
import { recoveryService } from './recovery.service';

// Run recovery on startup (after a slight delay to ensure connections)
setTimeout(() => {
    // Recover invoices stuck in pending/processing state
    recoveryService.recoverStuckInvoices().catch(err =>
        console.error('[WORKER-MANAGER] Failed to run invoice recovery:', err)
    );
    // Recover scheduled jobs missed while server was asleep (Render sleep mode)
    recoveryService.recoverMissedScheduledJobs().catch(err =>
        console.error('[WORKER-MANAGER] Failed to run scheduled job recovery:', err)
    );
    // Schedule daily subscription checks
    scheduleSubscriptionChecks().catch(err =>
        console.error('[WORKER-MANAGER] Failed to schedule subscription checks:', err)
    );
    // Schedule nightly global catalog scan
    scheduleCatalogScan().catch(err =>
        console.error('[WORKER-MANAGER] Failed to schedule catalog scan:', err)
    );
    // Schedule daily erosion alerts check
    scheduleErosionAlerts().catch(err =>
        console.error('[WORKER-MANAGER] Failed to schedule erosion alerts:', err)
    );
}, 5000);

console.log('=================================================');
console.log('[WORKER-MANAGER] 🚀 All workers have been initialized');
console.log('[WORKER-MANAGER] 1. Recalculation Worker');
console.log('[WORKER-MANAGER] 2. Invoice Processing Worker');
console.log('[WORKER-MANAGER] 3. Sales Processing Worker');
console.log('[WORKER-MANAGER] 4. Invoice Retry Worker');
console.log('[WORKER-MANAGER] 5. Global Catalog Worker');
console.log('[WORKER-MANAGER] 6. Catalog Scan Worker (Nightly 03:00 AM)');
console.log('[WORKER-MANAGER] 8. Alerts Processing Worker');
console.log('[WORKER-MANAGER] 9. Erosion Alerts Worker (Daily 04:00 AM)');
console.log('=================================================');

// Keep process alive and handle signals
process.on('SIGTERM', () => {
    console.log('[WORKER-MANAGER] 🛑 Receiving SIGTERM, workers handling shutdown internally...');
});

process.on('SIGINT', () => {
    console.log('[WORKER-MANAGER] 🛑 Receiving SIGINT, workers handling shutdown internally...');
});
