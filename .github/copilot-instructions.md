# Copilot Anweisungen - Contract Management Webapp (erweitert)

## Projektübersicht

Dies ist eine containerisierte Webapp zur Verwaltung von Softwareverkaufs- und Mietverträgen. Die Webapp berechnet automatisch Provisionen basierend auf Vertragtyp, Preiserhöhungen und Bestandsschutz-Regeln.

### Architektur
- **Deployment**: Docker Container (Docker Compose)
- **Frontend**: React SPA (Single Page Application)
- **Backend**: Python REST API
- **Datenbank**: PostgreSQL

### Tech-Stack

#### Frontend
- **Framework**: React (TypeScript)
- **UI-Framework**: Tabler UI / Tabler Icons
- **Styling**: Tailwind CSS (integriert in Tabler)
- **State Management**: Zustand
- **HTTP Client**: Axios oder Fetch API
- **Charting**: Chart.js oder Recharts (für 12-Monats Provisions-Forecast)
- **Build Tool**: Vite
- **Package Manager**: npm

#### Backend
- **Framework**: FastAPI (Python)
- **ORM**: SQLAlchemy
- **Validierung**: Pydantic
- **Migration**: Alembic
- **Authentifizierung**: Optional für späteren Ausbau
- **Package Manager**: pip (requirements.txt)

#### Datenbank
- **DBMS**: PostgreSQL 15+
- **Schema-Migration**: Alembic

#### DevOps
- **Containerisierung**: Docker + Docker Compose
- **Webserver (Production)**: Nginx für Frontend, Uvicorn für Backend
- **Environment**: .env Dateien für Konfiguration

---

## Docker Setup

### Container-Struktur
```yaml
services:
  frontend:
    - React App (Vite Dev Server oder Nginx Production)
    - Port: 3000 (dev) / 80 (prod)
    - Volume: ./frontend → /app
    
  backend:
    - FastAPI Server (Uvicorn)
    - Port: 8000
    - Volume: ./backend → /app
    - Depends on: database
    
  database:
    - PostgreSQL 15+
    - Port: 5432 (nur intern)
    - Volume: postgres_data (named volume)
    - Environment: POSTGRES_DB, POSTGRES_USER, POSTGRES_PASSWORD
```

