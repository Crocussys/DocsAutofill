@echo off
setlocal

set TARGET_DIR=%LOCALAPPDATA%\DocsAutofill
set SRC_DIR=%~dp0..\src

if exist "%TARGET_DIR%" (
    rmdir /s /q "%TARGET_DIR%"
)

mkdir "%TARGET_DIR%"

xcopy "%SRC_DIR%\*" "%TARGET_DIR%\" /E /I /H /Y

echo Done.
pause
endlocal
