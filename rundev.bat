@echo off
REM Starts the frontend and backend servers in two separate tabs within the same Windows Terminal window.
wt new-tab --title "Frontend" -d "%~dp0." cmd /k "pnpm run dev" ; new-tab --title "Backend" -d "%~dp0src\backend" cmd /k "npx nodemon server.js"