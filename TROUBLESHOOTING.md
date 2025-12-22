# Troubleshooting Guide

Wenn die Anwendung nicht angezeigt wird, folgen Sie diesen Schritten:

## Schritt 1: Container neustarten

```bash
cd /workspaces/contracts

# Alle Container stoppen
docker-compose down

# Warten Sie 5 Sekunden
sleep 5

# Neu starten
docker-compose up -d

# Warten Sie 20 Sekunden für den vollständigen Start
sleep 20
```

## Schritt 2: Container-Status überprüfen

```bash
docker-compose ps
```

Alle vier Container sollten mit Status "Up" angezeigt werden:
- database
- backend
- frontend
- (optional nginx für production)

## Schritt 3: Logs prüfen

```bash
# Backend-Logs anschauen
docker-compose logs backend

# Frontend-Logs anschauen
docker-compose logs frontend

# Datenbank-Logs anschauen
docker-compose logs database
```

## Schritt 4: API testen

```bash
# Health-Check
curl http://localhost:8000/health

# Should return: {"status":"healthy"}
```

## Schritt 5: Browser-Zugriff testen

### Frontend
```
http://localhost:3000
```

### Backend API Dokumentation
```
http://localhost:8000/docs
```

## Häufige Fehler

### "Connection refused" auf port 3000
- Frontend wurde noch nicht vollständig gestartet
- Lösung: `docker-compose logs frontend` überprüfen und 30 Sekunden warten

### "Connection refused" auf port 8000
- Backend wurde noch nicht vollständig gestartet
- Lösung: `docker-compose logs backend` überprüfen

### Database-Fehler
```bash
# Datenbank zurücksetzen
docker-compose down -v
docker-compose up -d
```

### Port bereits in Verwendung
```bash
# Prozess auf Port 3000 beenden
lsof -i :3000 | grep -v PID | awk '{print $2}' | xargs kill -9

# Prozess auf Port 8000 beenden
lsof -i :8000 | grep -v PID | awk '{print $2}' | xargs kill -9

# Prozess auf Port 5432 beenden
lsof -i :5432 | grep -v PID | awk '{print $2}' | xargs kill -9
```

### npm install Fehler

```bash
# Volumes sauber machen
docker-compose down -v

# Node modules neu installieren
docker-compose build --no-cache frontend

# Neu starten
docker-compose up -d
```

## Debug-Infos sammeln

```bash
# Diagnostics-Script ausführen
bash diagnose.sh

# Oder manuell:
echo "=== Docker Compose Status ==="
docker-compose ps

echo "=== Backend Logs ==="
docker-compose logs --tail=50 backend

echo "=== Frontend Logs ==="
docker-compose logs --tail=50 frontend

echo "=== Database Status ==="
docker-compose logs --tail=20 database

echo "=== Network Testing ==="
curl http://localhost:8000/health
```

## Wenn alles weg ist - Kompletter Reset

```bash
# Alles herunterfahren
docker-compose down -v

# Images neu bauen
docker-compose build --no-cache

# Neu starten
docker-compose up -d

# Logs überprüfen
docker-compose logs -f
```

---

**Wenn Sie nach diesen Schritten immer noch ein Problem haben:**
1. Kopieren Sie die komplette Ausgabe von `docker-compose logs`
2. Überprüfen Sie, dass Port 3000, 8000, und 5432 nicht von anderen Prozessen verwendet werden
3. Überprüfen Sie, dass Docker Desktop läuft (falls macOS/Windows)
