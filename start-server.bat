@echo off
REM Скрипт запуска HTTP сервера для Windows
REM Просто дважды кликните на этот файл

echo ====================================================================
echo Starting Stage 8/9 Demo Server...
echo ====================================================================
echo.

REM Проверка наличия Python
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Python не найден!
    echo.
    echo Пожалуйста, установите Python с https://www.python.org/downloads/
    echo Убедитесь, что выбрали "Add Python to PATH" при установке.
    echo.
    pause
    exit /b 1
)

REM Запуск сервера
python start-server.py

pause
