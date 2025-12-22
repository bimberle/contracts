#!/bin/bash
# Git Commit Script für Contract Management System

set -e

echo "📝 Contract Management System - Git Commit"
echo "=========================================="
echo ""

# Check git status
echo "1️⃣  Überprüfe geänderte Dateien..."
git status
echo ""

# Add all changes
echo "2️⃣  Füge alle Dateien hinzu..."
git add -A
echo "✓ Dateien hinzugefügt"
echo ""

# Show what will be committed
echo "3️⃣  Was wird committed:"
git status --short
echo ""

# Ask for confirmation
read -p "Fortfahren? (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Abgebrochen."
    exit 1
fi

# Commit
echo "4️⃣  Committe Änderungen..."
git commit -m "feat: Contract Management System - Vollständige Implementierung

- Backend: FastAPI mit PostgreSQL
- Frontend: React mit TypeScript und Tailwind CSS
- Provisionsberechnung: Komplexe Logik mit Preiserhöhungen
- Existenzgründer-Rabatt Support
- 12-Monats Forecast
- Docker Multi-Container Setup
- Umfassende Dokumentation und Troubleshooting-Guides"

echo "✓ Commit erstellt"
echo ""

# Push
echo "5️⃣  Pushe zu GitHub..."
git push origin main
echo "✓ Gepusht!"
echo ""

echo "🎉 Fertig! Änderungen sind online."
