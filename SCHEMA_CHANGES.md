# Schema-Änderungen: Aufteilung des Vertragspreises

## Zusammenfassung
Der monatliche Vertragsbetrag wird nun in zwei separate Felder unterteilt:
- **fixed_price**: Fixer Bestandteil (unterliegt NICHT den Preiserhöhungen)
- **adjustable_price**: Anpassungsfähiger Betrag (unterliegt Preiserhöhungen)

Der **Gesamtbetrag pro Monat** = fixed_price + (adjustable_price × (1 + Erhöhungen))

## Backend-Änderungen

### 1. Datenbank-Modell (`backend/app/models/contract.py`)
- `price: Float` → entfernt
- Neu: `fixed_price: Float` (nullable=False)
- Neu: `adjustable_price: Float` (nullable=False)

### 2. Pydantic-Schemas (`backend/app/schemas/contract.py`)
- ContractBase: `price` durch `fixed_price` und `adjustable_price` ersetzt
- ContractCreate: `price` durch `fixed_price` und `adjustable_price` ersetzt
- ContractUpdate: `price` durch `fixed_price` und `adjustable_price` ersetzt

### 3. Berechnungen (`backend/app/services/calculations.py`)
- `get_current_monthly_price()`: 
  - Preiserhöhungen werden nur auf `adjustable_price` angewendet
  - Gesamtpreis = fixed_price + (adjustable_price × (1 + Erhöhungen))
  - Formel: `return contract.fixed_price + adjustable_price`

### 4. Metriken (`backend/app/services/metrics.py`)
- `calculate_customer_metrics()`:
  - `total_monthly_rental` wird korrekt berechnet: fixed_price + adjustable_price

### 5. Analytics-Router (`backend/app/routers/analytics.py`)
- Kontraktdetails: `price` durch `fixed_price` und `adjustable_price` ersetzt

### 6. Datenbank-Migration (`backend/migrations/versions/001_split_contract_price.py`)
- Migriert bestehende `price`-Spalte in `fixed_price` und `adjustable_price`
- Bei Daten: 50/50 Aufteilung als Standard (kann nachträglich angepasst werden)
- Bei leerer DB: Spalten werden direkt mit neuen Namen erstellt

## Frontend-Änderungen

### 1. TypeScript-Typen (`frontend/src/types/index.ts`)
- Contract Interface:
  - `price: number` → `fixedPrice: number`
  - Neu: `adjustablePrice: number`
- ContractCreateRequest: Entsprechend angepasst
- ContractUpdateRequest: Entsprechend angepasst

### 2. UI-Anpassungen (`frontend/src/pages/CustomerDetail.tsx`)
- Monatspreis wird als Summe angezeigt: `fixedPrice + adjustablePrice`

## API-Verträge (bestehen bleiben)
- REST-Endpoints bleiben unverändert
- Content-Type: application/json mit neuen Feldnamen
- snake_case im Backend (fixed_price, adjustable_price)
- camelCase im Frontend (fixedPrice, adjustablePrice)

## Migrationsschritte

### Bei Bestehender Installation:
```bash
cd backend
alembic upgrade head
```

### Bei Neuer Installation:
- Migration wird automatisch angewendet bei Datenbankinitialisierung

## Beispiel: Vertrag mit Preiserhöhung

**Vertrag:**
- fixed_price = 100€
- adjustable_price = 200€
- Preiserhöhung: +10% ab Monat 6

**Gesamtpreis:**
- Monat 1-5: 100 + 200 = 300€/Monat
- Ab Monat 6: 100 + (200 × 1.10) = 100 + 220 = 320€/Monat

## Hinweise für Entwickler

1. **API-Clients**: Müssen `fixedPrice` und `adjustablePrice` statt `price` senden
2. **Formular**: Zwei Eingabefelder statt ein Feld erforderlich
3. **Anzeige**: Gesamtpreis = fixed + adjustable (mit aktuellen Erhöhungen)
4. **Berechnung**: Provisionsformeln verwenden `get_current_monthly_price()` 

