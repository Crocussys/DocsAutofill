@echo off
setlocal

set TARGET_DIR=%LOCALAPPDATA%\DocsAutofill
set SRC_DIR=%~dp0..\src
set TM_BUILD=%~dp0tampermonkey\build.ps1
set TAMPERS_DIR=%TARGET_DIR%\tampers

if exist "%TARGET_DIR%" (
    rmdir /s /q "%TARGET_DIR%"
)

mkdir "%TARGET_DIR%"

xcopy "%SRC_DIR%\*" "%TARGET_DIR%\" /E /I /H /Y
if errorlevel 1 (
    echo Failed to copy source files.
    exit /b 1
)

mkdir "%TAMPERS_DIR%"

powershell -NoProfile -ExecutionPolicy Bypass -File "%TM_BUILD%" -SourceDir "%TARGET_DIR%" -OutputDir "%TAMPERS_DIR%"
if errorlevel 1 (
    echo Failed to build Tampermonkey user scripts.
    exit /b 1
)

echo Installed to: %TARGET_DIR%
echo Tampermonkey scripts: %TAMPERS_DIR%
echo Done.
pause
endlocal
