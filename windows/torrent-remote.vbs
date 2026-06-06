' Lanza el servidor de Torrent Remote SIN ventana de consola (en segundo plano).
' Lo usa el autoarranque. El directorio del proyecto es la carpeta padre de este script.
Set fso = CreateObject("Scripting.FileSystemObject")
Set sh = CreateObject("WScript.Shell")

scriptDir = fso.GetParentFolderName(WScript.ScriptFullName)
projectDir = fso.GetParentFolderName(scriptDir)

sh.CurrentDirectory = projectDir
' 0 = ventana oculta ; False = no esperar a que termine
sh.Run "node server\index.js", 0, False
