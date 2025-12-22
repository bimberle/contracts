#!/bin/bash
# Diagnostic script for Contract Management System

echo "=== Contract Management System - Diagnostic ==="
echo ""

echo "1. Checking Docker containers..."
docker-compose ps
echo ""

echo "2. Checking Backend logs (last 20 lines)..."
docker-compose logs --tail=20 backend
echo ""

echo "3. Checking Frontend logs (last 20 lines)..."
docker-compose logs --tail=20 frontend
echo ""

echo "4. Checking Database connection..."
docker-compose exec -T database pg_isready -U contracts_user -d contracts
echo ""

echo "5. Testing Backend health..."
curl -s http://localhost:8000/health || echo "Backend nicht erreichbar"
echo ""

echo "6. API documentation available at: http://localhost:8000/docs"
echo "7. Frontend available at: http://localhost:3000"
