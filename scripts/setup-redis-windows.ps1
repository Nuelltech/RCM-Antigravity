$ErrorActionPreference = "Stop"

function Check-Command {
    param($name)
    Get-Command $name -ErrorAction SilentlyContinue | Out-Null
    return $?
}

Write-Host "🚧 Verifying Redis Installation..."

if (Check-Command "redis-cli") {
    Write-Host "✅ Redis CLI found."
} else {
    Write-Host "⚠️ Redis CLI not found in PATH."
    Write-Host "Attempting to install Redis via Winget..."
    try {
        if (Check-Command "winget") {
            winget install --id Redis.Redis --silent --accept-source-agreements --accept-package-agreements
            Write-Host "✅ Redis installed via Winget."
            # Reload path - simplistic approach for current session
            $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
        } else {
             Write-Host "❌ Winget not found. Please enable Windows Package Manager or install Redis manually."
             exit 1
        }
    } catch {
        Write-Host "❌ Installation failed. Please install manually: https://github.com/microsoftarchive/redis/releases"
        exit 1
    }
}

Write-Host "🚀 Starting Redis Server..."
try {
    # Check if service exists
    if (Get-Service "redis" -ErrorAction SilentlyContinue) {
        $service = Get-Service "redis"
        if ($service.Status -ne 'Running') {
             Start-Service "redis"
             Write-Host "✅ Redis Service started."
        } else {
             Write-Host "✅ Redis Service is already running."
        }
    } else {
        # Try running as executable if service doesn't exist
        if (Check-Command "redis-server") {
             Start-Process "redis-server" -WindowStyle Hidden
             Write-Host "✅ Redis Server started (process)."
        } else {
             Write-Host "❌ Redis Server executable not found."
             Write-Host "Please ensure Redis is installed and 'redis-server' is in your PATH."
        }
    }
} catch {
    Write-Host "⚠️ Failed to manage Redis service: $_"
    Write-Host "Try running 'redis-server' manually in a new terminal."
}

Write-Host "✅ Setup Complete. Testing connection..."
if (Check-Command "redis-cli") {
    redis-cli ping
} else {
    Write-Host "Please restart your terminal to use redis-cli."
}
