// Timestamp type
export type ISO8601String = string; // Format: YYYY-MM-DDTHH:mm:ss

// Customer (Kunde)
export interface Customer {
  id: string; // UUID
  name: string;
  name2?: string;
  ort: string;
  plz: string;
  kundennummer: string;
  land: string;
  createdAt: ISO8601String;
  updatedAt: ISO8601String;
}

export interface CustomerCreateRequest {
  name: string;
  name2?: string;
  ort: string;
  plz: string;
  kundennummer: string;
  land: string;
}

export interface CustomerUpdateRequest {
  name?: string;
  name2?: string;
  ort?: string;
  plz?: string;
  kundennummer?: string;
  land?: string;
}

// Contract (Vertrag)
export type ContractStatus = 'active' | 'inactive' | 'completed';
export type Currency = 'EUR' | 'CHF';

export interface Contract {
  id: string; // UUID
  customerId: string;
  softwareRentalAmount: number; // Software Miete (in der gewählten Währung)
  softwareCareAmount: number;   // Software Pflege (in der gewählten Währung)
  appsAmount: number;           // Apps (in der gewählten Währung)
  purchaseAmount: number;       // Kauf Bestandsvertrag (in der gewählten Währung)
  cloudAmount: number;          // Cloudkosten (in der gewählten Währung)
  currency: Currency; // EUR oder CHF
  startDate: ISO8601String; // Mietbeginn
  endDate: ISO8601String | null; // null = unbegrenzt
  isFounderDiscount: boolean;
  numberOfSeats: number; // Anzahl Arbeitsplätze für Exit-Zahlungen Staffel
  status: ContractStatus; // Automatisch basierend auf endDate
  notes: string;
  excludedPriceIncreaseIds: string[]; // IDs der ausgeschlossenen Preiserhöhungen
  includedEarlyPriceIncreaseIds: string[]; // IDs der manuell aktivierten früheren Preiserhöhungen
  createdAt: ISO8601String;
  updatedAt: ISO8601String;
}

export interface ContractCreateRequest {
  customerId: string;
  softwareRentalAmount: number;
  softwareCareAmount: number;
  appsAmount: number;
  purchaseAmount: number;
  cloudAmount?: number;
  currency?: Currency;
  startDate: ISO8601String; // Mietbeginn
  endDate?: ISO8601String | null;
  isFounderDiscount?: boolean;
  numberOfSeats?: number;
  notes?: string;
  excludedPriceIncreaseIds?: string[];
  includedEarlyPriceIncreaseIds?: string[];
}

export interface ContractUpdateRequest {
  softwareRentalAmount?: number;
  softwareCareAmount?: number;
  appsAmount?: number;
  purchaseAmount?: number;
  cloudAmount?: number;
  currency?: Currency;
  startDate?: ISO8601String; // Mietbeginn
  endDate?: ISO8601String | null;
  isFounderDiscount?: boolean;
  numberOfSeats?: number;
  notes?: string;
  excludedPriceIncreaseIds?: string[];
  includedEarlyPriceIncreaseIds?: string[];
}

// Price Increase (Preiserhöhung)
export interface PriceIncrease {
  id: string; // UUID
  validFrom: ISO8601String; // Ab wann gültig
  amountIncreases: {
    softwareRental: number; // % Erhöhung für Software Miete
    softwareCare: number;   // % Erhöhung für Software Pflege
    apps: number;           // % Erhöhung für Apps
    purchase: number;       // % Erhöhung für Kauf Bestandsvertrag
    cloud: number;          // % Erhöhung für Cloudkosten
  };
  lockInMonths: number; // Bestandsschutz in Monaten
  description: string;
  createdAt: ISO8601String;
  updatedAt: ISO8601String;
}

export interface PriceIncreaseCreateRequest {
  validFrom: ISO8601String;
  amountIncreases: {
    softwareRental: number;
    softwareCare: number;
    apps: number;
    purchase: number;
    cloud: number;
  };
  lockInMonths?: number;
  description?: string;
}

