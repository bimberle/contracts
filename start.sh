#!/bin/bash
# Start-Skript für Contract Management System

set -e

echo "🚀 Contract Management System - Start"
echo "========================================"
echo ""

# Check if .env exists
if [ ! -f ".env" ]; then
    echo "📝 Erstelle .env Datei..."
    cp .env.example .env
    echo "✓ .env erstellt (bitte Werte anpassen falls nötig)"
    echo ""
fi

# Check if Docker is running
echo "🐳 Überprüfe Docker..."
if ! docker ps > /dev/null 2>&1; then
    echo "❌ Docker läuft nicht! Bitte starten Sie Docker."
    exit 1
fi
echo "✓ Docker läuft"
echo ""

# Stop old containers
echo "🛑 Stoppe alte Container..."
docker-compose down 2>/dev/null || true
echo "✓ Alt-Container gestoppt"
echo ""

# Build and start
echo "🔨 Baue und starte Container..."
docker-compose up -d
echo "✓ Container gestartet"
echo ""

# Wait for services
echo "⏳ Warte auf Services... (20 Sekunden)"
sleep 20
echo "✓ Services sollten bereit sein"
echo ""

# Check status
echo "📊 Container-Status:"
docker-compose ps
echo ""

# Test backend
echo "🔍 Teste Backend-Verbindung..."
if curl -s http://localhost:8000/health > /dev/null; then
    echo "✓ Backend läuft"
else
    echo "⚠️ Backend antwortet nicht - bitte warten oder logs prüfen"
fi
echo ""

# Print URLs
echo "🎉 Anwendung startet!"
echo ""
echo "📱 Frontend:     http://localhost:3000"
echo "📚 API Docs:     http://localhost:8000/docs"
echo "❤️  Health Check: http://localhost:8000/health"
echo ""
echo "💡 Tipps:"
echo "   - Logs ansehen: docker-compose logs -f"
echo "   - Backend Logs: docker-compose logs -f backend"
echo "   - Frontend Logs: docker-compose logs -f frontend"
echo "   - Zurücksetzen: docker-compose down -v && docker-compose up -d"
echo ""
