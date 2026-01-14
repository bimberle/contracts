# Contract Management System

Eine moderne Webapp zur Verwaltung von Softwareverkaufs- und Mietverträgen mit automatischer Provisionsberechnung.

## 🎯 Features

- **Kundenverwaltung**: Vollständige CRUD-Operationen für Kunden
- **Vertragsverwaltung**: Verwaltung von Miete- und Software-Pflege-Verträgen
- **Provisionsberechnung**: Automatische monatliche Provisionsberechnungen
- **Preiserhöhungen**: Verwaltung von Preiserhöhungen mit Bestandsschutz
- **Forecast**: 12-Monats Provisions-Forecast mit Visualisierung
- **Existenzgründer-Rabatt**: Automatische Berücksichtigung von Gründer-Verzögerungen
- **Exit-Auszahlung**: Berechnung von Auszahlungen bei Vertragskündigung

## 🚀 Quick Start

### Voraussetzungen

- Docker und Docker Compose
- Node.js 18+ (für lokale Frontend-Entwicklung)
- Python 3.11+ (für lokale Backend-Entwicklung)

### Installation mit Docker

#### macOS / Linux

1. **Repository clonen**
```bash
git clone https://github.com/bimberle/contracts.git
cd contracts
```

2. **.env Datei erstellen**
```bash
cp .env.example .env
```

3. **Docker-Compose starten**
```bash
docker-compose up -d
```

4. **Anwendung öffnen**
- Frontend: http://localhost
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/docs

#### Windows

**Automatische Installation mit Batch-Skript:**

1. **Laden Sie das Repository herunter:**
```bash
git clone https://github.com/bimberle/contracts.git
cd contracts
```

2. **Führen Sie das Setup-Skript aus:**
```bash
setup-windows.bat
```

Das Skript kümmert sich automatisch um:
- ✅ Prüfung von Docker und Docker Compose Installation
- ✅ Download von `docker-compose.yml` und `.env` (falls nicht vorhanden)
- ✅ Erstellen der `.env` Datei mit Standard-Werten
- ✅ Pullen der neuesten Docker Images
- ✅ Starten aller Container
- ✅ Prüfung ob alle Services erreichbar sind

3. **Anwendung öffnen:**
- Frontend: http://localhost
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/docs

**Manuelle Installation (falls Skript nicht funktioniert):**

1. Repository klonen
2. `.env` aus `.env.example` erstellen
3. `docker-compose up -d` ausführen

**Updates durchführen:**

Einfach das Skript erneut ausführen:
```bash
setup-windows.bat
```

Es erkennt automatisch, ob es eine Neupinstallation oder ein Update ist.

## 🔑 Environment Variablen

Die `.env` Datei wird automatisch erstellt. Folgende Variablen können konfiguriert werden:

```bash
# Database Configuration
POSTGRES_DB=contracts
POSTGRES_USER=contracts_user
POSTGRES_PASSWORD=contracts_password

# Backend Configuration
DATABASE_URL=postgresql://contracts_user:contracts_password@database:5432/contracts
SECRET_KEY=your-secret-key-change-in-production
DEBUG=True
CORS_ORIGINS_STR=http://localhost:3000,http://localhost,http://localhost:80
AUTH_PASSWORD=  # Optional: Authentifizierung (später)

# Frontend Configuration
VITE_API_URL=/api
```

**Wichtig für Production:**
- `SECRET_KEY` mit sicherer Zeichenkette ersetzen
- `DEBUG` auf `False` setzen
- `CORS_ORIGINS_STR` auf echte Domains anpassen

### Lokale Entwicklung

#### Backend Setup

```bash
# Requirements installieren
cd backend
pip install -r requirements.txt

# Datenbank-Migrations ausführen
alembic upgrade head

# Server starten
uvicorn app.main:app --reload
```

#### Frontend Setup

```bash
# Dependencies installieren
cd frontend
npm install

# Development Server starten
npm run dev
```

## 📁 Projektstruktur

```
contracts/
├── docker-compose.yml          # Multi-Container Setup
├── .env.example               # Environment Template
├── README.md                  # Diese Datei
│
├── frontend/                  # React SPA
│   ├── src/
│   │   ├── components/        # React Komponenten
│   │   ├── pages/            # Seiten (Dashboard, Settings, etc.)
│   │   ├── stores/           # Zustand State Management
│   │   ├── services/         # API Client
│   │   ├── types/            # TypeScript Typen
│   │   ├── utils/            # Hilfsfunktionen
│   │   ├── App.tsx           # Hauptkomponente
│   │   └── main.tsx          # Entry Point
│   ├── package.json
│   ├── vite.config.ts
│   └── Dockerfile
│
└── backend/                   # FastAPI Server
    ├── app/
    │   ├── main.py           # FastAPI App
    │   ├── config.py         # Konfiguration
    │   ├── database.py       # DB Connection
    │   ├── models/           # SQLAlchemy Models
    │   ├── schemas/          # Pydantic Schemas
    │   ├── routers/          # API Endpoints
    │   ├── services/         # Business Logic
    │   └── utils/            # Hilfsfunktionen
    ├── requirements.txt
    ├── alembic.ini
    └── Dockerfile
```

