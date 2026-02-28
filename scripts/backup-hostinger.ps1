# Hostinger MySQL Backup Script (PowerShell)
# Usage: .\backup-hostinger.ps1

param(
    [string]$DbHost = "93.127.192.117",
    [string]$DbPort = "3306",
    [string]$DbUser = "habimark_RCMADMIN",
    [string]$DbName = "habimark_RCM",
    [string]$DbPassword = ""
)

# Colors
$Yellow = "Yellow"
$Green = "Green"
$Red = "Red"

Write-Host "🗄️  RCM Database Backup Script" -ForegroundColor $Yellow
Write-Host "==================================" -ForegroundColor $Yellow
Write-Host ""

# Check if mysqldump is available
$mysqldump = Get-Command mysqldump -ErrorAction SilentlyContinue
if (-not $mysqldump) {
    Write-Host "❌ mysqldump not found!" -ForegroundColor $Red
    Write-Host "Please install MySQL client tools or Git Bash" -ForegroundColor $Yellow
    Write-Host ""
    Write-Host "Options:" -ForegroundColor $Yellow
    Write-Host "1. Use Git Bash: ./backup-hostinger.sh"
    Write-Host "2. Install MySQL: https://dev.mysql.com/downloads/mysql/"
    Write-Host "3. Use Hostinger phpMyAdmin for manual backup"
    exit 1
}

# Prompt for password if not provided
if ([string]::IsNullOrEmpty($DbPassword)) {
    $SecurePassword = Read-Host "Enter MySQL password for ${DbUser}" -AsSecureString
    $BSTR = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($SecurePassword)
    $DbPassword = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($BSTR)
}

# Create backup directory
$BackupDir = ".\backups"
if (-not (Test-Path $BackupDir)) {
    Write-Host "📁 Creating backup directory..." -ForegroundColor $Yellow
    New-Item -ItemType Directory -Path $BackupDir | Out-Null
}

# Generate backup filename
$Timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$BackupFile = Join-Path $BackupDir "rcm_backup_${Timestamp}.sql"

# Test connection
Write-Host "🔌 Testing database connection..." -ForegroundColor $Yellow
$TestQuery = "USE $DbName;"
$TestCmd = "mysql -h $DbHost -P $DbPort -u $DbUser -p`"$DbPassword`" -e `"$TestQuery`" 2>&1"

try {
    $result = Invoke-Expression $TestCmd
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Connection successful!" -ForegroundColor $Green
    } else {
        throw "Connection failed"
    }
} catch {
    Write-Host "❌ Failed to connect to database" -ForegroundColor $Red
    Write-Host "Please check your credentials and try again." -ForegroundColor $Yellow
    exit 1
}

# Perform backup
Write-Host "💾 Creating backup..." -ForegroundColor $Yellow
Write-Host "Database: $DbName"
Write-Host "Host: ${DbHost}:${DbPort}"
Write-Host "Output: $BackupFile"
Write-Host ""

$DumpCmd = "mysqldump -h $DbHost -P $DbPort -u $DbUser -p`"$DbPassword`" --single-transaction --routines --triggers --events --add-drop-table $DbName > `"$BackupFile`""

try {
    Invoke-Expression $DumpCmd
    
    if (Test-Path $BackupFile) {
        $FileSize = (Get-Item $BackupFile).Length
        $FileSizeMB = [math]::Round($FileSize / 1MB, 2)
        
        Write-Host ""
        Write-Host "✅ Backup completed successfully!" -ForegroundColor $Green
        Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor $Green
        Write-Host "📄 File: $(Split-Path $BackupFile -Leaf)"
        Write-Host "📦 Size: ${FileSizeMB} MB"
        Write-Host "📍 Location: $BackupFile"
        Write-Host ""
        
        # List recent backups
        Write-Host "📚 Recent backups:" -ForegroundColor $Yellow
        Get-ChildItem $BackupDir -Filter "*.sql" | 
            Sort-Object LastWriteTime -Descending | 
            Select-Object -First 5 | 
            ForEach-Object {
                $size = [math]::Round($_.Length / 1MB, 2)
                Write-Host "  $($_.Name) (${size} MB)"
            }
        
        # Cleanup old backups (keep last 10)
        Write-Host ""
        Write-Host "🧹 Cleaning up old backups (keeping last 10)..." -ForegroundColor $Yellow
        Get-ChildItem $BackupDir -Filter "*.sql" | 
            Sort-Object LastWriteTime -Descending | 
            Select-Object -Skip 10 | 
            Remove-Item -Force
        
        Write-Host ""
        Write-Host "🎉 Backup process complete!" -ForegroundColor $Green
        Write-Host ""
        Write-Host "Next steps:"
        Write-Host "1. Verify backup: Get-Content $BackupFile | Select-Object -First 20"
        Write-Host "2. Upload to cloud storage (recommended)"
        Write-Host "3. Proceed with deployment"
        
    } else {
        throw "Backup file not created"
    }
} catch {
    Write-Host "❌ Backup failed!" -ForegroundColor $Red
    Write-Host $_.Exception.Message -ForegroundColor $Red
    exit 1
}
