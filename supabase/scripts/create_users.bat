@echo off
REM create_users.bat
REM Doble clic aqui para correr create_users.sh con Git Bash, sin tener que
REM abrir una terminal manualmente. Esta ventana se queda abierta hasta que
REM presiones una tecla, incluso si el script termina con errores.

where bash >nul 2>nul
if errorlevel 1 (
  echo No encontre "bash" en este equipo. Instala Git para Windows
  echo ^(https://git-scm.com/download/win^) e intenta de nuevo.
  echo.
  pause
  exit /b 1
)

if exist "%~dp0create_users_real.sh" (
  bash "%~dp0create_users_real.sh"
) else (
  bash "%~dp0create_users.sh"
)

echo.
pause
