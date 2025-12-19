# Backup Database Script (PowerShell - No Unicode)
# Usage: .\backup-simple.ps1

param(
    [string]$Container = "rcm-mysql",
    [string]$Database = "rcm_db",
    [string]$User = "root",
    [string]$Pass = "root"
)

$ErrorActionPreference = "Stop"

$Timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$BackupParent = ".\backups"
$BackupFile = "$BackupParent\backup_$Timestamp.sql"

Write-Host "[INFO] Starting database backup..." -ForegroundColor Cyan

# Create backup directory
if (!(Test-Path $BackupParent)) {
    New-Item -ItemType Directory -Path $BackupParent > $null
    Write-Host "[OK] Created backup directory" -ForegroundColor Green
}

# Check if Docker container is running
Write-Host "[INFO] Checking Docker container..." -ForegroundColor Yellow
$running = docker ps --format "{{.Names}}" | Select-String $Container

if (!$running) {
    Write-Host "[ERROR] Container not running: $Container" -ForegroundColor Red
    Write-Host "        Start with: docker-compose up -d" -ForegroundColor Yellow
    exit 1
}
Write-Host "[OK] Container is running" -ForegroundColor Green

# Create backup
Write-Host "[INFO] Creating backup... This may take a moment" -ForegroundColor Yellow
$cmd = "mysqldump -u $User -p$Pass --single-transaction --routines --triggers --events --set-gtid-purged=OFF $Database"

docker exec $Container sh -c $cmd | Out-File -FilePath $BackupFile -Encoding utf8

# Verify backup was created
if (Test-Path $BackupFile) {
    $SizeMB = [math]::Round((Get-Item $BackupFile).Length / 1MB, 2)
    Write-Host "[OK] Backup created successfully!" -ForegroundColor Green
    Write-Host "     File: backup_$Timestamp.sql" -ForegroundColor White
    Write-Host "     Size: $SizeMB MB" -ForegroundColor White
    Write-Host "     Location: $BackupParent\" -ForegroundColor White
    
    # Save reference to last backup
    "backup_$Timestamp.sql" | Out-File "$BackupParent\last_backup.txt" -Encoding utf8
} else {
    Write-Host "[ERROR] Failed to create backup!" -ForegroundColor Red
    exit 1
}

# List available backups
Write-Host ""
Write-Host "[INFO] Available backups:" -ForegroundColor Cyan
Get-ChildItem $BackupParent -Filter "*.sql" | 
    Sort-Object LastWriteTime -Descending | 
    Select-Object -First 5 | 
    ForEach-Object {
        $mb = [math]::Round($_.Length / 1MB, 2)
        Write-Host "  $($_.Name) - $mb MB" -ForegroundColor White
    }

Write-Host ""
Write-Host "[SUCCESS] Backup complete!" -ForegroundColor Green
Write-Host "To restore, use: .\rollback.ps1 -BackupFile $BackupFile" -ForegroundColor Cyan
