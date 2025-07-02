# GORBAGANA BATTLESHIP - DEVELOPMENT SERVER STARTUP SCRIPT
# Solves Windows PowerShell syntax and port conflict issues

Write-Host "GORBAGANA BATTLESHIP - STARTING DEVELOPMENT SERVERS" -ForegroundColor Green
Write-Host "Welcome to the Landfill - Managing Garbage Fleet Operations" -ForegroundColor Yellow

# Clean up any existing Node.js processes to prevent port conflicts
Write-Host "Cleaning up existing Node.js processes..." -ForegroundColor Yellow
try {
    taskkill /f /im node.exe 2>$null
    Start-Sleep -Seconds 2
    Write-Host "Process cleanup completed" -ForegroundColor Green
}
catch {
    Write-Host "No existing Node.js processes to clean up" -ForegroundColor Gray
}

# Check port availability
$backendPort = 3002
$frontendPort = 3000

Write-Host "Checking port availability..." -ForegroundColor Cyan

# Kill any processes using our ports
Write-Host "Freeing up ports..." -ForegroundColor Yellow
netstat -ano | findstr ":$backendPort" | ForEach-Object {
    $pid = ($_ -split '\s+')[-1]
    if ($pid -and $pid -ne "0") {
        try {
            taskkill /f /pid $pid 2>$null
        }
        catch {
            # Ignore errors
        }
    }
}

Start-Sleep -Seconds 2

# Start Backend Server in new PowerShell window
Write-Host "Starting Garbage Fleet Backend Server (Port $backendPort)..." -ForegroundColor Green
$backendCmd = "Write-Host 'LANDFILL OPERATIONS CENTER' -ForegroundColor Green; Write-Host 'Starting waste management backend...' -ForegroundColor Yellow; Set-Location '$PWD'; npm run dev"
Start-Process powershell -ArgumentList "-NoExit", "-Command", $backendCmd -WindowStyle Normal

# Wait a moment for backend to start
Write-Host "Waiting for landfill operations to initialize..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

# Start Frontend Server in new PowerShell window  
Write-Host "Starting Garbage Fleet Command Center (Port $frontendPort+)..." -ForegroundColor Green
$frontendCmd = "Write-Host 'GARBAGE FLEET COMMAND CENTER' -ForegroundColor Green; Write-Host 'Starting trash collection interface...' -ForegroundColor Yellow; Set-Location '$PWD/frontend'; npm run dev"
Start-Process powershell -ArgumentList "-NoExit", "-Command", $frontendCmd -WindowStyle Normal

Write-Host ""
Write-Host "GORBAGANA BATTLESHIP SERVERS STARTING..." -ForegroundColor Green
Write-Host "Backend (Landfill): http://localhost:$backendPort" -ForegroundColor Cyan
Write-Host "Frontend (Fleet Command): http://localhost:$frontendPort (or next available)" -ForegroundColor Cyan
Write-Host ""
Write-Host "Garbage Fleet is deploying..." -ForegroundColor Yellow
Write-Host "Check the new PowerShell windows for server status" -ForegroundColor Gray
Write-Host "If ports are still in use, manually kill Node.js processes and try again" -ForegroundColor Red
Write-Host ""
Write-Host "TIP: Use Ctrl+C in each server window to stop servers cleanly" -ForegroundColor Yellow
Write-Host "Welcome to the Landfill - Happy Waste Collection!" -ForegroundColor Green 