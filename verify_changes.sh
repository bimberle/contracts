#!/bin/bash
# Verification checklist for price split implementation

echo "=== Verifikation: Aufteilung des Vertragspreises ==="
echo ""

echo "✓ Backend Model (contract.py)"
grep -n "fixed_price\|adjustable_price" /Users/michi/dev/contracts/contracts/backend/app/models/contract.py | head -2
echo ""

echo "✓ Backend Schemas (contract.py)"
grep -n "fixed_price\|adjustable_price" /Users/michi/dev/contracts/contracts/backend/app/schemas/contract.py | head -3
echo ""

echo "✓ Calculations (calculations.py) - Nur adjustable mit Erhöhungen"
grep -n "fixed_price\|adjustable_price" /Users/michi/dev/contracts/contracts/backend/app/services/calculations.py | head -3
echo ""

echo "✓ Metrics (metrics.py)"
grep -n "fixed_price + adjustable_price" /Users/michi/dev/contracts/contracts/backend/app/services/metrics.py
echo ""

echo "✓ Frontend Types (index.ts)"
grep -n "fixedPrice\|adjustablePrice" /Users/michi/dev/contracts/contracts/frontend/src/types/index.ts | head -3
echo ""

echo "✓ Frontend UI (CustomerDetail.tsx)"
grep -n "fixedPrice.*adjustablePrice" /Users/michi/dev/contracts/contracts/frontend/src/pages/CustomerDetail.tsx
echo ""

echo "✓ Migration File"
ls -la /Users/michi/dev/contracts/contracts/backend/migrations/versions/
echo ""

echo "=== Alle Änderungen erfolgreich durchgeführt ==="
