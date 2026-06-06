@echo off
REM Arranca Torrent Remote mostrando una consola (util para ver errores la 1a vez).
REM Doble clic para correrlo manualmente.
cd /d "%~dp0.."
echo Iniciando Torrent Remote...
node server\index.js
echo.
echo (El servidor se detuvo.) Presiona una tecla para cerrar.
pause >nul
