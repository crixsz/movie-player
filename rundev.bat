@echo off
REM Start frontend dev server
start cmd /k "pnpm run dev"

REM Start backend with nodemon
cd /d C:\Users\pikai\Projects\link-grabber-111movie
start cmd /k "npx nodemon server.js"
