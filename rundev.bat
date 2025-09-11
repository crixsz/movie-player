@echo off
REM Start frontend dev server
start cmd /k "pnpm run dev"

REM Start backend with nodemon
cd ./src/backend
start cmd /k "npx nodemon server.js"
