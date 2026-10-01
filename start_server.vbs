Set WshShell = CreateObject("WScript.Shell")
WshShell.CurrentDirectory = "e:\9. Projects\0. GitHub\Desktop_Background"
WshShell.Run """C:\Program Files\nodejs\node.exe"" server.js", 0, False
