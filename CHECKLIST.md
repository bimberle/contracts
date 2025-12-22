# 🚀 Checkliste zum Starten

Folgen Sie dieser Checkliste, um die Anwendung zum Laufen zu bringen:

## ✅ Vorbereitung (einmalig)

- [ ] Docker ist installiert und läuft
- [ ] Sie sind im Verzeichnis `/workspaces/contracts`
- [ ] `.env` Datei existiert (oder `.env.example` kopieren)

## 🐳 Docker-Container

### Variante 1: Mit Skript (empfohlen)
```bash
bash start.sh
```
- [ ] Skript wurde ausgeführt ohne Fehler
- [ ] Alle 3 Container zeigen Status "Up"

### Variante 2: Manuell
```bash
docker-compose down
sleep 5
docker-compose up -d
sleep 20
docker-compose ps
```
- [ ] Alle 3 Container zeigen Status "Up":
  - [ ] database
  - [ ] backend  
  - [ ] frontend

## 🔍 Verbindungen prüfen

```bash
# Backend-Health prüfen
curl http://localhost:8000/health
```
- [ ] Gibt zurück: `{"status":"healthy"}`

```bash
# Docker-Logs prüfen
docker-compose logs --tail=20 backend
```
- [ ] Keine ERROR Meldungen
- [ ] "Application startup complete" zu sehen

## 🌐 Frontend öffnen

Öffnen Sie im Browser:
```
http://localhost:3000
```

### Erwartet:
- [ ] Seite lädt (nicht weiß/leer)
- [ ] Navigation oben mit "Contracts" Logo
- [ ] Dashboard mit Tabelle angezeigt
- [ ] Keine Fehler in Browser-Console (F12)

## 🎯 Features testen

- [ ] Dashboard zeigt "0 Kunden" oder Kunde
- [ ] "Neuer Kunde" Button funktioniert
- [ ] Einstellungen-Seite lädt
- [ ] Forecast-Seite lädt
- [ ] Keine roten Fehler in Console (F12)

## 📊 API testen

Öffnen Sie: `http://localhost:8000/docs`
- [ ] Swagger UI lädt
- [ ] Endpoints sind aufgelistet
- [ ] Können Endpoints "Try Out" anklicken

## 🆘 Wenn etwas nicht funktioniert

1. **Logs anschauen**
   ```bash
   docker-compose logs -f
   ```
   - [ ] Fehler identifiziert?

2. **Neustarten**
   ```bash
   docker-compose down
   sleep 5
   docker-compose up -d
   sleep 30
   ```

3. **Hard-Reset** (Datenbank wird gelöscht!)
   ```bash
   docker-compose down -v
   docker-compose up -d
   sleep 30
   ```

4. **Port-Konflikt prüfen**
   ```bash
   lsof -i :3000
   lsof -i :8000
   lsof -i :5432
   ```

## 📝 Notizen

Schreiben Sie hier auf, wenn etwas nicht funktioniert:

```
[Hier Fehler/Probleme notieren]
```

## ✨ Fertig!

Wenn alle Häkchen gesetzt sind → **Anwendung läuft erfolgreich! 🎉**

---

**Weiterführende Ressourcen:**
- [QUICKSTART.md](QUICKSTART.md) - Ausführliche erste Schritte
- [TROUBLESHOOTING.md](TROUBLESHOOTING.md) - Lösungen für Probleme
- [README.md](README.md) - Vollständige Dokumentation
