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

  constructor() {
    // Use explicit origin to ensure requests go to the same host:port as the page
    // This must be evaluated in the constructor, not at module load time
    const API_URL = `${window.location.origin}/api`;
    console.log('API Client initialized with baseURL:', API_URL);
    
    this.axiosInstance = axios.create({
      baseURL: API_URL,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Error interceptor
    this.axiosInstance.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        console.error('API Error:', error.message);
        return Promise.reject(error);
      }
    );
  }

  // ==================== Version ====================

  async getBackendVersion(): Promise<{ service: string; version: string }> {
    const response = await this.axiosInstance.get<{ service: string; version: string }>('/version');
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
    const response = await this.axiosInstance.get('/system/version-check');
    return response.data;
  }

  // ==================== Customers ====================

  async getCustomers(skip: number = 0, limit: number = 100): Promise<Customer[]> {
    const response = await this.axiosInstance.get<Customer[]>('/customers', {
      params: { skip, limit },
    });
    return response.data;
  }

  async getCustomer(customerId: string): Promise<Customer> {
    const response = await this.axiosInstance.get<Customer>(`/customers/${customerId}`);
    return response.data;
  }

  async createCustomer(customer: CustomerCreateRequest): Promise<Customer> {
    const response = await this.axiosInstance.post<Customer>('/customers', customer);
    return response.data;
  }

  async updateCustomer(customerId: string, customer: CustomerUpdateRequest): Promise<Customer> {
    const response = await this.axiosInstance.put<Customer>(
      `/customers/${customerId}`,
      customer
    );
    return response.data;
  }

  async deleteCustomer(customerId: string): Promise<void> {
    await this.axiosInstance.delete(`/customers/${customerId}`);
  }

  async getCustomerMetrics(customerId: string): Promise<CalculatedMetrics> {
    const response = await this.axiosInstance.get<ApiResponse<CalculatedMetrics>>(
      `/customers/${customerId}/metrics`
    );
    return response.data.data!;
  }

  // ==================== Contracts ====================

  async getContracts(skip: number = 0, limit: number = 100): Promise<Contract[]> {
    const response = await this.axiosInstance.get<Contract[]>('/contracts', {
      params: { skip, limit },
    });
    return response.data;
  }

  async getContractsByCustomer(customerId: string): Promise<Contract[]> {
    const response = await this.axiosInstance.get<Contract[]>(
      `/contracts/customer/${customerId}`
    );
    return response.data;
  }

  async getContract(contractId: string): Promise<Contract> {
    const response = await this.axiosInstance.get<Contract>(`/contracts/${contractId}`);
    return response.data;
  }

  async createContract(contract: ContractCreateRequest): Promise<Contract> {
    const response = await this.axiosInstance.post<Contract>('/contracts', contract);
    return response.data;
  }

  async updateContract(contractId: string, contract: ContractUpdateRequest): Promise<Contract> {
    const response = await this.axiosInstance.put<Contract>(
      `/contracts/${contractId}`,
      contract
    );
    return response.data;
  }

  async deleteContract(contractId: string): Promise<void> {
    await this.axiosInstance.delete(`/contracts/${contractId}`);
  }

  async getContractMetrics(contractId: string) {
    const response = await this.axiosInstance.get<ApiResponse<any>>(
      `/contracts/${contractId}/metrics`
    );
    return response.data.data!;
  }

  // ==================== Settings ====================

  async getSettings(): Promise<Settings> {
    const response = await this.axiosInstance.get<Settings>('/settings');
    return response.data;
  }

  async updateSettings(settings: SettingsUpdateRequest): Promise<Settings> {
    const response = await this.axiosInstance.put<Settings>('/settings', settings);
    return response.data;
  }

  // ==================== Price Increases ====================

  async getPriceIncreases(skip: number = 0, limit: number = 100): Promise<PriceIncrease[]> {
    const response = await this.axiosInstance.get<PriceIncrease[]>('/price-increases/', {
      params: { skip, limit },
    });
    return response.data;
  }

  async getPriceIncrease(priceIncreaseId: string): Promise<PriceIncrease> {
    const response = await this.axiosInstance.get<PriceIncrease>(
      `/price-increases/${priceIncreaseId}`
    );
    return response.data;
  }

  async createPriceIncrease(priceIncrease: PriceIncreaseCreateRequest): Promise<PriceIncrease> {
    const response = await this.axiosInstance.post<PriceIncrease>(
      '/price-increases/',
      priceIncrease
    );
    return response.data;
  }

  async updatePriceIncrease(
    priceIncreaseId: string,
    priceIncrease: PriceIncreaseUpdateRequest
  ): Promise<PriceIncrease> {
    const response = await this.axiosInstance.put<PriceIncrease>(
      `/price-increases/${priceIncreaseId}`,
      priceIncrease
    );
    return response.data;
  }

  async deletePriceIncrease(priceIncreaseId: string): Promise<void> {
    await this.axiosInstance.delete(`/price-increases/${priceIncreaseId}`);
  }

  // ==================== Commission Rates ====================

  async getCommissionRates(): Promise<CommissionRate[]> {
    const response = await this.axiosInstance.get<CommissionRate[]>('/commission-rates/');
    return response.data;
  }

  async createCommissionRate(rate: CommissionRateCreateRequest): Promise<CommissionRate> {
    const response = await this.axiosInstance.post<CommissionRate>(
      '/commission-rates/',
      rate
    );
    return response.data;
  }

  async updateCommissionRate(
    rateId: string,
    rate: CommissionRateUpdateRequest
  ): Promise<CommissionRate> {
    const response = await this.axiosInstance.put<CommissionRate>(
      `/commission-rates/${rateId}`,
      rate
    );
    return response.data;
  }

  async deleteCommissionRate(rateId: string): Promise<void> {
    await this.axiosInstance.delete(`/commission-rates/${rateId}`);
  }

  // ==================== Analytics ====================

  async getDashboard(): Promise<DashboardSummary> {
    const response = await this.axiosInstance.get<ApiResponse<DashboardSummary>>(
      '/analytics/dashboard'
    );
    return response.data.data!;
  }

  async getForecast(months: number = 12): Promise<Forecast> {
    const response = await this.axiosInstance.get<ApiResponse<Forecast>>(
      '/analytics/forecast',
      { params: { months } }
    );
    return response.data.data!;
  }

  async getCustomerAnalytics(customerId: string) {
    const response = await this.axiosInstance.get<ApiResponse<any>>(
      `/analytics/customer/${customerId}`
    );
    return response.data.data!;
  }

  // ==================== Authentication ====================

  async login(password: string): Promise<{ token: string; message: string }> {
    const response = await this.axiosInstance.post('/auth/login', { password });
    return response.data;
  }

  async checkAuth(): Promise<{ auth_required: boolean }> {
    const response = await this.axiosInstance.get('/auth/check');
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
      const response = await this.axiosInstance.get('/health');
      return response.status === 200;
    } catch {
      return false;
    }
  }
}

export default new ApiClient();
