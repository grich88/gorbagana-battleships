# 🚀 Gorbagana Battleship - Production Test Script
# This script tests the production build locally before deploying to Render

Write-Host "🎯 GORBAGANA BATTLESHIP - PRODUCTION TEST" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan

# Function to check if a command exists
function Test-Command {
    param([string]$Command)
    try {
        Get-Command $Command -ErrorAction Stop
        return $true
    } catch {
        return $false
    }
}

# Function to test URL endpoint
function Test-Endpoint {
    param([string]$Url, [string]$Name)
    Write-Host "🔍 Testing $Name..." -ForegroundColor Yellow
    try {
        $response = Invoke-RestMethod -Uri $Url -TimeoutSec 10
        Write-Host "✅ $Name: OK" -ForegroundColor Green
        return $true
    } catch {
        Write-Host "❌ $Name: Failed - $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

# 1. Check Prerequisites
Write-Host "`n1️⃣ Checking Prerequisites..." -ForegroundColor Cyan

if (-not (Test-Command "node")) {
    Write-Host "❌ Node.js not found. Please install Node.js 18+ first." -ForegroundColor Red
    exit 1
}

if (-not (Test-Command "npm")) {
    Write-Host "❌ npm not found. Please install npm first." -ForegroundColor Red
    exit 1
}

$nodeVersion = node --version
Write-Host "✅ Node.js version: $nodeVersion" -ForegroundColor Green

# 2. Check MongoDB Connection
Write-Host "`n2️⃣ Testing MongoDB Connection..." -ForegroundColor Cyan
Push-Location backend
try {
    $mongoTest = node setup-database.js 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ MongoDB Atlas connection: OK" -ForegroundColor Green
    } else {
        Write-Host "❌ MongoDB connection failed:" -ForegroundColor Red
        Write-Host $mongoTest -ForegroundColor Red
    }
} catch {
    Write-Host "❌ MongoDB test error: $($_.Exception.Message)" -ForegroundColor Red
}
Pop-Location

# 3. Test Production Build - Backend
Write-Host "`n3️⃣ Testing Backend Production Build..." -ForegroundColor Cyan
Push-Location backend
try {
    Write-Host "📦 Installing backend dependencies..." -ForegroundColor Yellow
    npm install --silent
    
    Write-Host "🔨 Running backend build..." -ForegroundColor Yellow
    npm run build
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Backend build: SUCCESS" -ForegroundColor Green
    } else {
        Write-Host "❌ Backend build: FAILED" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ Backend build error: $($_.Exception.Message)" -ForegroundColor Red
}
Pop-Location

# 4. Test Production Build - Frontend
Write-Host "`n4️⃣ Testing Frontend Production Build..." -ForegroundColor Cyan
Push-Location frontend
try {
    Write-Host "📦 Installing frontend dependencies..." -ForegroundColor Yellow
    npm install --silent
    
    Write-Host "🔨 Running frontend build..." -ForegroundColor Yellow
    $env:NODE_ENV = "production"
    $env:NEXT_PUBLIC_API_URL = "http://localhost:3002"
    npm run build
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Frontend build: SUCCESS" -ForegroundColor Green
    } else {
        Write-Host "❌ Frontend build: FAILED" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ Frontend build error: $($_.Exception.Message)" -ForegroundColor Red
}
Pop-Location

# 5. Test Gorbagana RPC Endpoints
Write-Host "`n5️⃣ Testing Gorbagana RPC Endpoints..." -ForegroundColor Cyan

$endpoints = @(
    @{ Url = "https://rpc.gorbagana.wtf/"; Name = "Gorbagana Primary RPC" },
    @{ Url = "https://gorchain.wstf.io"; Name = "Gorchain Secondary RPC" },
    @{ Url = "https://api.devnet.solana.com"; Name = "Solana Devnet Fallback" }
)

foreach ($endpoint in $endpoints) {
    try {
        $headers = @{ "Content-Type" = "application/json" }
        $body = @{
            jsonrpc = "2.0"
            id = 1
            method = "getHealth"
            params = @()
        } | ConvertTo-Json
        
        $response = Invoke-RestMethod -Uri $endpoint.Url -Method POST -Headers $headers -Body $body -TimeoutSec 5
        Write-Host "✅ $($endpoint.Name): OK" -ForegroundColor Green
    } catch {
        Write-Host "⚠️ $($endpoint.Name): $($_.Exception.Message)" -ForegroundColor Yellow
    }
}

# 6. Start Production Test Servers
Write-Host "`n6️⃣ Starting Production Test Servers..." -ForegroundColor Cyan

# Start backend in production mode
Write-Host "🚀 Starting backend server..." -ForegroundColor Yellow
Push-Location backend
$backendJob = Start-Job -ScriptBlock {
    Set-Location $using:PWD
    $env:NODE_ENV = "production"
    npm start
}
Pop-Location

Start-Sleep 3

# Test backend health
if (Test-Endpoint "http://localhost:3002/health" "Backend Health") {
    Write-Host "✅ Backend server: RUNNING" -ForegroundColor Green
} else {
    Write-Host "❌ Backend server: FAILED TO START" -ForegroundColor Red
}

# Start frontend in production mode
Write-Host "🚀 Starting frontend server..." -ForegroundColor Yellow
Push-Location frontend
$frontendJob = Start-Job -ScriptBlock {
    Set-Location $using:PWD
    $env:NODE_ENV = "production"
    $env:NEXT_PUBLIC_API_URL = "http://localhost:3002"
    npm start
}
Pop-Location

Start-Sleep 5

# Test frontend
if (Test-Endpoint "http://localhost:3000" "Frontend Server") {
    Write-Host "✅ Frontend server: RUNNING" -ForegroundColor Green
} else {
    Write-Host "❌ Frontend server: FAILED TO START" -ForegroundColor Red
}

# 7. Production Test Summary
Write-Host "`n7️⃣ Production Test Summary" -ForegroundColor Cyan
Write-Host "=========================" -ForegroundColor Cyan

Write-Host "🌐 Frontend: http://localhost:3000" -ForegroundColor Blue
Write-Host "📊 Backend:  http://localhost:3002" -ForegroundColor Blue
Write-Host "💚 Health:   http://localhost:3002/health" -ForegroundColor Blue

Write-Host "`n🎮 Test the following features:" -ForegroundColor Yellow
Write-Host "  - Wallet connection (Backpack recommended)" -ForegroundColor White
Write-Host "  - Game mode selection" -ForegroundColor White
Write-Host "  - Ship placement" -ForegroundColor White
Write-Host "  - Game creation" -ForegroundColor White
Write-Host "  - Cross-device sharing" -ForegroundColor White
Write-Host "  - Public lobby" -ForegroundColor White

Write-Host "`n📋 Ready for Production Deployment!" -ForegroundColor Green
Write-Host "  1. Commit and push to GitHub" -ForegroundColor White
Write-Host "  2. Follow DEPLOYMENT.md guide" -ForegroundColor White
Write-Host "  3. Deploy to Render.com" -ForegroundColor White

Write-Host "`n⏹️ Press any key to stop test servers..." -ForegroundColor Yellow
$null = $Host.UI.RawUI.ReadKey('NoEcho,IncludeKeyDown')

# Cleanup
Write-Host "`n🧹 Stopping test servers..." -ForegroundColor Yellow
Stop-Job $backendJob -ErrorAction SilentlyContinue
Stop-Job $frontendJob -ErrorAction SilentlyContinue
Remove-Job $backendJob -ErrorAction SilentlyContinue
Remove-Job $frontendJob -ErrorAction SilentlyContinue

Write-Host "✅ Production test complete!" -ForegroundColor Green 