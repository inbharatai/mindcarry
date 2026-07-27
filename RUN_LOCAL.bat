@echo off
cd /d "%~dp0"
powershell -ExecutionPolicy Bypass -File "%~dp0setup-windows.ps1"
pause
