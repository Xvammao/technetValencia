@echo off

REM Arrancar backend Django
echo Iniciando backend...
start "Backend" cmd /k "cd /d Backend && python manage.py runserver"

REM Arrancar frontend Vite
echo Iniciando frontend...
start "Frontend" cmd /k "cd /d frontend && npm run dev"

echo Servidores iniciados. Puedes cerrar esta ventana.
