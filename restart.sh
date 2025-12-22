#!/bin/bash
# Restart script for Contract Management System

echo "Stopping containers..."
docker-compose down

echo ""
echo "Waiting 2 seconds..."
sleep 2

echo ""
echo "Starting containers..."
docker-compose up -d

echo ""
echo "Waiting for containers to be ready (20 seconds)..."
sleep 20

echo ""
echo "Container status:"
docker-compose ps

echo ""
echo "Frontend: http://localhost:3000"
echo "Backend API Docs: http://localhost:8000/docs"
echo "Backend Health: http://localhost:8000/health"
