# SKILL: Popular Windows PowerShell Commands

This skill provides examples and explanations for common Windows PowerShell commands. You can use this as a reference or as a prompt for LLM-based agents.

## Examples

### List files in a directory
```powershell
Get-ChildItem
```

### Change directory
```powershell
Set-Location C:\Users
```

### Display the contents of a file
```powershell
Get-Content .\example.txt
```

### Copy a file
```powershell
Copy-Item .\source.txt .\destination.txt
```

### Move a file
```powershell
Move-Item .\source.txt .\destination.txt
```

### Remove a file
```powershell
Remove-Item .\file.txt
```

### Find text in files (like grep)
```powershell
Select-String -Path *.txt -Pattern "search text"
```

### Show running processes
```powershell
Get-Process
```

### Kill a process by name
```powershell
Stop-Process -Name notepad
```

---

You can add more PowerShell command examples to this SKILL.md as needed.
