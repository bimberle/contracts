# Version Management

## Wichtig: Versionen müssen bei jedem Release erhöht werden!

Dieses Dokument dokumentiert alle Orte, wo Versionsnummern gepflegt werden müssen.

### 🔴 VORSICHT: NICHT VERGESSEN!
**Bei jedem Release/Deployment müssen folgende Versionsnummern erhöht werden:**

## Frontend Version (1.0.0)

**Datei:** `frontend/package.json`
```json
{
  "name": "contracts-frontend",
  "version": "1.0.0"  // ← HIER ERHÖHEN
}
```

**Datei:** `frontend/vite.config.ts`
```typescript
define: {
  'import.meta.env.VITE_APP_VERSION': JSON.stringify('1.0.0'), // ← HIER ERHÖHEN
}
```

**Anzeige im Frontend:** 
- Wird beim App-Start in der Browser-Konsole geloggt
- Format: `📦 Frontend version: 1.0.0`

---

## Backend Version (1.0.0)

**Datei:** `backend/app/main.py`
```python
@app.get("/")
def read_root():
    return {
        "message": "Contract Management API",
        "version": "1.0.0",  # ← HIER ERHÖHEN
        "docs": "/docs"
    }

@app.get("/api/version")
def get_version():
    """Get backend version information"""
    return {
        "service": "contracts-backend",
        "version": "1.0.0"  # ← HIER ERHÖHEN
    }
```

**Anzeige im Frontend:**
- Wird beim App-Start in der Browser-Konsole geloggt (über API)
- Format: `📦 Backend version: 1.0.0`
- API Endpoint: `GET /api/version`

---

## Versionierungsschema

Wir nutzen **Semantic Versioning**: `MAJOR.MINOR.PATCH`

- **PATCH** (z.B. 1.0.1): Bugfixes
- **MINOR** (z.B. 1.1.0): Neue Features (abwärtskompatibel)
- **MAJOR** (z.B. 2.0.0): Breaking Changes

### Beispiele:
- Bugfix im Frontend: `1.0.0` → `1.0.1`
- Neue Funktion im Backend: `1.0.0` → `1.1.0`
- Großes Update mit Breaking Changes: `1.0.0` → `2.0.0`

---

## Release Checklist

Vor jedem Deployment:

- [ ] Frontend-Version in `package.json` erhöhen
- [ ] Frontend-Version in `vite.config.ts` erhöhen
- [ ] Backend-Version in `main.py` (2 Orte!) erhöhen
- [ ] Diese Datei mit neuer Version updaten
- [ ] Git commit: `git commit -m "Bump version to X.Y.Z"`
- [ ] Docker Images neu bauen und pushen
- [ ] Deployment durchführen

---

## Automatische Versionsanzeige

Die Versionen werden automatisch beim App-Start angezeigt:

**Browser Console:**
```
📦 Frontend version: 1.0.0
📦 Backend version: 1.0.0
```

Dies hilft, schnell zu überprüfen, welche Version gerade läuft.

---

## Letzte Updates

- **Version 1.0.0**: Initial Release mit Version Management
  - Frontend Versionsanzeige
  - Backend Versionsanzeige
  - API Endpoint `/api/version`
