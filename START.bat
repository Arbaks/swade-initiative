@echo off
cd /d "%~dp0"
where node >nul 2>&1
if errorlevel 1 (
  echo Node.js was not found. Install Node.js LTS first, then run START.bat again.
  pause
  exit /b 1
)

if not exist node_modules (
  echo First launch: installing dependencies...
  call npm install
  if errorlevel 1 (
    echo npm install failed.
    pause
    exit /b 1
  )
)

start "" cmd /c "timeout /t 2 /nobreak >nul & start http://127.0.0.1:5173"
call npm run dev -- --host 127.0.0.1
