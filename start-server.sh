#!/bin/bash
# Скрипт запуска HTTP сервера для Linux/Mac
# Использование: ./start-server.sh

echo "===================================================================="
echo "🚀 Starting Stage 8/9 Demo Server..."
echo "===================================================================="
echo ""

# Проверка наличия Python
if ! command -v python3 &> /dev/null; then
    if ! command -v python &> /dev/null; then
        echo "❌ ERROR: Python не найден!"
        echo ""
        echo "Пожалуйста, установите Python 3:"
        echo "  • Ubuntu/Debian: sudo apt-get install python3"
        echo "  • macOS: brew install python3"
        echo "  • или скачайте с https://www.python.org/downloads/"
        echo ""
        exit 1
    else
        python start-server.py
    fi
else
    python3 start-server.py
fi
