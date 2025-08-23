# Production Deployment Script for Clutch Hub Demo App
# This script ensures stable, pinned versions for production deployment

Write-Host "🏭 Production Deployment Script" -ForegroundColor Cyan
Write-Host "===============================" -ForegroundColor Cyan

# Check if we're in the right directory
if (-not (Test-Path "package.json")) {
    Write-Error "❌ Please run this script from the clutch-hub-demo-app directory"
    exit 1
}

# Backup current package.json
Write-Host "📦 Backing up current package.json..." -ForegroundColor Yellow
Copy-Item "package.json" "package.dev.json" -Force

# Use production package.json with pinned versions
Write-Host "🔧 Switching to production configuration..." -ForegroundColor Yellow
Copy-Item "package.prod.json" "package.json" -Force

# Clean install with exact versions
Write-Host "🧹 Cleaning node_modules..." -ForegroundColor Yellow
if (Test-Path "node_modules") {
    Remove-Item "node_modules" -Recurse -Force
}
Remove-Item "package-lock.json" -ErrorAction SilentlyContinue

# Install production dependencies
Write-Host "📥 Installing production dependencies..." -ForegroundColor Yellow
npm ci

# Build for production
Write-Host "🔨 Building for production..." -ForegroundColor Yellow
npm run build

# Verify SDK version
Write-Host "✅ Verifying SDK version..." -ForegroundColor Green
npm list clutch-hub-sdk-js

Write-Host ""
Write-Host "🎉 Production build complete!" -ForegroundColor Green
Write-Host "📁 Build output: ./dist/" -ForegroundColor Gray
Write-Host ""
Write-Host "📋 Next steps:" -ForegroundColor White
Write-Host "  1. Test the production build: npm run preview" -ForegroundColor Gray
Write-Host "  2. Deploy the ./dist/ folder to your hosting service" -ForegroundColor Gray
Write-Host "  3. To restore dev config: Copy-Item package.dev.json package.json" -ForegroundColor Gray
