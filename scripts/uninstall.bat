@echo off
setlocal

set TARGET_DIR=%LOCALAPPDATA%\DocsAutofill

if exist "%TARGET_DIR%" (
    rmdir /s /q "%TARGET_DIR%"
)

echo Cleaned.
pause
endlocal