export interface PriceIncreaseUpdateRequest {
  validFrom?: ISO8601String;
  amountIncreases?: {
    softwareRental?: number;
    softwareCare?: number;
    apps?: number;
    purchase?: number;
    cloud?: number;
  };
  lockInMonths?: number;
  description?: string;
}

// Commission Rate (Provisionsätze mit Versionierung nach Datum)
export interface CommissionRate {
  id: string; // UUID
  validFrom: ISO8601String; // Ab wann gelten diese Sätze?
  rates: {
    softwareRental: number;  // Software Miete: z.B. 20%
    softwareCare: number;    // Software Pflege: z.B. 20%
    apps: number;            // Apps: z.B. 20%
    purchase: number;        // Kauf Bestandsvertrag: z.B. 0.083333 (1/12%)
    cloud: number;           // Cloudkosten: z.B. 10%
  };
  description: string;
  createdAt: ISO8601String;
  updatedAt: ISO8601String;
}

export interface CommissionRateCreateRequest {
  validFrom: ISO8601String;
  rates: {
    softwareRental: number;
    softwareCare: number;
    apps: number;
    purchase: number;
    cloud: number;
  };
  description?: string;
}

export interface CommissionRateUpdateRequest {
  validFrom?: ISO8601String;
  rates?: {
    softwareRental?: number;
    softwareCare?: number;
    apps?: number;
    purchase?: number;
    cloud?: number;
  };
  description?: string;
}

// Settings (Allgemeine Einstellungen)
export interface PostContractMonths {
  softwareRental: number;
  softwareCare: number;
  apps: number;
  purchase: number;
}

// Exit Payout Tier (Staffel nach Arbeitsplätzen)
export interface ExitPayoutTier {
  minSeats: number;
  maxSeats: number;
  months: number;
}

// Exit Payout Type Config
export interface ExitPayoutTypeConfig {
  enabled: boolean;
  additionalMonths: number;
}

// Exit Payout By Type
export interface ExitPayoutByType {
  softwareRental: ExitPayoutTypeConfig;
  softwareCare: ExitPayoutTypeConfig;
  apps: ExitPayoutTypeConfig;
  purchase: ExitPayoutTypeConfig;
  cloud: ExitPayoutTypeConfig;
}

export interface Settings {
  id: string; // Immer 'default'
  founderDelayMonths: number; // Standard: 12
  postContractMonths: PostContractMonths;
  minContractMonthsForPayout: number; // Standard: 60
  exitPayoutTiers: ExitPayoutTier[]; // Staffel nach Arbeitsplätzen
  exitPayoutByType: ExitPayoutByType; // Konfiguration pro Vertragstyp
  personalTaxRate: number; // Persönlicher Steuersatz in %
  updatedAt: ISO8601String;
}

export interface SettingsUpdateRequest {
  founderDelayMonths?: number;
  postContractMonths?: Partial<PostContractMonths>;
  minContractMonthsForPayout?: number;
  exitPayoutTiers?: ExitPayoutTier[];
  exitPayoutByType?: Partial<ExitPayoutByType>;
  personalTaxRate?: number;
}

// Calculated Metrics (nicht persistiert)
export interface CalculatedMetrics {
  customerId: string;
  totalMonthlyRental: number; // Summe aller Basis-Beträge (€/Monat)
  totalMonthlyRevenue: number; // Mit Preiserhöhungen (€/Monat)
  totalMonthlyCommission: number; // Gesamtprovision aktuell (€/Monat)
  totalMonthlyNetIncome: number; // Netto-Einkommen (Provision nach Steuern) (€/Monat)
  totalEarned: number; // Bereits verdiente Provision (kumulativ)
  exitPayoutIfTodayInMonths: number; // Provision wenn heute gekündigt
  activeContracts: number; // Anzahl aktiver Verträge
}

// Contract with Metrics (für Anzeige)
export interface ContractWithMetrics extends Contract {
  currentMonthlyPrice: number;
  monthsRunning: number;
  isInFounderPeriod: boolean;
  currentMonthlyCommission: number;
  earnedCommissionToDate: number;
  projectedMonthlyCommission?: number;
}

