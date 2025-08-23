# Restore Development Configuration Script
# Restores flexible version ranges for development

Write-Host "🔧 Restoring Development Configuration" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan

# Check if we're in the right directory
if (-not (Test-Path "package.json")) {
    Write-Error "❌ Please run this script from the clutch-hub-demo-app directory"
    exit 1
}

# Check if dev backup exists
if (-not (Test-Path "package.dev.json")) {
    Write-Error "❌ No development backup found (package.dev.json)"
    Write-Host "💡 You may need to manually restore your development configuration" -ForegroundColor Yellow
    exit 1
}

# Restore development package.json
Write-Host "📦 Restoring development configuration..." -ForegroundColor Yellow
Copy-Item "package.dev.json" "package.json" -Force

# Clean and reinstall with flexible versions
Write-Host "🧹 Cleaning for fresh development install..." -ForegroundColor Yellow
if (Test-Path "node_modules") {
    Remove-Item "node_modules" -Recurse -Force
}
Remove-Item "package-lock.json" -ErrorAction SilentlyContinue

# Install development dependencies
Write-Host "📥 Installing development dependencies..." -ForegroundColor Yellow
npm install

# Check for SDK updates
Write-Host "🔍 Checking for SDK updates..." -ForegroundColor Green
npm outdated clutch-hub-sdk-js

Write-Host ""
Write-Host "✅ Development configuration restored!" -ForegroundColor Green
Write-Host "📋 Available commands:" -ForegroundColor White
Write-Host "  npm run dev          - Start development server" -ForegroundColor Gray
Write-Host "  npm run update:sdk   - Update to latest SDK version" -ForegroundColor Gray
Write-Host "  npm run check:sdk    - Check current SDK version" -ForegroundColor Gray
