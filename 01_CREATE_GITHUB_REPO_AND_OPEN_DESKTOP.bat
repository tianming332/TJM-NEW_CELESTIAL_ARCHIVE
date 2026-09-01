@echo off
setlocal EnableExtensions EnableDelayedExpansion
cd /d "%~dp0"

set "REPO_NAME=TJM-NEW_CELESTIAL_ARCHIVE"
set "REPO_DESCRIPTION=Interactive meteorite archive across cosmic, Earth and material scales; WebGPU crystal optics powered by vgpu."
set "DESKTOP_EXE=%LOCALAPPDATA%\GitHubDesktop\GitHubDesktop.exe"

title Create %REPO_NAME% and open GitHub Desktop
echo ============================================================
echo  %REPO_NAME%
echo  Git initialization, private GitHub repository and Desktop
echo ============================================================
echo.

where git >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Git for Windows was not found.
  echo Install Git, then run this file again.
  goto :OPEN_DESKTOP
)

if not exist ".git" (
  echo [1/5] Initializing local Git repository...
  git init -b main >nul 2>nul
  if errorlevel 1 (
    git init
    git branch -M main
  )
) else (
  echo [1/5] Existing local Git repository detected.
  git branch -M main >nul 2>nul
)

echo [2/5] Staging the cleaned upload package...
git add -A

git diff --cached --quiet
if errorlevel 1 (
  git config user.name >nul 2>nul
  if errorlevel 1 goto :NO_IDENTITY
  git config user.email >nul 2>nul
  if errorlevel 1 goto :NO_IDENTITY
  echo [3/5] Creating the initial commit...
  git commit -m "Initial GitHub release" || goto :DESKTOP_PUBLISH
) else (
  echo [3/5] No new files need committing.
)

git rev-parse --verify HEAD >nul 2>nul
if errorlevel 1 goto :DESKTOP_PUBLISH

where gh >nul 2>nul
if errorlevel 1 goto :DESKTOP_PUBLISH

gh auth status -h github.com >nul 2>nul
if errorlevel 1 (
  echo GitHub CLI is installed but is not signed in.
  choice /C YN /N /M "Sign in through the official GitHub browser flow now? [Y/N]: "
  if errorlevel 2 goto :DESKTOP_PUBLISH
  gh auth login -h github.com -w
  if errorlevel 1 goto :DESKTOP_PUBLISH
)

git remote get-url origin >nul 2>nul
if not errorlevel 1 (
  echo [4/5] An origin remote already exists. Pushing main...
  git push -u origin main
  goto :OPEN_DESKTOP
)

echo [4/5] Creating a PRIVATE GitHub repository and pushing main...
echo The repository can be made public later in GitHub settings.
gh repo create "%REPO_NAME%" --description "%REPO_DESCRIPTION%" --private --source=. --remote=origin --push
if errorlevel 1 goto :DESKTOP_PUBLISH
echo GitHub repository created and uploaded successfully.
goto :OPEN_DESKTOP

:NO_IDENTITY
echo [NOTICE] Git user.name or user.email is not configured.
echo GitHub Desktop will set the author identity and create the first commit.
goto :DESKTOP_PUBLISH

:DESKTOP_PUBLISH
echo [4/5] Automatic upload is unavailable because GitHub CLI is not signed in,
echo       or the initial commit still needs GitHub Desktop.
echo.
echo In GitHub Desktop:
echo   1. Sign in to GitHub if requested.
echo   2. File ^> Add Local Repository, then choose this folder.
echo   3. Create the first commit if one is still pending.
echo   4. Click Publish repository.
echo   5. Keep the repository PRIVATE unless you intend to publish the work.
echo.

:OPEN_DESKTOP
echo [5/5] Opening GitHub Desktop...
where github >nul 2>nul
if not errorlevel 1 (
  github .
  goto :DONE
)

if exist "%DESKTOP_EXE%" (
  start "" "%DESKTOP_EXE%"
  start "" explorer.exe "%CD%"
  echo GitHub Desktop and the repository folder were opened.
  echo If the repository is not selected automatically, drag this folder into Desktop.
  goto :DONE
)

echo [ERROR] GitHub Desktop was not found at:
echo %DESKTOP_EXE%
echo The local Git repository is ready. Install GitHub Desktop and add this folder.

:DONE
echo.
echo Repository folder: %CD%
pause
