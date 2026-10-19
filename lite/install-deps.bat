@echo off
rem LabsCode Lite: one-time setup of dev tools (Chocolatey, Node.js, Python, Rust, Git).
rem Must run as Administrator. Skips anything already installed.
net session >nul 2>&1
if errorlevel 1 (
	echo Requesting administrator rights...
	powershell -NoProfile -Command "Start-Process -FilePath '%~f0' -Verb RunAs"
	exit /b
)

where choco >nul 2>&1
if errorlevel 1 (
	echo Installing Chocolatey...
	powershell -NoProfile -ExecutionPolicy Bypass -Command "[Net.ServicePointManager]::SecurityProtocol = 3072; iex ((New-Object Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))"
	set "PATH=%PATH%;%ALLUSERSPROFILE%\chocolatey\bin"
)

for %%P in (nodejs-lts python git rustup.install) do (
	echo Installing %%P...
	choco install %%P -y --no-progress
)

call "%ALLUSERSPROFILE%\chocolatey\bin\RefreshEnv.cmd"
echo Installing Claude Code CLI...
call npm install -g @anthropic-ai/claude-code

echo.
echo Done. Restart LabsCode so it sees the new tools.
pause
