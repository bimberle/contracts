#!/bin/bash

# Docker Hub Push Script für Contracts Management App
# 
# Verwendung:
#   ./push-to-dockerhub.sh [version] [dockerhub-username]
#
# Beispiel:
#   ./push-to-dockerhub.sh 1.0.0 bimberle
#   ./push-to-dockerhub.sh latest bimberle

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
VERSION=${1:-latest}
DOCKERHUB_USERNAME=${2:-bimberle}
REGISTRY="docker.io"
PROJECT_NAME="contracts"

# Image names
BACKEND_IMAGE_LOCAL="contracts-backend"
FRONTEND_IMAGE_LOCAL="contracts-frontend"

BACKEND_IMAGE_REMOTE="${DOCKERHUB_USERNAME}/${PROJECT_NAME}-backend"
FRONTEND_IMAGE_REMOTE="${DOCKERHUB_USERNAME}/${PROJECT_NAME}-frontend"

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║     Docker Hub Push Script - Contracts Management App      ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Check if Docker is running
echo -e "${YELLOW}→ Überprüfe Docker...${NC}"
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}✗ Docker läuft nicht!${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Docker läuft${NC}"
echo ""

# Check if user is logged in to Docker Hub
echo -e "${YELLOW}→ Überprüfe Docker Hub Login...${NC}"
if ! docker login -u "$DOCKERHUB_USERNAME" --password-stdin < /dev/null > /dev/null 2>&1; then
    echo -e "${YELLOW}! Nicht angemeldet bei Docker Hub${NC}"
    echo -e "${YELLOW}→ Bitte melden Sie sich an:${NC}"
    docker login
    if [ $? -ne 0 ]; then
        echo -e "${RED}✗ Docker Hub Login fehlgeschlagen!${NC}"
        exit 1
    fi
fi
echo -e "${GREEN}✓ Angemeldet bei Docker Hub${NC}"
echo ""

# Build images
echo -e "${YELLOW}→ Baue Docker Images...${NC}"
docker-compose build --no-cache
if [ $? -ne 0 ]; then
    echo -e "${RED}✗ Build fehlgeschlagen!${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Images gebaut${NC}"
echo ""

# Tag backend image
echo -e "${YELLOW}→ Tagge Backend Image...${NC}"
docker tag "${BACKEND_IMAGE_LOCAL}:latest" "${BACKEND_IMAGE_REMOTE}:${VERSION}"
docker tag "${BACKEND_IMAGE_LOCAL}:latest" "${BACKEND_IMAGE_REMOTE}:latest"
echo -e "${GREEN}✓ Backend Image getaggt:${NC}"
echo "  - ${BACKEND_IMAGE_REMOTE}:${VERSION}"
echo "  - ${BACKEND_IMAGE_REMOTE}:latest"
echo ""

# Tag frontend image
echo -e "${YELLOW}→ Tagge Frontend Image...${NC}"
docker tag "${FRONTEND_IMAGE_LOCAL}:latest" "${FRONTEND_IMAGE_REMOTE}:${VERSION}"
docker tag "${FRONTEND_IMAGE_LOCAL}:latest" "${FRONTEND_IMAGE_REMOTE}:latest"
echo -e "${GREEN}✓ Frontend Image getaggt:${NC}"
echo "  - ${FRONTEND_IMAGE_REMOTE}:${VERSION}"
echo "  - ${FRONTEND_IMAGE_REMOTE}:latest"
echo ""

# Push backend image
echo -e "${YELLOW}→ Pushe Backend Image zu Docker Hub...${NC}"
echo "  Repository: ${BACKEND_IMAGE_REMOTE}"
echo "  Version: ${VERSION}"
docker push "${BACKEND_IMAGE_REMOTE}:${VERSION}"
if [ $? -ne 0 ]; then
    echo -e "${RED}✗ Push fehlgeschlagen für Backend Version ${VERSION}!${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Backend:${VERSION} erfolgreich gepusht${NC}"

docker push "${BACKEND_IMAGE_REMOTE}:latest"
if [ $? -ne 0 ]; then
    echo -e "${RED}✗ Push fehlgeschlagen für Backend latest!${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Backend:latest erfolgreich gepusht${NC}"
echo ""

# Push frontend image
echo -e "${YELLOW}→ Pushe Frontend Image zu Docker Hub...${NC}"
echo "  Repository: ${FRONTEND_IMAGE_REMOTE}"
echo "  Version: ${VERSION}"
docker push "${FRONTEND_IMAGE_REMOTE}:${VERSION}"
if [ $? -ne 0 ]; then
    echo -e "${RED}✗ Push fehlgeschlagen für Frontend Version ${VERSION}!${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Frontend:${VERSION} erfolgreich gepusht${NC}"

docker push "${FRONTEND_IMAGE_REMOTE}:latest"
if [ $? -ne 0 ]; then
    echo -e "${RED}✗ Push fehlgeschlagen für Frontend latest!${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Frontend:latest erfolgreich gepusht${NC}"
echo ""

# Show summary
echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}✓ Alle Images erfolgreich zu Docker Hub gepusht!${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${BLUE}Repositories:${NC}"
echo -e "  Backend:  ${GREEN}${REGISTRY}/${BACKEND_IMAGE_REMOTE}:${VERSION}${NC}"
echo -e "  Frontend: ${GREEN}${REGISTRY}/${FRONTEND_IMAGE_REMOTE}:${VERSION}${NC}"
echo ""
echo -e "${BLUE}Verwendung zum Pullen:${NC}"
echo -e "  ${GREEN}docker pull ${BACKEND_IMAGE_REMOTE}:${VERSION}${NC}"
echo -e "  ${GREEN}docker pull ${FRONTEND_IMAGE_REMOTE}:${VERSION}${NC}"
echo ""
echo -e "${BLUE}Mit docker-compose.yml:${NC}"
echo -e "  Ersetzen Sie die 'build' Blöcke mit:"
echo -e "    ${GREEN}image: ${BACKEND_IMAGE_REMOTE}:${VERSION}${NC} (für backend)"
echo -e "    ${GREEN}image: ${FRONTEND_IMAGE_REMOTE}:${VERSION}${NC} (für frontend)"
echo ""
echo -e "${YELLOW}→ Push abgeschlossen!${NC}"