## 🔧 API Endpoints

### Customers
- `GET /api/customers` - Alle Kunden
- `POST /api/customers` - Neuen Kunden erstellen
- `GET /api/customers/{id}` - Einzelnen Kunden abrufen
- `PUT /api/customers/{id}` - Kunden aktualisieren
- `DELETE /api/customers/{id}` - Kunden löschen
- `GET /api/customers/{id}/metrics` - Metriken für Kunden

### Contracts
- `GET /api/contracts` - Alle Verträge
- `POST /api/contracts` - Neuen Vertrag erstellen
- `GET /api/contracts/{id}` - Einzelnen Vertrag abrufen
- `PUT /api/contracts/{id}` - Vertrag aktualisieren
- `DELETE /api/contracts/{id}` - Vertrag löschen
- `GET /api/contracts/customer/{customer_id}` - Verträge eines Kunden

### Settings
- `GET /api/settings` - Aktuelle Einstellungen
- `PUT /api/settings` - Einstellungen aktualisieren

### Price Increases
- `GET /api/price-increases` - Alle Preiserhöhungen
- `POST /api/price-increases` - Neue Preiserhöhung erstellen
- `GET /api/price-increases/{id}` - Einzelne Preiserhöhung
- `PUT /api/price-increases/{id}` - Preiserhöhung aktualisieren
- `DELETE /api/price-increases/{id}` - Preiserhöhung löschen

### Analytics
- `GET /api/analytics/dashboard` - Dashboard-Übersicht
- `GET /api/analytics/forecast` - 12-Monats Forecast
- `GET /api/analytics/customer/{customer_id}` - Kundenanalysen

## 📊 Provisionsberechnung

Die Provisionen werden monatlich basierend auf folgenden Faktoren berechnet:

1. **Vertragspreis**: Basiscosts pro Monat
2. **Preiserhöhungen**: Mit konfigurierbarem Bestandsschutz
3. **Vertragsstatus**: Nur aktive Verträge generieren Provisionen
4. **Existenzgründer**: Optionale Verzögerung des Mietbeginns
5. **Post-Contract Monate**: Provisionen auch nach Vertragsende

### Berechnung

```
currentMonthlyPrice = basePrice × (1 + Σ anwendbare Preiserhöhungen)
commission = currentMonthlyPrice × (commissionRate / 100)
```

## ⚙️ Konfiguration

Alle Einstellungen können über das Settings-Interface konfiguriert werden:

- **Existenzgründer-Verzögerung**: Standard 12 Monate
- **Provisionssätze**: Separat für Miete und Software-Pflege
- **Post-Contract Monate**: Provisionen nach Vertragsende
- **Minimale Vertragslaufzeit**: Für vollständige Auszahlung

## 🛠️ Entwicklung

### Neue Features hinzufügen

1. **Backend**:
   - Neue Endpoints in `routers/`
   - Business Logic in `services/`
   - Modelle in `models/`

2. **Frontend**:
   - Neue Komponenten in `components/`
   - Neue Pages in `pages/`
   - API Integration via `api.ts`

### Testing

```bash
# Backend Tests
cd backend
pytest

# Frontend Tests
cd frontend
npm run test
```

## 📝 Migrations

```bash
# Neue Migration erstellen
alembic revision --autogenerate -m "description"

# Migrations ausführen
alembic upgrade head

# Letzter Stand zurückrollen
alembic downgrade -1
```

## � Production Deployment

### Mit Docker Hub

1. **Images zu Docker Hub pushen**
```bash
./push-to-dockerhub.sh 1.0.0 your-username
```

2. **Production starten**
```bash
export DOCKERHUB_USERNAME=your-username
export VERSION=1.0.0
export SECRET_KEY=your-secret-key
docker-compose -f docker-compose.prod.yml up -d
```

Für detaillierte Anleitung siehe [DOCKER_HUB_GUIDE.md](DOCKER_HUB_GUIDE.md)

### Database Migrations

Die Datenbank wird automatisch initialisiert beim Startup. Weitere Details unter [MIGRATIONS.md](MIGRATIONS.md)

## �🐛 Troubleshooting

### Container starten nicht
```bash
# Logs anschauen
docker-compose logs -f

# Container neustarten
docker-compose restart
```

### Port bereits in Verwendung
```bash
# Port 3000 freigeben (Frontend)
lsof -i :3000
kill -9 <PID>

# Port 8000 freigeben (Backend)
lsof -i :8000
kill -9 <PID>
```

### Datenbank-Fehler
```bash
# Datenbank neu initialisieren
docker-compose down -v
docker-compose up -d
```

## 📚 Weitere Ressourcen

- [FastAPI Dokumentation](https://fastapi.tiangolo.com/)
- [React Dokumentation](https://react.dev/)
- [Zustand](https://github.com/pmndrs/zustand)
- [Tailwind CSS](https://tailwindcss.com/)

## 📄 Lizenz

Proprietary - Alle Rechte vorbehalten

## 👥 Support

Für Fragen oder Probleme kontaktieren Sie bitte das Entwicklungsteam.