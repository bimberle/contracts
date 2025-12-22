# Erste Schritte - Contract Management System

## ✅ Schnelleinstieg (3 Minuten)

### Option A: Mit Shell-Skript (einfachste Variante)

```bash
cd /workspaces/contracts
bash start.sh
```

Das Skript wird:
- .env-Datei erstellen falls nicht vorhanden
- Docker-Container neu starten
- 20 Sekunden auf den Start warten
- URLs anzeigen

Dann öffnen Sie: **http://localhost:3000**

### Option B: Manuell (wenn Skript nicht funktioniert)

```bash
cd /workspaces/contracts

# Stop alte Container
docker-compose down

# 5 Sekunden warten
sleep 5

# Neu starten
docker-compose up -d

# 20 Sekunden für vollständigen Start warten
sleep 20

# Status prüfen
docker-compose ps
```

Dann öffnen Sie: **http://localhost:3000**

---

## 🔍 Wenn es nicht funktioniert

### Schritt 1: Status überprüfen

```bash
docker-compose ps
```

Alle Container sollten mit Status "Up" angezeigt werden:
```
NAME              STATUS
contracts_db      Up 20 seconds
contracts_api     Up 20 seconds
contracts_web     Up 20 seconds
```

### Schritt 2: Backend testen

```bash
# Test ob Backend läuft
curl http://localhost:8000/health

# Sollte zurückgeben: {"status":"healthy"}
```

Wenn nicht funktioniert → Siehe "Backend-Fehler" unten

### Schritt 3: Frontend testen

Öffnen Sie im Browser:
- **http://localhost:3000**

Falls weiße/leere Seite → Browser Cache leeren (Ctrl+Shift+Del oder Cmd+Shift+Del)

---

## ⚠️ Häufige Probleme

### Problem: "Cannot connect to localhost:3000"

**Ursache**: Frontend-Container läuft nicht
**Lösung**:
```bash
# Logs anschauen
docker-compose logs frontend

# Container neu starten
docker-compose restart frontend
```

### Problem: "Cannot connect to localhost:8000"

**Ursache**: Backend-Container läuft nicht
**Lösung**:
```bash
# Logs anschauen
docker-compose logs backend

# Container neu starten
docker-compose restart backend
```

### Problem: "Connection refused" auf Port 5432 (Datenbank)

**Ursache**: Datenbank-Container läuft nicht
**Lösung**:
```bash
# Kompletter Neustart
docker-compose down -v
docker-compose up -d
sleep 30
```

### Problem: Port bereits in Verwendung

```bash
# Prozess auf Port 3000 finden und beenden
lsof -i :3000
# Dann: kill -9 <PID>

# Oder Docker neustarten
docker restart contracts_web
```

### Problem: Frontend zeigt Fehler "API not available"

**Ursache**: Frontend kann Backend nicht erreichen
**Lösung**:
1. Prüfen ob Backend läuft: `curl http://localhost:8000/health`
2. Browser-Cache leeren (Ctrl+Shift+Del)
3. Seite neu laden (F5)

---

## 🛠️ Nützliche Befehle

### Docker Status

```bash
# Alle Container ansehen
docker-compose ps

# Logs in Echtzeit anschauen
docker-compose logs -f

# Nur Backend-Logs
docker-compose logs -f backend

# Nur Frontend-Logs
docker-compose logs -f frontend

# Nur die letzten 50 Zeilen
docker-compose logs --tail=50
```

### Neustart

```bash
# Sanfter Neustart (speichert Daten)
docker-compose restart

# Hardes Reset (löscht Datenbank!)
docker-compose down -v
docker-compose up -d
sleep 20
```

### Logs löschen

```bash
# Container löschen (mit Daten)
docker-compose down

# Container + Volumes löschen (ACHTUNG! Datenbank-Inhalt wird gelöscht)
docker-compose down -v
```

---

## 📱 Zugriff auf Anwendung

Nach erfolgreichem Start:

| Service | URL |
|---------|-----|
| Frontend (Webapp) | http://localhost:3000 |
| Backend API | http://localhost:8000 |
| API Dokumentation | http://localhost:8000/docs |
| Health Check | http://localhost:8000/health |

---

## 🎓 Was Sie mit der App machen können

1. **Kunden verwalten** (Dashboard)
   - Neue Kunden hinzufügen
   - Kundendetails ansehen
   - Provisionen berechnen

2. **Verträge verwalten** (Customer Detail)
   - Neue Verträge erstellen
   - Vertragsstatus ändern
   - Provisionen tracken

3. **Einstellungen** (Settings)
   - Provisionssätze anpassen
   - Preiserhöhungen erstellen
   - Existenzgründer-Parameter setzen

4. **Forecast anschauen** (Forecast)
   - 12-Monats Provisions-Prognose
   - KPIs und Trends
   - Monatliche Übersicht

---

## 📚 Weitere Ressourcen

- [Vollständige README](README.md)
- [Troubleshooting Guide](TROUBLESHOOTING.md)
- [API Dokumentation](http://localhost:8000/docs) (nach Start)

---

## 🆘 Wenn immer noch Probleme auftreten

```bash
# Komplett-Diagnostik
bash diagnose.sh

# Oder manuell Logs sammeln:
echo "=== STATUS ===" && docker-compose ps
echo "=== BACKEND LOGS ===" && docker-compose logs --tail=100 backend
echo "=== FRONTEND LOGS ===" && docker-compose logs --tail=100 frontend
echo "=== DATABASE LOGS ===" && docker-compose logs --tail=50 database
```

Bitte bei Problemen diese Logs mitteilen!
