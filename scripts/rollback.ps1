# Script de Rollback - Restaurar Backup (PowerShell)
# Uso: .\rollback.ps1 -BackupFile ".\backups\backup_20231217_120000.sql"

param(
    [Parameter(Mandatory=$true)]
    [string]$BackupFile,
    [string]$ContainerName = "rcm-mysql",
    [string]$DbName = "rcm_db",
    [string]$DbUser = "root",
    [string]$DbPass = "root"
)

$ErrorActionPreference = "Stop"

# Verificar se ficheiro existe
if (!(Test-Path $BackupFile)) {
    Write-Host "❌ Erro: Ficheiro não encontrado: $BackupFile" -ForegroundColor Red
    Write-Host ""
    Write-Host "Backups disponíveis:" -ForegroundColor Yellow
    Get-ChildItem -Path ".\backups" -Filter "*.sql" -ErrorAction SilentlyContinue | 
        Format-Table Name, Length, LastWriteTime -AutoSize
    exit 1
}

# Confirmação
Write-Host "⚠️  ATENÇÃO: ROLLBACK DA BASE DE DADOS" -ForegroundColor Red
Write-Host ""
Write-Host "   Isto vai:" -ForegroundColor Yellow
Write-Host "   1. Parar a aplicação" -ForegroundColor White
Write-Host "   2. APAGAR a base de dados atual" -ForegroundColor Red
Write-Host "   3. Restaurar backup: $(Split-Path $BackupFile -Leaf)" -ForegroundColor White
Write-Host ""
$confirm = Read-Host "Tem CERTEZA que deseja continuar? (digite 'yes')"

if ($confirm -ne "yes") {
    Write-Host "❌ Cancelado pelo utilizador" -ForegroundColor Yellow
    exit 0
}

Write-Host ""
Write-Host "🔄 Iniciando rollback..." -ForegroundColor Cyan

# 1. Parar aplicação
Write-Host "1️⃣  A parar aplicação..." -ForegroundColor Yellow
Set-Location ..
docker-compose down
Write-Host "✅ Aplicação parada" -ForegroundColor Green

# 2. Recriar database
Write-Host "2️⃣  A recriar base de dados..." -ForegroundColor Yellow
$dropDbCmd = "mysql -u $DbUser -p$DbPass -e `"DROP DATABASE IF EXISTS $DbName; CREATE DATABASE $DbName CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`""
docker exec $ContainerName sh -c $dropDbCmd
Write-Host "✅ Base de dados recriada" -ForegroundColor Green

# 3. Restaurar backup
Write-Host "3️⃣  A restaurar backup..." -ForegroundColor Yellow
Get-Content $BackupFile | docker exec -i $ContainerName mysql -u $DbUser -p$DbPass $DbName

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Backup restaurado com sucesso" -ForegroundColor Green
} else {
    Write-Host "❌ Erro ao restaurar backup!" -ForegroundColor Red
    exit 1
}

# 4. Reiniciar aplicação
Write-Host "4️⃣  A reiniciar aplicação..." -ForegroundColor Yellow
docker-compose up -d
Write-Host "✅ Aplicação reiniciada" -ForegroundColor Green

Write-Host ""
Write-Host "✅ ROLLBACK COMPLETO!" -ForegroundColor Green
Write-Host "   A aplicação está a arrancar. Aguarde alguns segundos..." -ForegroundColor White
Write-Host ""
Write-Host "   Verificar logs:" -ForegroundColor Yellow
Write-Host "   docker-compose logs -f backend" -ForegroundColor Cyan
