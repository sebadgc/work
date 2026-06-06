@echo off
REM Crea un acceso directo en la carpeta de Inicio de Windows para que
REM Torrent Remote arranque solo (en segundo plano) al iniciar sesion.
setlocal

set "VBS=%~dp0torrent-remote.vbs"
set "STARTUP=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup"
set "LNK=%STARTUP%\TorrentRemote.lnk"

echo Creando autoarranque...
powershell -NoProfile -Command ^
  "$s=(New-Object -ComObject WScript.Shell).CreateShortcut('%LNK%');" ^
  "$s.TargetPath='wscript.exe';" ^
  "$s.Arguments='\"%VBS%\"';" ^
  "$s.WorkingDirectory='%~dp0..';" ^
  "$s.Description='Torrent Remote';" ^
  "$s.Save()"

if exist "%LNK%" (
  echo.
  echo  [OK] Listo. Torrent Remote arrancara solo al iniciar Windows.
  echo  Para que empiece YA sin reiniciar, hace doble clic en torrent-remote.vbs
  echo.
) else (
  echo.
  echo  [ERROR] No se pudo crear el acceso directo.
  echo.
)
pause
