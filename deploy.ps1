# Deploy Script for RCM Application (PowerShell)
# This script helps deploy the application to production

Write-Host "🚀 RCM Deployment Script" -ForegroundColor Cyan
Write-Host "========================" -ForegroundColor Cyan
Write-Host ""

# Check if we're in the right directory
if (-not (Test-Path "package.json")) {
    Write-Host "❌ Error: This script must be run from the project root directory" -ForegroundColor Red
    exit 1
}

Write-Host "📋 Pre-deployment Checklist:" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. ✅ Database Migration (Hostinger)"
Write-Host "   - Update DATABASE_URL in backend/.env.production"
Write-Host "   - Run: cd backend && npx prisma db push"
Write-Host ""
Write-Host "2. ✅ Git Commit & Push"
Write-Host "   - Run: git add ."
Write-Host "   - Run: git commit -m 'feat: add templates and persistent alerts'"
Write-Host "   - Run: git push origin main"
Write-Host ""
Write-Host "3. ✅ Backend (Render)"
Write-Host "   - Verify environment variables in Render dashboard"
Write-Host "   - Wait for automatic deployment"
Write-Host ""
Write-Host "4. ✅ Frontend (Vercel)"
Write-Host "   - Verify NEXT_PUBLIC_API_URL in Vercel dashboard"
Write-Host "   - Wait for automatic deployment"
Write-Host ""

$dbMigration = Read-Host "Do you want to proceed with database migration? (y/n)"
if ($dbMigration -eq "y" -or $dbMigration -eq "Y") {
    Write-Host "📊 Running database migration..." -ForegroundColor Green
    Push-Location backend
    npx prisma db push
    npx prisma generate
    Pop-Location
    Write-Host "✅ Database migration complete!" -ForegroundColor Green
} else {
    Write-Host "⏭️  Skipping database migration" -ForegroundColor Yellow
}

Write-Host ""
$gitPush = Read-Host "Do you want to commit and push changes? (y/n)"
if ($gitPush -eq "y" -or $gitPush -eq "Y") {
    Write-Host "📦 Committing changes..." -ForegroundColor Green
    git add .
    git status
    Write-Host ""
    $commitMsg = Read-Host "Enter commit message"
    git commit -m "$commitMsg"
    git push origin main
    Write-Host "✅ Changes pushed to repository!" -ForegroundColor Green
} else {
    Write-Host "⏭️  Skipping git operations" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "✅ Deployment initiated!" -ForegroundColor Green
Write-Host ""
Write-Host "📝 Next steps:" -ForegroundColor Cyan
Write-Host "1. Monitor Render deployment: https://dashboard.render.com"
Write-Host "2. Monitor Vercel deployment: https://vercel.com/dashboard"
Write-Host "3. Test the application after deployment completes"
Write-Host ""
Write-Host "🔗 Useful links:" -ForegroundColor Cyan
Write-Host "   - Render Dashboard: https://dashboard.render.com"
Write-Host "   - Vercel Dashboard: https://vercel.com/dashboard"
Write-Host "   - Deployment Guide: See deployment_guide.md"
