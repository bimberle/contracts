#!/bin/bash
# Einfacher Git Commit - Copy & Paste in Terminal

cd /workspaces/contracts

# Alle Dateien zum Index hinzufügen
git add -A

# Status anzeigen
git status

# Commit erstellen
git commit -m "feat: Contract Management System - Vollständige Implementierung

- Backend: FastAPI mit SQLAlchemy ORM
- Frontend: React 18 mit TypeScript und Zustand
- Provisionsberechnung: Automatisch mit Preiserhöhungen
- Existenzgründer-Rabatt Support
- 12-Monats Forecast
- Docker Compose Multi-Container Setup
- PostgreSQL Datenbank mit automatischer Erstellung
- 5 API Router (Customers, Contracts, Settings, PriceIncreases, Analytics)
- 4 Frontend Pages (Dashboard, CustomerDetail, Settings, Forecast)
- 3 Zustand Stores für State Management
- Tailwind CSS Styling
- Vollständige Fehlerbehandlung
- 8 Dokumentationsdateien (README, QUICKSTART, TROUBLESHOOTING, etc.)
- Shell-Skripte für einfaches Starten (start.sh, restart.sh, diagnose.sh)"

# Optional: Zu GitHub pushen
# git push origin main
