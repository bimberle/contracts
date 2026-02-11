import axios, { AxiosInstance, AxiosError } from 'axios';
import {
  Customer,
  Contract,
  Settings,
  PriceIncrease,
  CommissionRate,
  CalculatedMetrics,
  ApiResponse,
  Forecast,
  DashboardSummary,
  CustomerCreateRequest,
  CustomerUpdateRequest,
  ContractCreateRequest,
  ContractUpdateRequest,
  SettingsUpdateRequest,
  PriceIncreaseCreateRequest,
  PriceIncreaseUpdateRequest,
  CommissionRateCreateRequest,
  CommissionRateUpdateRequest,
} from '../types';

class ApiClient {
  private axiosInstance: AxiosInstance;

  private getBaseUrl(): string {
    // Always use the current window location origin (includes port!)
    const origin = window.location.origin;
    console.log('Using origin:', origin);
    return origin;
  }

  private buildUrl(path: string, params?: Record<string, unknown>): string {
    const origin = this.getBaseUrl();
    // Ensure path starts with /api
    let apiPath = path;
    if (!apiPath.startsWith('/api')) {
      apiPath = '/api' + (apiPath.startsWith('/') ? apiPath : '/' + apiPath);
    }
    
    let fullUrl = origin + apiPath;
    
    // Add query params if present
    if (params && Object.keys(params).length > 0) {
      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          searchParams.append(key, String(value));
        }
      });
      fullUrl += '?' + searchParams.toString();
    }
    
    console.log('API Request URL:', fullUrl);
    return fullUrl;
  }

  constructor() {
    // Create axios instance with NO baseURL - we'll provide full URLs
    this.axiosInstance = axios.create({
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Error interceptor only - URL building is done in buildUrl method
    this.axiosInstance.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        console.error('API Error:', error.message, 'URL:', error.config?.url);
        return Promise.reject(error);
      }
    );
  }

  // ==================== Version ====================

  async getBackendVersion(): Promise<{ service: string; version: string }> {
    const url = this.buildUrl('/version');
    const response = await this.axiosInstance.get<{ service: string; version: string }>(url);
    return response.data;
  }

  // ==================== System / Updates ====================

  async checkForUpdates(): Promise<{
    current_version: string;
    update_available: boolean;
    details?: Array<{
      image: string;
      local_digest: string | null;
      hub_digest: string | null;
      update_available: boolean;
    }>;
    error?: string;
  }> {
    const url = this.buildUrl('/system/version-check');
    const response = await this.axiosInstance.get(url);
    return response.data;
  }

  // ==================== Customers ====================

  async getCustomers(skip: number = 0, limit: number = 100): Promise<Customer[]> {
    const url = this.buildUrl('/customers', { skip, limit });
    const response = await this.axiosInstance.get<Customer[]>(url);
    return response.data;
  }

  async getCustomer(customerId: string): Promise<Customer> {
    const url = this.buildUrl(`/customers/${customerId}`);
    const response = await this.axiosInstance.get<Customer>(url);
    return response.data;
  }

  async createCustomer(customer: CustomerCreateRequest): Promise<Customer> {
    const url = this.buildUrl('/customers');
    const response = await this.axiosInstance.post<Customer>(url, customer);
    return response.data;
  }

  async updateCustomer(customerId: string, customer: CustomerUpdateRequest): Promise<Customer> {
    const url = this.buildUrl(`/customers/${customerId}`);
    const response = await this.axiosInstance.put<Customer>(url, customer);
    return response.data;
  }

  async deleteCustomer(customerId: string): Promise<void> {
    const url = this.buildUrl(`/customers/${customerId}`);
    await this.axiosInstance.delete(url);
  }

  async getCustomerMetrics(customerId: string): Promise<CalculatedMetrics> {
    const url = this.buildUrl(`/customers/${customerId}/metrics`);
    const response = await this.axiosInstance.get<ApiResponse<CalculatedMetrics>>(url);
    return response.data.data!;
  }

  // ==================== Contracts ====================

  async getContracts(skip: number = 0, limit: number = 100): Promise<Contract[]> {
    const url = this.buildUrl('/contracts', { skip, limit });
    const response = await this.axiosInstance.get<Contract[]>(url);
    return response.data;
  }

  async getContractsByCustomer(customerId: string): Promise<Contract[]> {
    const url = this.buildUrl(`/contracts/customer/${customerId}`);
    const response = await this.axiosInstance.get<Contract[]>(url);
    return response.data;
  }

  async getContract(contractId: string): Promise<Contract> {
    const url = this.buildUrl(`/contracts/${contractId}`);
    const response = await this.axiosInstance.get<Contract>(url);
    return response.data;
  }

  async createContract(contract: ContractCreateRequest): Promise<Contract> {
    const url = this.buildUrl('/contracts');
    const response = await this.axiosInstance.post<Contract>(url, contract);
    return response.data;
  }

  async updateContract(contractId: string, contract: ContractUpdateRequest): Promise<Contract> {
    const url = this.buildUrl(`/contracts/${contractId}`);
    const response = await this.axiosInstance.put<Contract>(url, contract);
    return response.data;
  }

  async deleteContract(contractId: string): Promise<void> {
    const url = this.buildUrl(`/contracts/${contractId}`);
    await this.axiosInstance.delete(url);
  }

  async getContractMetrics(contractId: string) {
    const url = this.buildUrl(`/contracts/${contractId}/metrics`);
    const response = await this.axiosInstance.get<ApiResponse<any>>(url);
    return response.data.data!;
  }

  // ==================== Settings ====================

  async getSettings(): Promise<Settings> {
    const url = this.buildUrl('/settings');
    const response = await this.axiosInstance.get<Settings>(url);
    return response.data;
  }

  async updateSettings(settings: SettingsUpdateRequest): Promise<Settings> {
    const url = this.buildUrl('/settings');
    const response = await this.axiosInstance.put<Settings>(url, settings);
    return response.data;
  }

  // ==================== Price Increases ====================

  async getPriceIncreases(skip: number = 0, limit: number = 100): Promise<PriceIncrease[]> {
    const url = this.buildUrl('/price-increases/', { skip, limit });
    const response = await this.axiosInstance.get<PriceIncrease[]>(url);
    return response.data;
  }

  async getPriceIncrease(priceIncreaseId: string): Promise<PriceIncrease> {
    const url = this.buildUrl(`/price-increases/${priceIncreaseId}`);
    const response = await this.axiosInstance.get<PriceIncrease>(url);
    return response.data;
  }

  async createPriceIncrease(priceIncrease: PriceIncreaseCreateRequest): Promise<PriceIncrease> {
    const url = this.buildUrl('/price-increases/');
    const response = await this.axiosInstance.post<PriceIncrease>(url, priceIncrease);
    return response.data;
  }

  async updatePriceIncrease(
    priceIncreaseId: string,
    priceIncrease: PriceIncreaseUpdateRequest
  ): Promise<PriceIncrease> {
    const url = this.buildUrl(`/price-increases/${priceIncreaseId}`);
    const response = await this.axiosInstance.put<PriceIncrease>(url, priceIncrease);
    return response.data;
  }

  async deletePriceIncrease(priceIncreaseId: string): Promise<void> {
    const url = this.buildUrl(`/price-increases/${priceIncreaseId}`);
    await this.axiosInstance.delete(url);
  }

  // ==================== Commission Rates ====================

  async getCommissionRates(): Promise<CommissionRate[]> {
    const url = this.buildUrl('/commission-rates/');
    const response = await this.axiosInstance.get<CommissionRate[]>(url);
    return response.data;
  }

  async createCommissionRate(rate: CommissionRateCreateRequest): Promise<CommissionRate> {
    const url = this.buildUrl('/commission-rates/');
    const response = await this.axiosInstance.post<CommissionRate>(url, rate);
    return response.data;
  }

  async updateCommissionRate(
    rateId: string,
    rate: CommissionRateUpdateRequest
  ): Promise<CommissionRate> {
    const url = this.buildUrl(`/commission-rates/${rateId}`);
    const response = await this.axiosInstance.put<CommissionRate>(url, rate);
    return response.data;
  }

  async deleteCommissionRate(rateId: string): Promise<void> {
    const url = this.buildUrl(`/commission-rates/${rateId}`);
    await this.axiosInstance.delete(url);
  }

  // ==================== Analytics ====================

  async getDashboard(): Promise<DashboardSummary> {
    const url = this.buildUrl('/analytics/dashboard');
    const response = await this.axiosInstance.get<ApiResponse<DashboardSummary>>(url);
    return response.data.data!;
  }

  async getForecast(months: number = 12): Promise<Forecast> {
    const url = this.buildUrl('/analytics/forecast', { months });
    const response = await this.axiosInstance.get<ApiResponse<Forecast>>(url);
    return response.data.data!;
  }

  async getCustomerAnalytics(customerId: string) {
    const url = this.buildUrl(`/analytics/customer/${customerId}`);
    const response = await this.axiosInstance.get<ApiResponse<any>>(url);
    return response.data.data!;
  }

  // ==================== Authentication ====================

  async login(password: string): Promise<{ token: string; message: string }> {
    const url = this.buildUrl('/auth/login');
    const response = await this.axiosInstance.post(url, { password });
    return response.data;
  }

  async checkAuth(): Promise<{ auth_required: boolean }> {
    const url = this.buildUrl('/auth/check');
    const response = await this.axiosInstance.get(url);
    return response.data;
  }

  setAuthToken(token: string | null) {
    if (token) {
      this.axiosInstance.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
      delete this.axiosInstance.defaults.headers.common['Authorization'];
    }
  }

  // ==================== Health ====================

  async healthCheck(): Promise<boolean> {
    try {
      const url = this.buildUrl('/health');
      const response = await this.axiosInstance.get(url);
      return response.status === 200;
    } catch {
      return false;
    }
  }
}

export default new ApiClient();
