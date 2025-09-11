@echo off
REM Starts the frontend and backend servers in two separate tabs within the same Windows Terminal window.
wt new-tab --title "Frontend" pnpm run dev ; new-tab --title "Backend" cmd /k "cd /d %~dp0src\backend && npx nodemon server.js"