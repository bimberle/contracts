# Docker Hub Deployment Guide

## Überblick

Dieses Projekt kann in zwei Modi deployed werden:

1. **Development**: Mit lokalen Builds (`docker-compose.yml`)
2. **Production**: Mit gepushten Images von Docker Hub (`docker-compose.prod.yml`)

## Voraussetzungen

- [Docker Hub Account](https://hub.docker.com)
- Docker & Docker Compose installiert
- `docker login` mit deinen Docker Hub Credentials

## Schritt 1: Docker Hub Account vorbereiten

```bash
# Login zu Docker Hub
docker login

# Username eingeben: bimberle
# Password eingeben: (dein Docker Hub Password)
```

## Schritt 2: Images pushen

```bash
# Script mit Standard-Version (latest)
./push-to-dockerhub.sh latest bimberle

# Oder mit spezifischer Version
./push-to-dockerhub.sh 1.0.0 bimberle

# Oder mit deinem Docker Hub Username
./push-to-dockerhub.sh 1.2.3 dein-username
```

Das Skript wird:
- ✅ Überprüfen, dass Docker läuft
- ✅ Überprüfen, dass du bei Docker Hub angemeldet bist
- ✅ Images lokal bauen
- ✅ Mit der Versionsnummer taggen
- ✅ "latest" Tag setzen
- ✅ Beide Backend und Frontend zu Docker Hub pushen

## Schritt 3: Production Deployment

Nach dem erfolgreichen Push kannst du auf beliebigen Hosts deployen:

```bash
# Environment Variablen setzen (optional)
export DOCKERHUB_USERNAME=bimberle
export VERSION=1.0.0
export SECRET_KEY=your-secure-secret-key
export CORS_ORIGINS=https://example.com

# Mit Production Compose File starten
docker-compose -f docker-compose.prod.yml up -d
```

### Konfiguration via Environment Variablen

```bash
# .env Datei erstellen
cat > .env << EOF
DOCKERHUB_USERNAME=bimberle
VERSION=1.0.0
SECRET_KEY=super-secure-key-change-this
DEBUG=False
CORS_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
VITE_API_URL=https://api.yourdomain.com
EOF

# Dann starten
docker-compose -f docker-compose.prod.yml up -d
```

## Image Management

### Images anzeigen

```bash
# Lokal
docker images | grep contracts

# Auf Docker Hub
docker search bimberle/contracts
```

### Images pullen

```bash
# Spezifische Version
docker pull bimberle/contracts-backend:1.0.0
docker pull bimberle/contracts-frontend:1.0.0

# Neueste Version
docker pull bimberle/contracts-backend:latest
docker pull bimberle/contracts-frontend:latest
```

### Images löschen

```bash
# Von Docker Hub (via Web UI oder API)
# https://hub.docker.com/r/bimberle/contracts-backend

# Lokal
docker rmi bimberle/contracts-backend:1.0.0
docker rmi bimberle/contracts-frontend:1.0.0
```

## Best Practices

### Versionierung

Verwende semantische Versionierung:

```bash
./push-to-dockerhub.sh 1.0.0 bimberle  # Major.Minor.Patch
./push-to-dockerhub.sh 1.1.0 bimberle  # Minor Release
./push-to-dockerhub.sh 1.0.1 bimberle  # Patch Release
```

### Production Sicherheit

Setze in Production **NIEMALS** folgende Werte:

```bash
DEBUG=False                              # Niemals True in Production!
SECRET_KEY=change-this-in-production     # Neuer, sicherer Key!
POSTGRES_PASSWORD=contracts_password     # Neues, starkes Passwort!
```

### Monitoring in Production

```bash
# Health Check
docker ps --format "{{.Names}}\t{{.Status}}"

# Logs anzeigen
docker-compose -f docker-compose.prod.yml logs -f backend
docker-compose -f docker-compose.prod.yml logs -f frontend

# Container neustarten
docker-compose -f docker-compose.prod.yml restart backend
```

## Automatisiertes Deployment (CI/CD)

Beispiel GitHub Actions Workflow (`.github/workflows/deploy.yml`):

```yaml
name: Push to Docker Hub

on:
  push:
    tags:
      - 'v*'  # z.B. v1.0.0

jobs:
  push:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v2
      
      - name: Login to Docker Hub
        uses: docker/login-action@v2
        with:
          username: ${{ secrets.DOCKERHUB_USERNAME }}
          password: ${{ secrets.DOCKERHUB_PASSWORD }}
      
      - name: Get version
        id: version
        run: echo "VERSION=${GITHUB_REF#refs/tags/v}" >> $GITHUB_OUTPUT
      
      - name: Run push script
        run: ./push-to-dockerhub.sh ${{ steps.version.outputs.VERSION }} ${{ secrets.DOCKERHUB_USERNAME }}
```

## Troubleshooting

### "ERROR: Unauthorized"

**Problem**: Nicht bei Docker Hub angemeldet
**Lösung**:
```bash
docker login
# oder
cat ~/my_password.txt | docker login -u bimberle --password-stdin
```

### "ERROR: image not found"

**Problem**: Lokales Image nicht gebaut
**Lösung**:
```bash
docker-compose build
./push-to-dockerhub.sh latest bimberle
```

### "ERROR: Request was throttled"

**Problem**: Docker Hub Rate Limiting
**Lösung**: Warten oder Premium Account nutzen

## Weitere Resources

- [Docker Hub](https://hub.docker.com)
- [Docker Compose Reference](https://docs.docker.com/compose/compose-file/)
- [Docker Best Practices](https://docs.docker.com/develop/dev-best-practices/)
