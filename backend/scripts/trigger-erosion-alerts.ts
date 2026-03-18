import { erosionAlertsQueue } from '../src/workers/erosion-alerts.worker';

async function main() {
    console.log('🚀 A acionar o processo de alertas de erosão manualmente...');
    
    // Adiciona o job à fila. O worker (se estiver a correr) vai apanhá-lo imediatamente.
    const job = await erosionAlertsQueue.add('manual-erosion-check', {});
    
    console.log(`✅ Job adicionado com sucesso (ID: ${job.id}).`);
    console.log('Garanta que o processo de workers (npm run start:worker) está a correr para este ser processado em background.');
    
    process.exit(0);
}

main().catch((err) => {
    console.error('❌ Erro ao acionar o alerta:', err);
    process.exit(1);
});
