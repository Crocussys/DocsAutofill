@echo off
setlocal

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0build.ps1" %*
if errorlevel 1 (
    echo Failed to build Tampermonkey scripts.
    exit /b 1
)

echo Done.
endlocal
