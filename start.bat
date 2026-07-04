@echo off
title NewsBot Starter
cd /d "%~dp0"
echo ==========================================
echo               NewsBot Starter             
echo ==========================================
echo.

:: Verifica se Node.js e' installato
node -v >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERRORE] Node.js non e' installato o non e' nel PATH.
    echo Scarica e installa Node.js da: https://nodejs.org/
    echo.
    pause
    exit /b
)

:: Verifica se node_modules esiste, altrimenti esegue npm install
if not exist "node_modules\" (
    echo [INFO] La cartella node_modules non esiste. Installazione delle dipendenze in corso...
    call npm install
    if %errorlevel% neq 0 (
        echo [ERRORE] Impossibile installare le dipendenze.
        pause
        exit /b
    )
)

echo Avvio del bot in corso...
call npm start
echo.
echo Il bot si e' arrestato.
pause
