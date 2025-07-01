#!/usr/bin/env pwsh

Write-Host "🚀 Starting Gorbagana Battleship Servers..." -ForegroundColor Green

# Kill any existing Node processes to avoid port conflicts
Write-Host "🔧 Cleaning up existing processes..." -ForegroundColor Yellow
try {
    taskkill /f /im node.exe 2>$null
    Write-Host "✅ Cleaned up existing Node.js processes" -ForegroundColor Green
} catch {
    Write-Host "ℹ️ No existing Node.js processes found" -ForegroundColor Cyan
}

# Start backend server
Write-Host "🛡️ Starting backend server (port 3002)..." -ForegroundColor Yellow
Start-Job -ScriptBlock { 
    Set-Location 'C:\Users\jgran\gorbagana-battleship'
    node server.js 
} -Name "BackendServer" | Out-Null

# Wait a moment for backend to start
Start-Sleep -Seconds 3

# Start frontend server
Write-Host "🎮 Starting frontend server (port 3000)..." -ForegroundColor Yellow
Start-Job -ScriptBlock { 
    Set-Location 'C:\Users\jgran\gorbagana-battleship\frontend'
    npm run dev 
} -Name "FrontendServer" | Out-Null

# Wait for servers to initialize
Write-Host "⏳ Waiting for servers to initialize..." -ForegroundColor Yellow
Start-Sleep -Seconds 10

# Check if servers are running
Write-Host "🔍 Checking server status..." -ForegroundColor Yellow

try {
    $backendResponse = Invoke-RestMethod -Uri "http://localhost:3002/health" -TimeoutSec 5
    Write-Host "✅ Backend server is running on http://localhost:3002" -ForegroundColor Green
} catch {
    Write-Host "❌ Backend server failed to start" -ForegroundColor Red
}

try {
    $frontendResponse = Invoke-WebRequest -Uri "http://localhost:3000" -TimeoutSec 5
    if ($frontendResponse.StatusCode -eq 200) {
        Write-Host "✅ Frontend server is running on http://localhost:3000" -ForegroundColor Green
    }
} catch {
    Write-Host "❌ Frontend server failed to start" -ForegroundColor Red
}

Write-Host "`n🎯 Gorbagana Battleship is ready!" -ForegroundColor Green
Write-Host "🌐 Open your browser to: http://localhost:3000" -ForegroundColor Cyan
Write-Host "💰 Connect your wallet using the button in the top-right corner!" -ForegroundColor Magenta
Write-Host "`n📝 To stop servers, run: Get-Job | Stop-Job" -ForegroundColor Yellow 