// Contract Metrics (Berechnete Metriken für einen Vertrag)
export interface ContractMetrics {
  contractId: string;
  currentMonthlyPrice: number;
  monthsRunning: number;
  isInFounderPeriod: boolean;
  currentMonthlyCommission: number;
  earnedCommissionToDate: number;
  projectedMonthlyCommission: number;
  exitPayout: number;
}

// Contract with customer info and metrics (for search results)
export interface ContractWithDetails {
  id: string;
  customerId: string;
  softwareRentalAmount: number;
  softwareCareAmount: number;
  appsAmount: number;
  purchaseAmount: number;
  cloudAmount: number;
  currency: string;
  startDate: string;
  endDate: string | null;
  isFounderDiscount: boolean;
  numberOfSeats: number;
  excludedPriceIncreaseIds: string[];
  includedEarlyPriceIncreaseIds: string[];
  notes: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  // Customer info
  customerName: string;
  customerName2?: string;
  plz: string;
  ort: string;
  kundennummer?: string;
  land?: string;
  // Metrics
  currentMonthlyPrice: number;
  currentMonthlyCommission: number;
  exitPayout: number;
  monthsRunning: number;
  // Status-Infos für Existenzgründer/Zukunftsverträge
  isInFounderPeriod: boolean;      // Ob in Existenzgründer-Phase
  isFutureContract: boolean;       // Ob Vertragsstart in der Zukunft
  activeFromDate: string | null;   // Ab wann aktiv (für founder/future)
}

// Contract Search Response
export interface ContractSearchResponse {
  contracts: ContractWithDetails[];
  total: number;
  totalRevenue: number;
  totalCommission: number;
  totalExitPayout: number;
}

// Contract Search Params
export interface ContractSearchParams {
  search?: string;
  sortBy?: string;
  sortDirection?: 'asc' | 'desc';
  softwareRental?: boolean;
  softwareCare?: boolean;
  apps?: boolean;
  purchase?: boolean;
  cloud?: boolean;
  skip?: number;
  limit?: number;
}

// API Response Wrapper
export interface ApiResponse<T> {
  status: 'success' | 'error';
  data?: T;
  message?: string;
  details?: Record<string, unknown>;
}

// List Response
export interface ListResponse<T> {
  status: 'success' | 'error';
  data: T[];
  total: number;
  message?: string;
}

// Forecast Data (12-Monats Übersicht)
export interface ForecastMonth {
  date: string; // Format: YYYY-MM
  monthName: string;
  totalRevenue: number;
  totalCommission: number;
  totalNetIncome: number;
  activeContracts: number;
  endingContracts: number;
  newContracts: number;
  cumulative: number;
  cumulativeNetIncome: number;
}

export interface Forecast {
  months: ForecastMonth[];
}

// Dashboard Summary
export interface DashboardSummary {
  totalCustomers: number;
  totalMonthlyRevenue: number;
  totalMonthlyCommission: number;
  totalMonthlyNetIncome: number;
  totalExitPayout: number; // Gesamte Exit-Auszahlungen aller Kunden
  totalExitPayoutNet: number; // Nach Steuern
  totalActiveContracts: number;
  averageCommissionPerCustomer: number;
  topCustomers: Array<{
    customerId: string;
    customerName: string;
    monthlyCommission: number;
  }>;
}

// Database Configuration
export interface DatabaseInfo {
  id: string;
  name: string;
  dbName: string;
  color: string;
  isActive: boolean;
  isDemo: boolean;
  isSystem: boolean;
  createdAt?: string;
  updatedAt?: string;
}

// Backup Configuration
export interface BackupConfig {
  id: string;
  scheduleDays: string[];
  scheduleTime: string;
  maxBackups: number;
  isEnabled: boolean;
  lastBackupAt: string | null;
  lastBackupStatus: string | null;
  backupDirectory: string;
  createdAt: string;
  updatedAt: string;
}

// Backup History Item
export interface BackupHistoryItem {
  id: string;
  filename: string;
  databaseName: string;
  fileSize: number | null;
  fileSizeFormatted: string | null;
  customerCount: number | null;
  contractCount: number | null;
  appVersion: string | null;
  status: string;
  errorMessage: string | null;
  createdAt: string;
}
