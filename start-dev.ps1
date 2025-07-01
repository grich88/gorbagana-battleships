# Gorbagana Battleship - Development Startup Script
# Starts both frontend and backend servers for enhanced battleship game

Write-Host "🚀🚀🚀 STARTING GORBAGANA BATTLESHIP DEVELOPMENT ENVIRONMENT 🚀🚀🚀" -ForegroundColor Green
Write-Host ""

# Check if Node.js is installed
try {
    $nodeVersion = node --version
    Write-Host "✅ Node.js detected: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Node.js not found. Please install Node.js first." -ForegroundColor Red
    exit 1
}

# Function to start a process in a new terminal
function Start-InNewTerminal {
    param(
        [string]$Command,
        [string]$WorkingDirectory,
        [string]$Title
    )
    
    $fullCommand = "cd '$WorkingDirectory'; $Command"
    Start-Process powershell -ArgumentList "-NoExit", "-Command", $fullCommand -WindowStyle Normal
    Write-Host "✅ Started $Title in new terminal" -ForegroundColor Green
}

Write-Host "📦 Installing dependencies..." -ForegroundColor Yellow

# Install backend dependencies
Write-Host "Installing backend dependencies..." -ForegroundColor Cyan
Push-Location "backend"
npm install --silent
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Backend dependency installation failed" -ForegroundColor Red
    Pop-Location
    exit 1
}
Pop-Location

# Install frontend dependencies
Write-Host "Installing frontend dependencies..." -ForegroundColor Cyan
Push-Location "frontend"
npm install --silent
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Frontend dependency installation failed" -ForegroundColor Red
    Pop-Location
    exit 1
}
Pop-Location

Write-Host ""
Write-Host "🚀 Starting servers..." -ForegroundColor Yellow

# Start backend server
$backendPath = Join-Path $PWD "backend"
Start-InNewTerminal "npm run dev" $backendPath "Backend API Server (Port 3002)"

# Wait a moment for backend to start
Start-Sleep -Seconds 2

# Start frontend server
$frontendPath = Join-Path $PWD "frontend"
Start-InNewTerminal "npm run dev" $frontendPath "Frontend Game Interface (Port 3000)"

Write-Host ""
Write-Host "🎯 Servers starting up..." -ForegroundColor Green
Write-Host "⚓ Backend API:     http://localhost:3002" -ForegroundColor Cyan
Write-Host "🎮 Frontend Game:   http://localhost:3000" -ForegroundColor Cyan
Write-Host "📊 API Analytics:   http://localhost:3002/api/analytics" -ForegroundColor Cyan
Write-Host "🔗 Health Check:    http://localhost:3002/health" -ForegroundColor Cyan
Write-Host ""
Write-Host "📱 Enhanced Features Active:" -ForegroundColor Yellow
Write-Host "  ✅ Cross-device game sharing" -ForegroundColor White
Write-Host "  ✅ Public games lobby" -ForegroundColor White  
Write-Host "  ✅ Real-time synchronization" -ForegroundColor White
Write-Host "  ✅ Enhanced wallet integration" -ForegroundColor White
Write-Host "  ✅ Mock blockchain for development" -ForegroundColor White
Write-Host ""
Write-Host "🎮 Ready to play Enhanced Gorbagana Battleship!" -ForegroundColor Green
Write-Host "Press any key to exit this script (servers will continue running)..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown") 