### Netzwerk
- Frontend kommuniziert mit Backend über HTTP (http://backend:8000)
- Backend kommuniziert mit Database über PostgreSQL-Protokoll
- Nur Frontend-Port wird nach außen exposed

### Environment Variables
```bash
# Backend (.env)
DATABASE_URL=postgresql://user:password@database:5432/contracts
SECRET_KEY=your-secret-key-here
DEBUG=True
CORS_ORIGINS=http://localhost:3000

# Frontend (.env)
VITE_API_URL=http://localhost:8000
```

---

## API-Endpunkte

### Customers (Kunden)
```
GET    /api/customers           - Liste aller Kunden
GET    /api/customers/{id}      - Einzelner Kunde mit Details
POST   /api/customers           - Neuen Kunden erstellen
PUT    /api/customers/{id}      - Kunde aktualisieren
DELETE /api/customers/{id}      - Kunde löschen (kaskadiert Verträge)
GET    /api/customers/{id}/metrics - Berechnete Metriken für Kunde
```

### Contracts (Verträge)
```
GET    /api/contracts                    - Liste aller Verträge
GET    /api/contracts/{id}               - Einzelner Vertrag
GET    /api/contracts/customer/{id}      - Verträge eines Kunden
POST   /api/contracts                    - Neuen Vertrag erstellen
PUT    /api/contracts/{id}               - Vertrag aktualisieren
DELETE /api/contracts/{id}               - Vertrag löschen
GET    /api/contracts/{id}/metrics       - Berechnete Metriken für Vertrag
```

### Settings (Einstellungen)
```
GET    /api/settings                     - Aktuelle Einstellungen
PUT    /api/settings                     - Einstellungen aktualisieren
```

### Price Increases (Preiserhöhungen)
```
GET    /api/price-increases              - Liste aller Preiserhöhungen
GET    /api/price-increases/{id}         - Einzelne Preiserhöhung
POST   /api/price-increases              - Neue Preiserhöhung erstellen
PUT    /api/price-increases/{id}         - Preiserhöhung aktualisieren
DELETE /api/price-increases/{id}         - Preiserhöhung löschen
```

### Analytics (Berechnungen & Forecast)
```
GET    /api/analytics/dashboard          - Dashboard-Übersicht (alle Kunden)
GET    /api/analytics/forecast           - 12-Monats Provisions-Forecast
GET    /api/analytics/customer/{id}      - Detaillierte Analysen für Kunde
```

### Response Format
```json
// Success
{
  "status": "success",
  "data": { ... }
}

// Error
{
  "status": "error",
  "message": "Fehlermeldung",
  "details": { ... }
}
```

---

## Datenmodell

### Customer (Kunde)
```typescript
{
  id: string;              // UUID
  name: string;            // Kundenname
  ort: string;             // Stadt/Ort
  plz: string;             // Postleitzahl
  kundennummer: string;    // Eindeutige Kundennummer
  land: string;            // Land
  createdAt: Date;
  updatedAt: Date;
}
```

### Contract (Vertrag) - ERWEITERT
```typescript
{
  id: string;              // UUID
  customerId: string;      // Referenz zur Customer
  
  // Beschreibung & Typ
  title: string;           // Vertragsname/Beschreibung
  type: 'rental' | 'software-care'; // Miete oder Software-Pflege
  
  // Finanzielle Details
  price: number;           // Monatlicher Preis (€)
  currency: string;        // Standard: 'EUR'
  
  // Zeitliche Details
  startDate: Date;         // Vertragsbeginn (Unterzeichnungsdatum)
  rentalStartDate: Date;   // TATSÄCHLICHER Mietbeginn (kann mit Existenzgründer später sein)
  endDate: Date | null;    // Vertragsende (null = unbegrenzt)
  
  // Existenzgründer-Flag
  isFounderDiscount: boolean;  // Wenn true: Miete startet später
  
  // Status
  status: 'active' | 'inactive' | 'completed';
  notes: string;           // Notizen
  
  createdAt: Date;
  updatedAt: Date;
}
```

### Settings (Allgemeine Einstellungen)
```typescript
{
  id: string;              // Immer 'default'
  
  // Existenzgründer
  founderDelayMonths: number;      // Standard: 12 Monate Verzögerung
  
  // Provisionen nach Vertragstyp
  commissionRates: {
    rental: number;                // Provisionssatz für Miete in %
    'software-care': number;       // Provisionssatz für Software-Pflege in %
  };
  
  // Post-Contract Provisionen
  postContractMonths: {
    rental: number;                // Standard: 12 Monate nach Vertragsende
    'software-care': number;       // Standard: 12 Monate nach Vertragsende
  };
  
  // Exit-Calculation
  minContractMonthsForPayout: number;  // Standard: 60 Monate (5 Jahre)
  
  // Preiserhöhungen
  priceIncreases: PriceIncrease[];     // Array von Preiserhöhungen
  
  updatedAt: Date;
}
```

### PriceIncrease (Preiserhöhung)
```typescript
{
  id: string;              // UUID
  
  // Gültigkeitszeitraum
  validFrom: Date;         // Ab wann gültig
  factor: number;          // Erhöhung in % (z.B. 5 für +5%)
  
  // Bestandsschutz
  lockInMonths: number;    // Standard: 24 Monate
  
  // Anwendung
  appliesToTypes: ('rental' | 'software-care')[]; // Auf welche Typen anwenden
  
  description: string;     // Notizen (z.B. "Inflation 2025")
  
  createdAt: Date;
  updatedAt: Date;
}
```

### CalculatedMetrics (abgeleitete Daten - nicht persistiert)
```typescript
{
  customerId: string;
  
  // Zahlungen
  totalMonthlyRental: number;      // Summe aller aktiven Mietverträge (€/Monat)
  totalMonthlyCommission: number;  // Gesamtprovision aus aktuellen Verträgen (€/Monat)
  totalEarned: number;             // Bereits verdiente Provision (kumulativ)
  
  // Exit-Szenario
  exitPayoutIfTodayInMonths: number; // Provision wenn heute gekündigt würde
  
  // Verträge
  activeContracts: number;         // Anzahl aktiver Verträge
}
```

### ContractWithMetrics (für Anzeige)
```typescript
{
  contract: Contract;
  
  // Berechnete Werte
  currentMonthlyPrice: number;     // Preis mit angewendeten Preiserhöhungen
  monthsRunning: number;           // Monate seit rentalStartDate
  isInFounderPeriod: boolean;      // Befindet sich noch in Gründerphase?
  currentMonthlyCommission: number;// Aktuelle monatliche Provision
  earnedCommissionToDate: number;  // Bisher verdiente Provision
  projectedMonthlyCommission: number; // Nach Preiserhöhungen
}
```

---

## Provisionsberechnung - DETAILLIERT

### Grundlagen
- **Provision wird monatlich berechnet** basierend auf dem Vertrag
- **Preiserhöhungen werden angewendet** wenn:
  - Vertrag mindestens `lockInMonths` Monate existiert
  - Preiserhöhung ist gültig (validFrom ist in Vergangenheit)
  - Vertragstyp ist in `appliesToTypes`

### Szenario: Existenzgründer-Rabatt
```
Beispiel:
- Vertrag erstellt: 01.01.2024
- startDate: 01.01.2024
- rentalStartDate: 01.01.2025 (wegen founderDelayMonths: 12)
- isFounderDiscount: true

Zeitraum:
- 01.01.2024 - 31.12.2024: Keine Provision (noch nicht gestartet)
- Ab 01.01.2025: Provision beginnt

Berechnung wer monatliche Provision:
- currentMonthlyPrice = price × (1 + Σ anwendbare Preiserhöhungen)
- commission = currentMonthlyPrice × (commissionRate / 100)
```

### Szenario: Vertragsende & Post-Contract
```
Beispiel Miete:
- rentalStartDate: 01.01.2024
- endDate: 31.12.2025
- postContractMonths: 12

Zeitraum:
- 01.01.2024 - 31.12.2025: Volle Provision
- 01.01.2026 - 31.12.2026: Post-Contract Provision (50% Standard)
- Ab 01.01.2027: Keine Provision

Hinweis: Post-Contract Provision könnte volle oder reduzierte Rate sein 
(zu klären mit User - aktuell annahme: gleich wie während Laufzeit)
```

### Szenario: Exit-Auszahlung (Payout bei Ausscheiden)
```
WENN Vertrag < minContractMonthsForPayout (60 Monate):
  Auszahlung = Restliche post-Contract Monate × monatliche Provision
SONST:
  Auszahlung = 0 (Provision endet)

Beispiel:
- Vertrag läuft 40 Monate
- minContractMonthsForPayout: 60
- Noch zahlbar: 60 - 40 = 20 Monate
- Auszahlung = 20 × monatliche_provision
```

### Preiserhöhung Beispiel
```
Verträge:
1. "Office 365" - 100€/Monat - erstellt vor 24 Monaten
2. "Hosting" - 50€/Monat - erstellt vor 6 Monaten

PriceIncrease:
- validFrom: 01.06.2025
- factor: 10% 
- lockInMonths: 24
- appliesToTypes: ['rental']

Berechnung ab 01.06.2025:
- Office 365: 100 × 1.10 = 110€ (lockIn erfüllt: 24 >= 24)
- Hosting: 50€ (lockIn NICHT erfüllt: 6 < 24)
```

---

## Seiten & Features

### 1. Dashboard (Startseite)
**Route**: `/`

#### 1.1 Kundenübersicht-Tabelle
- **Spalten**:
  - Kundennummer
  - Name
  - Ort / PLZ
  - Summe Mieten (€/Monat)
  - Meine Provision (€/Monat)
  - Exit-Auszahlung (€) - wenn heute gekündigt
  - Aktionen (Bearbeiten, Löschen, Details)

- **Verhalten**:
  - Sortierung: Nach Kundennummer (default)
  - Pagination: 20 pro Seite
  - Responsive: Auf Mobile nur wichtigste Spalten

#### 1.2 Suchfilter
- Echtzeit-Filterung nach Kundenname (case-insensitive)
- Zeigt "X von Y Kunden" an

#### 1.3 Aktionen
- **Neuer Kunde**: Button oben rechts → CustomerModal
- **Kundendetails**: Link in Tabellenzeile → CustomerDetailPage
- **Kunde bearbeiten**: In CustomerDetailPage oder Modal
- **Kunde löschen**: Mit Bestätigungsdialog, kaskadiert Verträge

---

### 2. Customer Detail Seite
**Route**: `/customers/:customerId`

#### 2.1 Kopfbereich
- Kundeninfos (Name, Ort, PLZ, Kundennummer, Land)
- Edit/Delete Buttons
- Zusammenfassung:
  - Summe Mieten (€/Monat)
  - Gesamtprovision (€/Monat)
  - Bereits verdient (€)
  - Exit-Auszahlung wenn heute (€)

#### 2.2 Vertragsliste
- **Spalten**:
  - Beschreibung
  - Typ (Miete / Software-Pflege)
  - Status (aktiv / inaktiv / abgeschlossen)
  - Monatspreis (aktuell mit Erhöhungen)
  - Monatliche Provision
  - Monate laufend
  - Aktionen (Bearbeiten, Löschen, Details)

- **Filter/Sortierung**:
  - Nach Typ filterbar
  - Nach Status filterbar
  - Sortierung: Nach Startdatum (neueste oben)

#### 2.3 Vertrag hinzufügen
- Button "Neuer Vertrag" → ContractModal

---

### 3. Settings Seite
**Route**: `/settings`

#### 3.1 Allgemeine Einstellungen
- **Existenzgründer**:
  - Input: Verzögerungsmonate (Standard: 12)
  - Info-Text: "Neue Mietverträge starten dieser Anzahl Monate später"

#### 3.2 Provisionen nach Typ
- **Miete**: Input für Provisionssatz % (z.B. 10)
- **Software-Pflege**: Input für Provisionssatz %
- **Post-Contract Monate** (separater Bereich):
  - Miete: Input für Monate (Standard: 12)
  - Software-Pflege: Input für Monate (Standard: 12)

#### 3.3 Exit-Konfiguration
- **Minimale Vertragslaufzeit für volle Auszahlung**: Input (Standard: 60)
- Info-Text: "Verträge unter dieser Dauer werden bei Ausscheiden mit Restprovision ausgezahlt"

#### 3.4 Preiserhöhungen Management
- **Tabelle** mit allen Preiserhöhungen:
  - Gültig ab (Date)
  - Erhöhung (% Faktor)
  - Bestandsschutz (Monate)
  - Anwendbar auf (Typ-Checkboxen)
  - Beschreibung
  - Aktionen (Bearbeiten, Löschen)

- **Button**: "Neue Preiserhöhung" → PriceIncreaseModal
- **Modal** zum Erstellen/Bearbeiten:
  - Date Input für "Gültig ab"
  - Number Input für "Erhöhung %"
  - Number Input für "Bestandsschutz Monate"
  - Checkboxes für Typ-Anwendung
  - Text Input für Beschreibung

---

### 4. Provisions-Forecast Seite
**Route**: `/forecast`

#### 4.1 12-Monats Übersicht
- **Chart**: Balken- oder Linien-Chart mit:
  - X-Achse: Nächste 12 Monate
  - Y-Achse: Provision in €
  - Balken pro Monat zeigen:
    - Aktuelle Verträge (blau)
    - Ausfallende Verträge (rot)
    - Neu hinzukommende (grün)

#### 4.2 Tabelle
- Monat-für-Monat Aufstellung:
  - Datum
  - Provision aktuell (€)
  - Ausfälle (€)
  - Neu (€)
  - Netto (€)
  - Kumulativ (€)

#### 4.3 KPIs
- Durchschnitt nächste 12 Monate
- Höchster Monat
- Niedrigster Monat
- Trend

---

## Projektstruktur

```
contracts/
├── docker-compose.yml           # Multi-Container Setup
├── .env.example                 # Environment Template
├── README.md
│
├── frontend/
│   ├── Dockerfile               # React Build Container
│   ├── nginx.conf               # Production Webserver Config
│   ├── package.json
│   ├── vite.config.ts
│   ├── tsconfig.json
│   ├── tailwind.config.js
│   └── src/
│       ├── types/
│       │   └── index.ts         # TypeScript Interfaces
│       ├── stores/
│       │   ├── customerStore.ts
│       │   ├── contractStore.ts
│       │   └── settingsStore.ts
│       ├── services/
│       │   └── api.ts           # Axios API Client
│       ├── utils/
│       │   ├── calculations.ts  # Client-seitige Berechnungen
│       │   ├── dateUtils.ts
│       │   └── formatting.ts
│       ├── components/
│       │   ├── CustomerTable.tsx
│       │   ├── CustomerFilter.tsx
│       │   ├── CustomerModal.tsx
│       │   ├── ContractTable.tsx
│       │   ├── ContractModal.tsx
│       │   ├── PriceIncreaseModal.tsx
│       │   ├── SettingsForm.tsx
│       │   └── ForecastChart.tsx
│       ├── pages/
│       │   ├── Dashboard.tsx
│       │   ├── CustomerDetail.tsx
│       │   ├── Settings.tsx
│       │   └── Forecast.tsx
│       ├── App.tsx
│       └── main.tsx
│
└── backend/
    ├── Dockerfile               # FastAPI Container
    ├── requirements.txt
    ├── alembic.ini
    ├── .env.example
    └── app/
        ├── main.py              # FastAPI App Entry
        ├── config.py            # Konfiguration & Settings
        ├── database.py          # DB Connection & Session
        ├── models/
        │   ├── __init__.py
        │   ├── customer.py      # SQLAlchemy Models
        │   ├── contract.py
        │   ├── settings.py
        │   └── price_increase.py
        ├── schemas/
        │   ├── __init__.py
        │   ├── customer.py      # Pydantic Schemas (Request/Response)
        │   ├── contract.py
        │   ├── settings.py
        │   └── price_increase.py
        ├── routers/
        │   ├── __init__.py
        │   ├── customers.py     # Customer Endpoints
        │   ├── contracts.py     # Contract Endpoints
        │   ├── settings.py      # Settings Endpoints
        │   ├── price_increases.py
        │   └── analytics.py     # Berechnungen & Forecast
        ├── services/
        │   ├── __init__.py
        │   ├── calculations.py  # Provisionsberechnungen
        │   ├── forecast.py      # Forecast-Generator
        │   └── metrics.py       # Metriken-Berechnung
        ├── utils/
        │   ├── __init__.py
        │   └── date_utils.py    # Datum-Hilfsfunktionen
        └── migrations/          # Alembic Migrations
            └── versions/
```

---

## Provisionsberechnung - Implementierungs-Details

### Funktion: `getCurrentMonthlyPrice(contract, settings, date)`
```typescript
// Berechnet den aktuellen Preis mit allen Preiserhöhungen
// Berücksichtigt:
// 1. Alle gültigen Preiserhöhungen
// 2. Bestandsschutz (lockInMonths)
// 3. Datum der Anfrage

INPUT: Contract, Settings, Datum
OUTPUT: number (aktueller monatlicher Preis)

Pseudocode:
let currentPrice = contract.price
for each priceIncrease in settings.priceIncreases:
  if priceIncrease.validFrom <= date:
    if contract.type in priceIncrease.appliesToTypes:
      let monthsRunning = months_between(contract.rentalStartDate, date)
      if monthsRunning >= priceIncrease.lockInMonths:
        currentPrice *= (1 + priceIncrease.factor / 100)
return currentPrice
```

### Funktion: `getCurrentMonthlyCommission(contract, settings, date)`
```typescript
INPUT: Contract, Settings, Datum
OUTPUT: number (aktuelle monatliche Provision)

if contract.status !== 'active':
  return 0

let currentPrice = getCurrentMonthlyPrice(contract, settings, date)
let commissionRate = settings.commissionRates[contract.type]
let monthsSinceRentalStart = months_between(contract.rentalStartDate, date)

if monthsSinceRentalStart < 0:
  // Noch in Gründerphase
  return 0

if contract.endDate && date > contract.endDate:
  // Nach Vertragsende - prüfe postContractMonths
  let monthsAfterEnd = months_between(contract.endDate, date)
  if monthsAfterEnd <= settings.postContractMonths[contract.type]:
    return currentPrice * (commissionRate / 100)
  else:
    return 0

return currentPrice * (commissionRate / 100)
```

### Funktion: `calculateEarningsToDate(contract, settings, toDate)`
```typescript
// Addiert alle Provisionen vom Vertragsbeginn bis toDate
// Berücksichtigt alle Preiserhöhungen im Zeitraum

INPUT: Contract, Settings, Datum (bis wann)
OUTPUT: number (kumulativ verdiente Provision)

let total = 0
let currentDate = contract.rentalStartDate

while currentDate <= toDate:
  total += getCurrentMonthlyCommission(contract, settings, currentDate)
  currentDate = nextMonth(currentDate)

return total
```

### Funktion: `calculateExitPayout(contract, settings, today)`
```typescript
// Berechnet was bei Ausscheiden heute ausbezahlt würde
INPUT: Contract, Settings, heute
OUTPUT: number (Auszahlungsbetrag)

let monthsRunning = months_between(contract.rentalStartDate, today)

if contract.status === 'completed' || contract.endDate < today:
  return 0 // Vertrag bereits beendet

if monthsRunning >= settings.minContractMonthsForPayout:
  return 0 // Mindestdauer erfüllt, kein Ausgleich

let monthsRemaining = settings.minContractMonthsForPayout - monthsRunning
let monthlyCommission = getCurrentMonthlyCommission(contract, settings, today)

return monthlyCommission * monthsRemaining
```

---

## Code-Style & Conventions

### TypeScript
- **Strict Mode**: Aktiviert
- **Typen**: Vollständig annotiert, keine `any` außer Notfall
- **Interfaces**: PascalCase, keine `I` Präfixe
- **Naming**: camelCase für Variablen/Funktionen

### Komponenten
- **Functional Components** mit Hooks
- **Props**: Immer mit `interface` oder `type` typisieren
- **Exports**: Named exports für Komponenten
- **Struktur**:
  ```typescript
  interface ComponentProps {
    // props
  }
  
  const Component: React.FC<ComponentProps> = ({ prop1, prop2 }) => {
    return <div>...</div>
  }
  
  export default Component
  ```

### State Management (Zustand)
- Ein Store pro Domain (customers, contracts, settings)
- Stores kommunizieren mit Backend via API
- Struktur:
  ```typescript
  interface StoreState {
    // State
    items: Item[]
    loading: boolean
    error: string | null
    
    // Actions
    fetchItems: () => Promise<void>
    addItem: (item: Item) => Promise<void>
    updateItem: (id: string, updates: Partial<Item>) => Promise<void>
    deleteItem: (id: string) => Promise<void>
    getItem: (id: string) => Item | undefined
  }
  
  export const useStore = create<StoreState>(...)
  ```

### Backend (Python/FastAPI)
- **Models**: SQLAlchemy ORM Models für Datenbank
- **Schemas**: Pydantic Models für Validierung & Serialisierung
- **Routers**: Endpunkt-Handler (Route-Definitionen)
- **Services**: Business-Logik (Berechnungen, Komplexe Operationen)
- **Dependencies**: DB-Session, Auth (später)
- **Migrations**: Alembic für Schema-Änderungen

### Berechnungen
- Alle Provisionsberechnungen im Backend (Python)
- Backend-Services in `services/calculations.py` und `services/metrics.py`
- Frontend kann für UI-Preview einfache Berechnungen duplizieren
- Reine Funktionen (keine Side Effects)
- Testbar gestalten (Input-Output)
- Kommentieren besonders bei komplexer Logik

### Datum-Handling
- `Date` Objekte verwenden (JavaScript native)
- Hilfsfunktionen in `utils/dateUtils.ts`:
  - `addMonths(date, months): Date`
  - `monthsBetween(from, to): number`
  - `startOfMonth(date): Date`
  - `endOfMonth(date): Date`
  - `isBefore(date1, date2): boolean`
  - `isAfter(date1, date2): boolean`

### Error Handling
- Try-catch um API-Calls im Frontend
- Backend: HTTPException für Fehler
- User-freundliche Toast-Fehler im Frontend
- Console.error für Debugging
- Validierung: Pydantic im Backend, Zod/Yup im Frontend

### Performance
- Keine neuen Stores pro Komponente
- `useMemo` für teure Berechnungen (Forecast Chart)
- `useCallback` für Event Handler in großen Listen
- Lazy Load nur wenn > 100 Items

---

## Implementierungs-Roadmap

### Phase 1: Grundlagen ✅
1. ✅ Projektstruktur
2. ⬜ TypeScript Typen definieren
3. ⬜ Docker Setup (docker-compose.yml)
4. ⬜ Backend: FastAPI Grundgerüst + DB Models
5. ⬜ Frontend: Zustand Stores + API Client
6. ⬜ Backend: Provisionsberechnungs-Services

### Phase 2: Dashboard
6. ⬜ CustomerTable & CustomerFilter
7. ⬜ CustomerModal (Create/Edit)
8. ⬜ Dashboard mit Live-Daten

### Phase 3: Customer Detail & Verträge
9. ⬜ CustomerDetail Seite
10. ⬜ ContractTable & ContractModal
11. ⬜ Vertrag CRUD-Operationen
12. ⬜ Provisionsanzeige in ContractTable

### Phase 4: Settings & Erweiterte Features
13. ⬜ Settings Seite (Basiseinstellungen)
14. ⬜ PriceIncrease Management
15. ⬜ Preiserhöhungs-Logik in Berechnungen integrieren
16. ⬜ Exit-Payout-Berechnung

### Phase 5: Forecast
17. ⬜ Forecast Seite (Chart + Tabelle)
18. ⬜ 12-Monats-Daten-Generator
19. ⬜ Chart-Rendering

### Phase 6: Polish
20. ⬜ Responsive Design
21. ⬜ Dark Mode
22. ⬜ Export/Backup Features (optional)
23. ⬜ Bug Fixes & Optimierung

---

## Docker Build & Deployment (WICHTIG)

### Build-Prozess
**IMMER bei Code-Änderungen die folgende Routine:**

1. **Versionsanhebung** (PFLICHT):
   - `frontend/vite.config.ts`: `VITE_APP_VERSION` erhöhen
   - `backend/app/main.py`: Version in `GET /api/version` erhöhen
   - Format: Semantic Versioning (z.B. 1.0.2 → 1.0.3 oder 1.1.0)
   - Regel: Patch (+0.0.1) für Bugfixes, Minor (+0.1.0) für Features

2. **Multi-Platform Docker Build** (PFLICHT):
   ```bash
   docker buildx build --platform linux/amd64,linux/arm64 \
     -t bimberle/contracts-frontend:latest --push \
     -f frontend/Dockerfile frontend/

   docker buildx build --platform linux/amd64,linux/arm64 \
     -t bimberle/contracts-backend:latest --push \
     -f backend/Dockerfile backend/
   ```
   - Beide Plattformen: `linux/amd64` (Intel/AMD) + `linux/arm64` (Apple Silicon)
   - `--push` Flag: Direkt zu Docker Hub pushen
   - Nie `docker build` ohne `buildx` verwenden!

3. **Git Commit** (nach Docker Push):
   - Message Format: `Version X.Y.Z: Beschreibung der Änderungen`
   - Beispiel: `Version 1.0.3: Fix API routing issue`

4. **Verifikation**:
   - Checke dass beide Architekturen erfolgreich gepusht wurden
   - Docker Hub sollte Manifest List zeigen (nicht einzelne Images)

### Deployment auf Remote PC
- Einfach `docker-compose pull && docker-compose up -d`
- Docker wählt automatisch richtige Architektur (AMD64 oder ARM64)

---

## Wichtige Tipps für Copilot

1. **Existenzgründer-Logik**: `rentalStartDate` kann sich von `startDate` unterscheiden
2. **Preiserhöhungen sind retroaktiv**: Historische Provisionen müssen neu berechnet werden
3. **Monatliche Abrechnung**: Denke immer in kompletten Monaten, nicht Tagen
4. **Bestandsschutz**: Nur auf Monate seit `rentalStartDate` prüfen, nicht `startDate`
5. **Exit-Payout**: Nur für aktive Verträge mit Restlaufzeit < minContractMonthsForPayout
6. **Post-Contract**: Berücksichtige die Monate nach endDate korrekt
7. **Typ-Abhängig**: Commissionen und Einstellungen sind typ-spezifisch
8. **Fehlerbehandlung**: Bei Preiserhöhung alle Metriken neu berechnen (expensive!)

---

## Fragen geklärt

- ✅ Existenzgründer-Rabatt: 12 Monate Standard (pflegbar)
- ✅ Provisionen nach Typ: rental & software-care (pflegbar)
- ✅ Post-Contract Monate: Typ-spezifisch (Standard: 12, pflegbar)
- ✅ Mindestverlauf für Payout: 60 Monate (pflegbar)
- ✅ Preiserhöhungen: % Faktor mit Bestandsschutz (24 Monate Default)
- ✅ Exit-Szenario: Auszahlung bei Ausscheiden < minContractMonths
- ✅ 12-Monats-Forecast: Mit Visualisierung
- ✅ Übersicht-Seite für Kunden: Mit Exit-Payout Spalte
