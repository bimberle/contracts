# 🔧 Häufigste Fehler - LÖSUNGEN

## ❌ "Fehler: Application nicht erreichbar auf localhost:3000"

**Was bedeutet das?**
Frontend-Container läuft nicht.

**Lösung:**
```bash
# Logs anschauen
docker-compose logs frontend

# Container neu starten
docker-compose restart frontend

# Nach 10 Sekunden probieren:
# http://localhost:3000
```

**Wenn das nicht hilft:**
```bash
docker-compose down
docker-compose up -d frontend
sleep 20
```

---

## ❌ "API is not available" (weiße Seite mit Fehler)

**Was bedeutet das?**
Frontend lädt, aber kann Backend nicht erreichen.

**Lösung:**
1. Backend-Status prüfen:
```bash
curl http://localhost:8000/health
```

2. Sollte zurückgeben: `{"status":"healthy"}`

3. Wenn nicht, Backend neu starten:
```bash
docker-compose restart backend
sleep 10
```

4. Im Browser:
   - Browser-Tab schließen + neu öffnen
   - Oder Ctrl+Shift+Del (Cache leeren)
   - Dann http://localhost:3000 neu laden

---

## ❌ "Port 3000/8000 already in use"

**Was bedeutet das?**
Ein anderer Prozess nutzt den Port.

**Lösung (macOS/Linux):**
```bash
# Prozess finden
lsof -i :3000

# Prozess beenden
kill -9 <PID>

# Oder einfach Docker neustarten:
docker-compose down
docker-compose up -d
```

**Lösung (Windows - PowerShell Admin):**
```powershell
Get-Process -Id (Get-NetTCPConnection -LocalPort 3000).OwningProcess
Stop-Process -Id <PID> -Force
```

---

## ❌ "Database connection error"

**Was bedeutet das?**
PostgreSQL-Container startet nicht.

**Lösung:**
```bash
# Datenbank-Container Status
docker-compose logs database

# Kompletter Neustart
docker-compose down -v
docker-compose up -d
sleep 30
docker-compose ps
```

---

## ❌ "npm install / yarn install Fehler"

**Was bedeutet das?**
Frontend-Dependencies konnte nicht installieren.

**Lösung:**
```bash
# Frontend neu bauen
docker-compose build --no-cache frontend

# Neustarten
docker-compose up -d frontend
sleep 20
```

---

## ❌ "Weiße Seite / Nothing loads"

**Was bedeutet das?**
React App konnte nicht kompiliert werden.

**Lösung:**
```bash
# 1. Frontend-Logs ansehen
docker-compose logs frontend

# 2. Browser-Console überprüfen (F12)
# Dort sollte eine Error-Nachricht sein

# 3. TypeScript-Fehler prüfen
docker-compose logs frontend | grep -i error

# 4. Restart
docker-compose restart frontend
sleep 10
```

**Häufige Fehler in der Console:**
- `Cannot GET /` → Vite Server läuft nicht
- `Module not found` → npm install fehler
- `Cannot find module` → dependency problem

---

## ❌ "Docker-Compose command not found"

**Was bedeutet das?**
Docker Compose ist nicht installiert.

**Lösung:**

**macOS (mit Homebrew):**
```bash
brew install docker-compose
```

**Linux:**
```bash
sudo apt-get install docker-compose
```

**Windows:**
Docker Desktop installieren (enthält Compose)

---

## ❌ "Docker daemon not running"

**Was bedeutet das?**
Docker Service läuft nicht.

**Lösung:**

**macOS/Windows:**
- Docker Desktop Application öffnen
- Warten bis Docker Symbol grün wird

**Linux:**
```bash
sudo systemctl start docker
```

**Testen:**
```bash
docker ps
# Sollte Container auflisten
```

---

## ❌ "Database in unhealthy state"

**Was bedeutet das?**
PostgreSQL hat Probleme.

**Lösung (Datenverlust!):**
```bash
# Alles zurücksetzen
docker-compose down -v

# Volumes gelöscht, neu starten
docker-compose up -d

# Warten
sleep 30

# Status prüfen
docker-compose ps
```

---

## ✅ Der "Alles-Reset" (Atombombe)

Wenn nichts mehr funktioniert:

```bash
# Schritt 1: Alles stoppen
docker-compose down -v

# Schritt 2: Warten
sleep 5

# Schritt 3: Neu bauen
docker-compose build --no-cache

# Schritt 4: Starten
docker-compose up -d

# Schritt 5: Warten
sleep 30

# Schritt 6: Prüfen
docker-compose ps

# Schritt 7: Zugreifen
echo "Frontend: http://localhost:3000"
echo "Backend: http://localhost:8000/docs"
```

---

## 🎯 Debugging-Checkliste

1. **Ist Docker läuft?**
   ```bash
   docker ps
   ```

2. **Sind alle Container Up?**
   ```bash
   docker-compose ps
   ```

3. **Antwortet Backend?**
   ```bash
   curl http://localhost:8000/health
   ```

4. **Backend-Fehler?**
   ```bash
   docker-compose logs backend | tail -50
   ```

5. **Frontend-Fehler?**
   ```bash
   docker-compose logs frontend | tail -50
   ```

6. **Browser-Console überprüft?**
   - F12 öffnen
   - Console-Tab anschauen
   - Rote Fehler?

7. **Cache geleert?**
   - Ctrl+Shift+Del (Cmd+Shift+Del auf Mac)
   - Seite neu laden (F5)

---

## 📞 Wenn immer noch nicht funktioniert

Bitte sammeln Sie diese Infos:

```bash
# Alles ausgeben
echo "=== Docker Status ===" && docker-compose ps
echo "=== Backend Logs ===" && docker-compose logs backend | tail -100
echo "=== Frontend Logs ===" && docker-compose logs frontend | tail -100
echo "=== Database Logs ===" && docker-compose logs database | tail -50
echo "=== Backend Health ===" && curl -v http://localhost:8000/health
echo "=== Backend Docs ===" && curl -s http://localhost:8000/openapi.json | head -50
```

Diese Ausgaben posten, dann können wir besser helfen! 🙏
