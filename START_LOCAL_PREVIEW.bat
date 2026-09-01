@echo off
setlocal EnableExtensions
cd /d "%~dp0"

set "PORT=8782"
set "URL=http://127.0.0.1:%PORT%/"

where py >nul 2>nul
if not errorlevel 1 (
  start "" "%URL%"
  echo Local preview: %URL%
  echo Close this window to stop the server.
  py -m http.server %PORT% --bind 127.0.0.1
  exit /b
)

where python >nul 2>nul
if not errorlevel 1 (
  start "" "%URL%"
  echo Local preview: %URL%
  echo Close this window to stop the server.
  python -m http.server %PORT% --bind 127.0.0.1
  exit /b
)

where node >nul 2>nul
if not errorlevel 1 (
  start "" "%URL%"
  echo Local preview: %URL%
  echo Close this window to stop the server.
  node tools\local-server.mjs %PORT%
  exit /b
)

echo Python 3 and Node.js were not found.
echo Install either runtime, or serve this folder with any static HTTP server.
pause
