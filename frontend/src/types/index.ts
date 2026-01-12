// Timestamp type
export type ISO8601String = string; // Format: YYYY-MM-DDTHH:mm:ss

// Customer (Kunde)
export interface Customer {
  id: string; // UUID
  name: string;
  ort: string;
  plz: string;
  kundennummer: string;
  land: string;
  createdAt: ISO8601String;
  updatedAt: ISO8601String;
}

export interface CustomerCreateRequest {
  name: string;
  ort: string;
  plz: string;
  kundennummer: string;
  land: string;
}

export interface CustomerUpdateRequest {
  name?: string;
  ort?: string;
  plz?: string;
  kundennummer?: string;
  land?: string;
}

// Contract (Vertrag)
export type ContractType = 'rental' | 'software-care';
export type ContractStatus = 'active' | 'inactive' | 'completed';

export interface Contract {
  id: string; // UUID
  customerId: string;
  title: string;
  type: ContractType;
  fixedPrice: number; // Fixer Betrag (€/Monat)
  adjustablePrice: number; // Anpassungsfähiger Betrag (€/Monat)
  currency: string; // z.B. 'EUR'
  startDate: ISO8601String; // Unterzeichnungsdatum
  rentalStartDate: ISO8601String; // Tatsächlicher Mietbeginn
  endDate: ISO8601String | null; // null = unbegrenzt
  isFounderDiscount: boolean;
  status: ContractStatus;
  notes: string;
  createdAt: ISO8601String;
  updatedAt: ISO8601String;
}

export interface ContractCreateRequest {
  customerId: string;
  title: string;
  type: ContractType;
  fixedPrice: number;
  adjustablePrice: number;
  currency?: string;
  startDate: ISO8601String;
  rentalStartDate: ISO8601String;
  endDate?: ISO8601String | null;
  isFounderDiscount?: boolean;
  status?: ContractStatus;
  notes?: string;
}

export interface ContractUpdateRequest {
  title?: string;
  type?: ContractType;
  fixedPrice?: number;
  adjustablePrice?: number;
  currency?: string;
  startDate?: ISO8601String;
  rentalStartDate?: ISO8601String;
  endDate?: ISO8601String | null;
  isFounderDiscount?: boolean;
  status?: ContractStatus;
  notes?: string;
}

// Price Increase (Preiserhöhung)
export interface PriceIncrease {
  id: string; // UUID
  validFrom: ISO8601String; // Ab wann gültig
  factor: number; // % Erhöhung (z.B. 5 für +5%)
  lockInMonths: number; // Bestandsschutz in Monaten
  appliesToTypes: ContractType[]; // Welche Vertragstypen betroffen
  description: string;
  createdAt: ISO8601String;
  updatedAt: ISO8601String;
}

export interface PriceIncreaseCreateRequest {
  validFrom: ISO8601String;
  factor: number;
  lockInMonths?: number;
  appliesToTypes: ContractType[];
  description?: string;
}

export interface PriceIncreaseUpdateRequest {
  validFrom?: ISO8601String;
  factor?: number;
  lockInMonths?: number;
  appliesToTypes?: ContractType[];
  description?: string;
}

// Settings (Allgemeine Einstellungen)
export interface CommissionRates {
  rental: number;
  'software-care': number;
}

export interface PostContractMonths {
  rental: number;
  'software-care': number;
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
