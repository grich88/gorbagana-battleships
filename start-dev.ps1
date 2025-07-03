# Gorbagana Battleship Development Server v2.0
# Rebuilt using proven patterns from working Trash Tac Toe app

Write-Host "🚀 Starting Gorbagana Battleship v2.0 Development Servers" -ForegroundColor Green
Write-Host "✅ Using proven patterns from working Trash Tac Toe app" -ForegroundColor Cyan
Write-Host ""

# Check if Node.js is installed
try {
    $nodeVersion = node --version
    Write-Host "✅ Node.js version: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Node.js is not installed. Please install Node.js first." -ForegroundColor Red
    exit 1
}

# Install backend dependencies
Write-Host "📦 Installing backend dependencies..." -ForegroundColor Yellow
Set-Location backend
if (-not (Test-Path "node_modules")) {
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Backend dependency installation failed" -ForegroundColor Red
        exit 1
    }
}

# Install frontend dependencies
Write-Host "📦 Installing frontend dependencies..." -ForegroundColor Yellow
Set-Location ../frontend
if (-not (Test-Path "node_modules")) {
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Frontend dependency installation failed" -ForegroundColor Red
        exit 1
    }
}

# Return to root directory
Set-Location ..

Write-Host "🎯 Starting both servers..." -ForegroundColor Cyan
Write-Host ""
Write-Host "🔥 Backend: http://localhost:3002" -ForegroundColor Yellow
Write-Host "🔥 Frontend: http://localhost:3000" -ForegroundColor Yellow
Write-Host ""
Write-Host "🌐 Official Gorbagana RPC: https://rpc.gorbagana.wtf/" -ForegroundColor Magenta
Write-Host "💰 Ready for real $GOR token wagering!" -ForegroundColor Green
Write-Host ""
Write-Host "Press Ctrl+C to stop both servers" -ForegroundColor Gray
Write-Host ""

# Start both servers concurrently
Start-Process PowerShell -ArgumentList "-NoExit", "-Command", "cd backend; Write-Host '🔥 BACKEND SERVER STARTING' -ForegroundColor Red; npm run dev"
Start-Sleep -Seconds 2
Start-Process PowerShell -ArgumentList "-NoExit", "-Command", "cd frontend; Write-Host '🔥 FRONTEND SERVER STARTING' -ForegroundColor Blue; npm run dev"

Write-Host "✅ Both servers are starting..." -ForegroundColor Green
Write-Host "🎮 Ready to play Gorbagana Battleship!" -ForegroundColor Cyan 