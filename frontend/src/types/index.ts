// Timestamp type
export type ISO8601String = string; // Format: YYYY-MM-DDTHH:mm:ss

// Customer (Kunde)
export interface Customer {
  id: string; // UUID
  name: string;
  name2: string;
  ort: string;
  plz: string;
  kundennummer: string;
  land: string;
  createdAt: ISO8601String;
  updatedAt: ISO8601String;
}

export interface CustomerCreateRequest {
  name: string;
  name2: string;
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

export interface Contract {
  id: string; // UUID
  customerId: string;
  softwareRentalAmount: number; // Software Miete (€/Monat)
  softwareCareAmount: number;   // Software Pflege (€/Monat)
  appsAmount: number;           // Apps (€/Monat)
  purchaseAmount: number;       // Kauf Bestandsvertrag (€/Monat)
  currency: string; // z.B. 'EUR'
  startDate: ISO8601String; // Unterzeichnungsdatum
  rentalStartDate: ISO8601String; // Tatsächlicher Mietbeginn
  endDate: ISO8601String | null; // null = unbegrenzt
  isFounderDiscount: boolean;
  status: ContractStatus; // Automatisch basierend auf endDate
  notes: string;
  createdAt: ISO8601String;
  updatedAt: ISO8601String;
}

export interface ContractCreateRequest {
  customerId: string;
  softwareRentalAmount: number;
  softwareCareAmount: number;
  appsAmount: number;
  purchaseAmount: number;
  currency?: string;
  startDate: ISO8601String;
  rentalStartDate: ISO8601String;
  endDate?: ISO8601String | null;
  isFounderDiscount?: boolean;
  notes?: string;
}

export interface ContractUpdateRequest {
  softwareRentalAmount?: number;
  softwareCareAmount?: number;
  appsAmount?: number;
  purchaseAmount?: number;
  currency?: string;
  startDate?: ISO8601String;
  rentalStartDate?: ISO8601String;
  endDate?: ISO8601String | null;
  isFounderDiscount?: boolean;
  notes?: string;
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
  };
  lockInMonths?: number;
  description?: string;
}

// Settings (Allgemeine Einstellungen)
export interface CommissionRates {
  softwareRental: number;   // Software Miete: 20%
  softwareCare: number;      // Software Pflege: 20%
  apps: number;              // Apps: 20%
  purchase: number;          // Kauf Bestandsvertrag: 1/12%
}

export interface PostContractMonths {
  softwareRental: number;
  softwareCare: number;
  apps: number;
  purchase: number;
}

export interface Settings {
  id: string; // Immer 'default'
  founderDelayMonths: number; // Standard: 12
  commissionRates: CommissionRates;
  postContractMonths: PostContractMonths;
  minContractMonthsForPayout: number; // Standard: 60
  createdAt: ISO8601String;
  updatedAt: ISO8601String;
}

export interface SettingsUpdateRequest {
  founderDelayMonths?: number;
  commissionRates?: Partial<CommissionRates>;
  postContractMonths?: Partial<PostContractMonths>;
  minContractMonthsForPayout?: number;
}

// Calculated Metrics (nicht persistiert)
export interface CalculatedMetrics {
  customerId: string;
  totalMonthlyRental: number; // Summe aller aktiven Mietverträge (€/Monat)
  totalMonthlyCommission: number; // Gesamtprovision aktuell (€/Monat)
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
  totalCommission: number;
  activeContracts: number;
  endingContracts: number;
  cumulative: number;
}

export interface Forecast {
  months: ForecastMonth[];
}

// Dashboard Summary
export interface DashboardSummary {
  totalCustomers: number;
  totalMonthlyRevenue: number;
  totalActiveContracts: number;
  averageCommissionPerCustomer: number;
  topCustomers: Array<{
    customerId: string;
    customerName: string;
    monthlyCommission: number;
  }>;
}
