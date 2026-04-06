@echo off
title Sistema EPimentel - Iniciando...
color 1F

echo.
echo  ============================================
echo   EPimentel Auditoria ^& Contabilidade Ltda
echo   Iniciando o Sistema...
echo  ============================================
echo.

:: Matar processos anteriores se existirem
taskkill /f /im python.exe >nul 2>&1
taskkill /f /im node.exe >nul 2>&1
timeout /t 2 >nul

:: Iniciar Backend em janela separada
echo  [1/2] Iniciando Backend (API)...
start "EPimentel - Backend" cmd /k "cd /d C:\sistema_obrigacoes\backend && venv\Scripts\activate && python main.py"

:: Aguardar backend iniciar
echo  Aguardando backend iniciar...
timeout /t 5 >nul

:: Iniciar Frontend em janela separada
echo  [2/2] Iniciando Frontend (Interface)...
start "EPimentel - Frontend" cmd /k "cd /d C:\sistema_obrigacoes\frontend && npm run dev -- --host"

:: Aguardar frontend iniciar
echo  Aguardando interface iniciar...
timeout /t 8 >nul

:: Abrir no navegador automaticamente
echo  Abrindo no navegador...
start "" "http://epimentel:5173"

echo.
echo  ============================================
echo   Sistema iniciado com sucesso!
echo   Acesse: http://epimentel:5173
echo  ============================================
echo.
echo  Nao feche as janelas pretas do Backend e Frontend!
echo  Para encerrar o sistema, feche todas as janelas pretas.
echo.
pause
