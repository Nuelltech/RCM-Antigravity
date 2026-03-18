#!/bin/bash

# Deploy Script for RCM Application
# This script helps deploy the application to production

echo "🚀 RCM Deployment Script"
echo "========================"
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: This script must be run from the project root directory"
    exit 1
fi

echo "📋 Pre-deployment Checklist:"
echo ""
echo "1. ✅ Database Migration (Hostinger)"
echo "   - Update DATABASE_URL in backend/.env.production"
echo "   - Run: cd backend && npx prisma db push"
echo ""
echo "2. ✅ Git Commit & Push"
echo "   - Run: git add ."
echo "   - Run: git commit -m 'feat: add templates and persistent alerts'"
echo "   - Run: git push origin main"
echo ""
echo "3. ✅ Backend (Render)"
echo "   - Verify environment variables in Render dashboard"
echo "   - Wait for automatic deployment"
echo ""
echo "4. ✅ Frontend (Vercel)"
echo "   - Verify NEXT_PUBLIC_API_URL in Vercel dashboard"
echo "   - Wait for automatic deployment"
echo ""

read -p "Do you want to proceed with database migration? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]
then
    echo "📊 Running database migration..."
    cd backend
    npx prisma db push
    npx prisma generate
    cd ..
    echo "✅ Database migration complete!"
else
    echo "⏭️  Skipping database migration"
fi

echo ""
read -p "Do you want to commit and push changes? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]
then
    echo "📦 Committing changes..."
    git add .
    git status
    echo ""
    read -p "Enter commit message: " commit_msg
    git commit -m "$commit_msg"
    git push origin main
    echo "✅ Changes pushed to repository!"
else
    echo "⏭️  Skipping git operations"
fi

echo ""
echo "✅ Deployment initiated!"
echo ""
echo "📝 Next steps:"
echo "1. Monitor Render deployment: https://dashboard.render.com"
echo "2. Monitor Vercel deployment: https://vercel.com/dashboard"
echo "3. Test the application after deployment completes"
echo ""
echo "🔗 Useful links:"
echo "   - Render Dashboard: https://dashboard.render.com"
echo "   - Vercel Dashboard: https://vercel.com/dashboard"
echo "   - Deployment Guide: See deployment_guide.md"
