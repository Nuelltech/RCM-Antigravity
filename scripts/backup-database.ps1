# Script de Backup da Base de Dados (PowerShell)
# Uso: .\backup-database.ps1

param(
    [string]$ContainerName = "rcm-mysql",
    [string]$DbName = "rcm_db",
    [string]$DbUser = "root",
    [string]$DbPass = "root"
)

$ErrorActionPreference = "Stop"

$Timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$BackupDir = ".\backups"
$BackupFile = "$BackupDir\backup_$Timestamp.sql"

Write-Host "🔄 Iniciando backup da base de dados..." -ForegroundColor Cyan

# Criar diretório de backups
if (!(Test-Path $BackupDir)) {
    New-Item -ItemType Directory -Path $BackupDir | Out-Null
}

# Verificar se container está a correr
Write-Host "📦 A verificar container Docker..." -ForegroundColor Yellow
$containerRunning = docker ps --format "{{.Names}}" | Select-String -Pattern $ContainerName

if (!$containerRunning) {
    Write-Host "❌ Erro: Container '$ContainerName' não está a correr!" -ForegroundColor Red
    Write-Host "   Inicie com: docker-compose up -d" -ForegroundColor Yellow
    exit 1
}

# Fazer backup
Write-Host "📦 A criar backup completo..." -ForegroundColor Yellow
$mysqldumpCmd = "mysqldump -u $DbUser -p$DbPass --single-transaction --routines --triggers --events --set-gtid-purged=OFF $DbName"

docker exec $ContainerName sh -c $mysqldumpCmd | Out-File -FilePath $BackupFile -Encoding utf8

# Verificar se backup foi criado
if (Test-Path $BackupFile) {
    $FileSize = (Get-Item $BackupFile).Length / 1MB
    Write-Host "✅ Backup criado com sucesso!" -ForegroundColor Green
    Write-Host "   Ficheiro: backup_$Timestamp.sql" -ForegroundColor White
    Write-Host "   Tamanho: $([math]::Round($FileSize, 2)) MB" -ForegroundColor White
    Write-Host "   Localização: $BackupDir\" -ForegroundColor White
    
    # Guardar referência ao último backup
    "backup_$Timestamp.sql" | Out-File -FilePath "$BackupDir\last_backup.txt" -Encoding utf8
} else {
    Write-Host "❌ Erro ao criar backup!" -ForegroundColor Red
    exit 1
}

# Listar backups existentes
Write-Host ""
Write-Host "📋 Backups disponíveis:" -ForegroundColor Cyan
Get-ChildItem -Path $BackupDir -Filter "*.sql" | 
    Sort-Object LastWriteTime -Descending | 
    Select-Object -First 5 | 
    ForEach-Object {
        $size = [math]::Round($_.Length / 1MB, 2)
        Write-Host "   $($_.Name) - $size MB - $($_.LastWriteTime)" -ForegroundColor White
    }

Write-Host ""
Write-Host "✅ Backup completo!" -ForegroundColor Green
