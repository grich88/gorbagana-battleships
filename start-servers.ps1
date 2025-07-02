#!/usr/bin/env pwsh

# Gorbagana Trash Collection - Server Startup Script
# This script starts both backend (port 3002) and frontend (port 3000) servers

Write-Host "🗑️ Starting Gorbagana Trash Collection Servers..." -ForegroundColor Green
Write-Host "=============================================" -ForegroundColor Green

# Clean up any existing node processes that might be using our ports
Write-Host "🧹 Cleaning up existing Node.js processes..." -ForegroundColor Yellow
try {
    # Kill all node processes (careful - this kills ALL node processes)
    taskkill /f /im node.exe 2>$null
    Write-Host "✅ Existing processes cleaned up" -ForegroundColor Green
}
catch {
    Write-Host "ℹ️ No existing Node.js processes found" -ForegroundColor Cyan
}

# Wait a moment for ports to be released
Start-Sleep -Seconds 2

# Start Backend Server (Port 3002)
Write-Host ""
Write-Host "🚀 Starting Backend Server on port 3002..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD'; npm run dev" -WindowStyle Normal

# Wait a moment for backend to start
Start-Sleep -Seconds 3

# Start Frontend Server (Port 3000)  
Write-Host "🌐 Starting Frontend Server on port 3000..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD/frontend'; npm run dev" -WindowStyle Normal

# Wait a moment for frontend to start
Start-Sleep -Seconds 3

Write-Host ""
Write-Host "🎉 Servers Starting!" -ForegroundColor Green
Write-Host "================================" -ForegroundColor Green
Write-Host "🗑️ Backend:  http://localhost:3002" -ForegroundColor Yellow
Write-Host "🌐 Frontend: http://localhost:3000" -ForegroundColor Yellow
Write-Host ""
Write-Host "📝 Both servers are opening in separate PowerShell windows" -ForegroundColor Cyan
Write-Host "⚠️ Keep those windows open while playing" -ForegroundColor Red
Write-Host ""
Write-Host "🎮 Ready to play Gorbagana Trash Collection!" -ForegroundColor Green
Write-Host "💰 Don't forget to get GOR tokens from the faucet!" -ForegroundColor Magenta

# Wait for user input before closing
Write-Host ""
Write-Host "Press any key to exit this script (servers will keep running)..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown") 