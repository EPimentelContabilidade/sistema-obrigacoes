@echo off
title EPimentel - Sistema

echo Iniciando Backend...
start "Backend - EPimentel" cmd /k "cd /d C:\sistema_obrigacoes\backend && venv\Scripts\activate && python main.py"

echo Aguardando backend iniciar...
timeout /t 5 /nobreak > nul

echo Iniciando Frontend...
start "Frontend - EPimentel" cmd /k "cd /d C:\sistema_obrigacoes\frontend && npm run dev"

timeout /t 4 /nobreak > nul
start http://localhost:5173

echo.
echo Sistema iniciado! Nao feche as janelas pretas.
pause
