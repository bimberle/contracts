# Database Setup Guide

## Überblick

Das Projekt nutzt **SQLAlchemy** für die automatische Datenbankinitialisierung. Alle Tabellen werden automatisch beim Startup erstellt, falls sie nicht existieren.

**Alembic-Migrations** sind optional für komplexere Schema-Änderungen in der Zukunft vorbereitet, werden aber derzeit nicht aktiv verwendet.

## Automatische Datenbank-Initialisierung beim Deployment

Beim Hochfahren der Docker-Container wird die Datenbank automatisch initialisiert:

```bash
docker-compose up -d
```

### Was passiert beim Startup:

1. **PostgreSQL startet** (healthcheck wartet bis ready)
2. **Backend-Container startet**
3. **main.py lädt und erstellt Datenbank-Tabellen** automatisch via `Base.metadata.create_all()`
4. **FastAPI-Server startet** auf Port 8000

**Ergebnis**: Vollständig initialisierte PostgreSQL-Datenbank mit allen Tabellen!

## Struktur

```
backend/
├── migrations/          # Alembic-Struktur (optional, für zukünftige Nutzung)
│   ├── env.py
│   ├── script.py.mako
│   └── versions/
│       └── 001_split_contract_price.py
├── app/
│   ├── models/         # SQLAlchemy ORM-Modelle (primäre Quelle für Schema)
│   │   ├── contract.py
│   │   ├── customer.py
│   │   └── ...
│   └── main.py         # Startet create_all() beim Startup
└── requirements.txt    # alembic nur als optionale Dependency
```

## Auf neuem Docker-Host installieren

Die Installation ist **automatic** und braucht KEINE manuellen Migrations-Befehle:

### 1. Clone Repo:
```bash
git clone https://github.com/bimberle/contracts.git
cd contracts
```

### 2. Starte Docker-Compose:
```bash
docker-compose up -d
```

### 3. Das ist es! ✅
- PostgreSQL startet
- Backend wartet auf Datenbank (healthcheck)
- main.py erstellt alle Tabellen automatisch  
- Server startet auf Port 8000

Keine separate Migration-Befehle nötig!

## Zukünftige Migrations (falls nötig)

Falls später komplexe Schema-Migrationen nötig sind (z.B. Daten-Migration, Indexieren, etc.), können Alembic-Migrations verwendet werden:

```bash
# Im Docker-Container:
docker-compose exec backend alembic revision --autogenerate -m "Beschreibung"
docker-compose exec backend alembic upgrade head
```

Aber für normale Entwicklung und Deploys wird `create_all()` ausreichend sein.

## Troubleshooting

### Problem: "ERROR: Database unavailable"

**Ursache**: PostgreSQL war nicht bereit, als Backend startete
**Lösung**:
```bash
# Container neustarten
docker-compose restart backend
```

### Problem: Tables existieren nicht

**Ursache**: create_all() wurde nicht ausgeführt
**Lösung**: Backend-Logs prüfen
```bash
docker-compose logs backend | grep -i "initializing"
```

Falls nicht sichtbar:
```bash
docker-compose restart backend
```

### Problem: "FATAL: Ident authentication failed"

**Ursache**: PostgreSQL-Credentials im DATABASE_URL sind falsch
**Lösung**: docker-compose.yml prüfen und anpassen:
```yaml
environment:
  POSTGRES_USER: contracts_user
  POSTGRES_PASSWORD: contracts_password
  DATABASE_URL: postgresql://contracts_user:contracts_password@database:5432/contracts
```

## Best Practices

1. **Immer mit neuem Host testen**:
   ```bash
   docker-compose down -v  # Auch volumes löschen
   docker-compose up -d --build
   ```

2. **Schema-Änderungen**: Nur in `backend/app/models/*.py` ändern
   - SQLAlchemy erstellt die Tabellen automatisch
   - Alte Spalten können manuell gelöscht werden (backward compatibility!)

3. **Keine direkten SQL-Änderungen**: Alles über ORM-Models!

4. **Vor Production-Deploy**: Test auf freshly provisioned DB!

## Datenbank-Struktur

| Tabelle | Zweck |
|---------|-------|
| `customers` | Kunden mit Adressen und Kontakt |
| `contracts` | Miet- und Software-Care-Verträge |
| `price_increases` | Preiserhöhungen pro Vertrag |
| `settings` | Globale Einstellungen |

Alle Tabellen werden von SQLAlchemy ORM aus `backend/app/models/*.py` definiert.



