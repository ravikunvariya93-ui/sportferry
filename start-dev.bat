@echo off
REM Double-click to run the Sportferry dev server on http://localhost:3000
REM Keep this window open while you use the site. Close it to stop the server.
cd /d "%~dp0"
title Sportferry dev server (http://localhost:3000)
echo Starting Sportferry dev server on http://localhost:3000 ...
echo (Keep this window open. Press Ctrl+C to stop.)
npx next dev -p 3000
pause
