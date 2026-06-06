@echo off
REM Quita el autoarranque de Torrent Remote (borra el acceso directo de Inicio).
set "LNK=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\TorrentRemote.lnk"

if exist "%LNK%" (
  del "%LNK%"
  echo  [OK] Autoarranque desactivado.
) else (
  echo  No habia autoarranque configurado.
)
echo.
echo  Nota: si el servidor esta corriendo ahora, segui activo hasta que reinicies
echo  o cierres el proceso "node" desde el Administrador de tareas.
pause
