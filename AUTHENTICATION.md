# Authentication Setup für Contract Management

## Überblick

Die Anwendung unterstützt optionale Passwort-basierte Authentifizierung. Diese kann über eine Umgebungsvariable (`AUTH_PASSWORD`) konfiguriert werden.

## Aktivierung der Authentifizierung

### Mit Docker Compose

1. **Passwort setzen** in der `.env` Datei:
```bash
AUTH_PASSWORD=mein-sicheres-passwort
```

2. **Container starten**:
```bash
docker-compose up -d
```

3. **Anwendung öffnen**: `http://localhost`

4. **Login**: Geben Sie das Passwort ein, das Sie in `AUTH_PASSWORD` gesetzt haben

### Ohne Passwort (Authentifizierung deaktiviert)

Wenn `AUTH_PASSWORD` nicht gesetzt oder leer ist:

```bash
# In .env oder docker-compose.yml
AUTH_PASSWORD=
```

Die Anwendung ist dann ohne Login zugänglich.

## Wie es funktioniert

### Backend (FastAPI)

- **Login-Endpoint**: `POST /auth/login`
  ```json
  {
    "password": "mein-sicheres-passwort"
  }
  ```
  Response:
  ```json
  {
    "token": "mein-sicheres-passwort",
    "message": "Login successful"
  }
  ```

- **Auth-Check-Endpoint**: `GET /auth/check`
  ```json
  {
    "auth_required": true
  }
  ```

- **Alle API-Requests** müssen das Token im `Authorization`-Header mitgeben:
  ```
  Authorization: Bearer mein-sicheres-passwort
  ```

### Frontend (React)

- **LoginPage-Komponente**: Zeigt Login-Dialog wenn Authentifizierung erforderlich ist
- **Token-Speicherung**: Token wird in `localStorage` gespeichert
- **Token-Übermittlung**: Wird automatisch bei allen API-Requests mitgesendet
- **Logout**: Entfernt Token und zeigt wieder Login-Dialog

## Sicherheitshinweise

⚠️ **Wichtig**: Diese Implementierung ist für **einfache Zugriffskontrolle** geeignet, nicht für kritische Sicherheit.

### Für Production:

1. **HTTPS verwenden** - Passwort wird im `Authorization`-Header gesendet
2. **Starkes Passwort** - Mindestens 12 Zeichen, mit Spezialzeichen
3. **Environment-Variable** - Passwort sollte nicht im Code stehen
4. **Erwerbung beachten** - Ggf. auf echte Authentifizierung (OAuth2, JWT) upgraden

## Beispiel-Konfiguration

### docker-compose.yml
```yaml
backend:
  environment:
    AUTH_PASSWORD: ${AUTH_PASSWORD:-}  # Wird aus .env gelesen
```

### .env
```bash
# Passwort setzen
AUTH_PASSWORD=SuperSicheresPasswort123!

# Oder leer lassen zum Deaktivieren
# AUTH_PASSWORD=
```

## Testing mit curl

```bash
# 1. Login
curl -X POST http://localhost:8000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"password":"SuperSicheresPasswort123!"}'

# Response: {"token":"SuperSicheresPasswort123!","message":"Login successful"}

# 2. API-Request mit Token
curl -X GET http://localhost:8000/api/customers \
  -H "Authorization: Bearer SuperSicheresPasswort123!"
```
