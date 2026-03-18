#!/usr/bin/env tsx

/**
 * 🚨 BACKUP RÁPIDO - Executar ANTES de qualquer alteração de schema
 * 
 * Este script faz:
 * 1. Backup completo da base de dados (JSON)
 * 2. Backup do schema.prisma
 * 3. Verificação de que os backups foram criados
 */

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

const BACKUP_DIR = path.join(__dirname, '../backups');

console.log('🚨 BACKUP RÁPIDO - Protegendo dados e ficheiros...\n');

try {
    // 1. Criar diretório de backups se não existir
    if (!fs.existsSync(BACKUP_DIR)) {
        fs.mkdirSync(BACKUP_DIR, { recursive: true });
        console.log('📁 Criado diretório de backups');
    }

    // 2. Backup de DADOS (base de dados completa)
    console.log('💾 Fazendo backup da base de dados...');
    execSync('npx tsx scripts/backup_data.ts', {
        cwd: path.join(__dirname, '..'),
        stdio: 'inherit'
    });

    // 3. Backup do SCHEMA
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const schemaSource = path.join(__dirname, '../prisma/schema.prisma');
    const schemaBackup = path.join(BACKUP_DIR, `schema.prisma.${timestamp}`);

    console.log('\n📄 Fazendo backup do schema...');
    fs.copyFileSync(schemaSource, schemaBackup);
    console.log(`✅ Schema copiado para: ${schemaBackup}`);

    // 4. Verificar que backups existem
    console.log('\n🔍 Verificando backups criados...');

    const jsonBackupDir = path.join(BACKUP_DIR, 'json');
    if (fs.existsSync(jsonBackupDir)) {
        const folders = fs.readdirSync(jsonBackupDir)
            .filter(f => fs.statSync(path.join(jsonBackupDir, f)).isDirectory())
            .sort()
            .reverse();

        if (folders.length > 0) {
            console.log(`✅ Último backup de dados: ${folders[0]}`);
        } else {
            console.warn('⚠️  Nenhum backup de dados encontrado!');
        }
    }

    // Check schema backups
    const schemaBackups = fs.readdirSync(BACKUP_DIR).filter(f => f.endsWith(timestamp));
    if (schemaBackups.length > 0) {
        console.log(`✅ Schemas copiados: ${schemaBackups.length} ficheiros`);
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅ BACKUP COMPLETO! Podes agora fazer alterações com segurança.');
    console.log('='.repeat(60));
    console.log('\n💡 Para restaurar: npx tsx scripts/restore_data.ts\n');

} catch (error: any) {
    console.error('\n❌ ERRO durante backup:', error.message);
    console.error('🚨 NÃO faças alterações sem backup bem-sucedido!');
    process.exit(1);
}
