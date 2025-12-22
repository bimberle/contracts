# 🚀 STARTEN IN 3 SCHRITTEN

## Schritt 1️⃣: Terminal öffnen
```bash
cd /workspaces/contracts
```

## Schritt 2️⃣: Anwendung starten
```bash
bash start.sh
```

Oder wenn das nicht funktioniert:
```bash
docker-compose up -d && sleep 30
```

## Schritt 3️⃣: Browser öffnen
```
http://localhost:3000
```

---

## ✅ Das wars!

Sie sollten jetzt sehen:
- Navigation oben mit "Contracts" Logo
- Dashboard mit Kundenübersicht
- Keine Fehlermeldungen

---

## 🆘 Wenn es nicht funktioniert

```bash
# Status prüfen
docker-compose ps

# Backend Test
curl http://localhost:8000/health

# Logs ansehen
docker-compose logs -f backend
```

Siehe [TROUBLESHOOTING.md](TROUBLESHOOTING.md) für weitere Hilfe.
