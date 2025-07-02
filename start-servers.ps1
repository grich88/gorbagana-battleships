# Gorbagana Battleship - Start Development Servers
# Windows PowerShell compatible script

Write-Host "GORBAGANA TRASH COLLECTION - Starting Development Servers" -ForegroundColor Green
Write-Host ""

# Clean up any existing Node.js processes on our ports
Write-Host "Cleaning up existing processes..." -ForegroundColor Yellow
try {
    $processesKilled = 0
    Get-Process -Name "node" -ErrorAction SilentlyContinue | ForEach-Object {
        Stop-Process -Id $_.Id -Force -ErrorAction SilentlyContinue
        $processesKilled++
    }
    if ($processesKilled -gt 0) {
        Write-Host "Cleaned up $processesKilled Node.js processes" -ForegroundColor Green
    } else {
        Write-Host "No existing Node.js processes found" -ForegroundColor Green
    }
    Start-Sleep -Seconds 2
} catch {
    Write-Host "Process cleanup completed" -ForegroundColor Yellow
}

# Start backend server in a new window
Write-Host "Starting Gorbagana Battleship Backend..." -ForegroundColor Green
try {
    $backendArgs = "-NoExit", "-Command", "cd '$PWD'; Write-Host 'BACKEND: Gorbagana Battleship Waste Management Server' -ForegroundColor Green; npm run dev"
    Start-Process powershell -ArgumentList $backendArgs -WindowStyle Normal
    Write-Host "Backend server starting at http://localhost:3002" -ForegroundColor Green
} catch {
    Write-Host "Failed to start backend server" -ForegroundColor Red
    exit 1
}

# Wait for backend to initialize
Write-Host "Waiting for backend to initialize..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

# Test backend health
Write-Host "Testing backend connection..." -ForegroundColor Yellow
try {
    $backendTest = Invoke-RestMethod -Uri "http://localhost:3002/health" -Method Get -TimeoutSec 10
    Write-Host "Backend health check: $($backendTest.status)" -ForegroundColor Green
} catch {
    Write-Host "Backend health check failed, but proceeding..." -ForegroundColor Yellow
}

# Start frontend server in a new window
Write-Host "Starting Gorbagana Battleship Frontend..." -ForegroundColor Green
try {
    $frontendArgs = "-NoExit", "-Command", "cd '$PWD/frontend'; Write-Host 'FRONTEND: Gorbagana Trash Collection Game' -ForegroundColor Green; npm run dev"
    Start-Process powershell -ArgumentList $frontendArgs -WindowStyle Normal
    Write-Host "Frontend server starting at http://localhost:3000" -ForegroundColor Green
} catch {
    Write-Host "Failed to start frontend server" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Both servers are starting up!" -ForegroundColor Green
Write-Host "Backend:  http://localhost:3002/health" -ForegroundColor Cyan
Write-Host "Frontend: http://localhost:3000" -ForegroundColor Cyan
Write-Host "Balance:  http://localhost:3002/api/balance/[wallet-address]" -ForegroundColor Cyan
Write-Host ""
Write-Host "Ready to collect some trash on the blockchain!" -ForegroundColor Green
Write-Host "Press any key to exit..." -ForegroundColor Yellow
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown") 