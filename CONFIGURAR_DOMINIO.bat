@echo off
title EPimentel - Configurar Dominio Local

echo Configurando acesso pelo nome "epimentel"...
echo.

:: Verificar se ja existe no hosts
findstr /C:"epimentel" C:\Windows\System32\drivers\etc\hosts > nul 2>&1
if %errorlevel%==0 (
    echo [OK] "epimentel" ja esta configurado!
) else (
    echo 127.0.0.1    epimentel >> C:\Windows\System32\drivers\etc\hosts
    echo [OK] Configurado com sucesso!
)

echo.
echo Agora voce pode acessar o sistema pelo endereco:
echo   http://epimentel:5173
echo.
pause
