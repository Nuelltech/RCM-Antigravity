$ErrorActionPreference = "Stop"

# Configuration
$DB_HOST = "93.127.192.117"
$DB_USER = "habimark_RCMADMIN"
$DB_PASS = "Pgrquhh81"
$DB_NAME = "habimark_RCM"
$DATE = Get-Date -Format "yyyy-MM-dd_HH-mm"
$BACKUP_FILE = "..\backups\${DATE}_PRE-MIGRATE.sql"

# Check for mysqldump
if (-not (Get-Command "mysqldump" -ErrorAction SilentlyContinue)) {
    Write-Error "CRITICAL: 'mysqldump' command not found. Please install MySQL Server or MySQL Shell and add it to your PATH."
    exit 1
}

Write-Host "Starting backup of Production Database ($DB_HOST)..."
Write-Host "Target file: $BACKUP_FILE"

# Execute Backup
# Note: Using --column-statistics=0 is often needed for compatibility with some remote servers
$dumpCommand = "mysqldump -h $DB_HOST -u $DB_USER -p$DB_PASS --column-statistics=0 --single-transaction --quick --lock-tables=false $DB_NAME > $BACKUP_FILE"

# Use cmd /c to handle redirection properly in PowerShell
cmd /c $dumpCommand

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Backup completed successfully!"
    
    # Compress if possible (optional)
    if (Get-Command "gzip" -ErrorAction SilentlyContinue) {
        Write-Host "Compressing..."
        cmd /c "gzip $BACKUP_FILE"
        Write-Host "Created: ${BACKUP_FILE}.gz"
    } else {
        Write-Host "Created: $BACKUP_FILE"
    }
} else {
    Write-Error "❌ Backup failed with exit code $LASTEXITCODE"
    exit 1
}
