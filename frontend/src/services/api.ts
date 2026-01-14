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

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

class ApiClient {
  private axiosInstance: AxiosInstance;

  constructor() {
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

  // ==================== Customers ====================

  async getCustomers(skip: number = 0, limit: number = 100): Promise<Customer[]> {
    const response = await this.axiosInstance.get<Customer[]>('/api/customers', {
      params: { skip, limit },
    });
    return response.data;
  }

  async getCustomer(customerId: string): Promise<Customer> {
    const response = await this.axiosInstance.get<Customer>(`/api/customers/${customerId}`);
    return response.data;
  }

  async createCustomer(customer: CustomerCreateRequest): Promise<Customer> {
    const response = await this.axiosInstance.post<Customer>('/api/customers', customer);
    return response.data;
  }

  async updateCustomer(customerId: string, customer: CustomerUpdateRequest): Promise<Customer> {
    const response = await this.axiosInstance.put<Customer>(
      `/api/customers/${customerId}`,
      customer
    );
    return response.data;
  }

  async deleteCustomer(customerId: string): Promise<void> {
    await this.axiosInstance.delete(`/api/customers/${customerId}`);
  }

  async getCustomerMetrics(customerId: string): Promise<CalculatedMetrics> {
    const response = await this.axiosInstance.get<ApiResponse<CalculatedMetrics>>(
      `/api/customers/${customerId}/metrics`
    );
    return response.data.data!;
  }

  // ==================== Contracts ====================

  async getContracts(skip: number = 0, limit: number = 100): Promise<Contract[]> {
    const response = await this.axiosInstance.get<Contract[]>('/api/contracts', {
      params: { skip, limit },
    });
    return response.data;
  }

  async getContractsByCustomer(customerId: string): Promise<Contract[]> {
    const response = await this.axiosInstance.get<Contract[]>(
      `/api/contracts/customer/${customerId}`
    );
    return response.data;
  }

  async getContract(contractId: string): Promise<Contract> {
    const response = await this.axiosInstance.get<Contract>(`/api/contracts/${contractId}`);
    return response.data;
  }

  async createContract(contract: ContractCreateRequest): Promise<Contract> {
    const response = await this.axiosInstance.post<Contract>('/api/contracts', contract);
    return response.data;
  }

  async updateContract(contractId: string, contract: ContractUpdateRequest): Promise<Contract> {
    const response = await this.axiosInstance.put<Contract>(
      `/api/contracts/${contractId}`,
      contract
    );
    return response.data;
  }

  async deleteContract(contractId: string): Promise<void> {
    await this.axiosInstance.delete(`/api/contracts/${contractId}`);
  }

  async getContractMetrics(contractId: string) {
    const response = await this.axiosInstance.get<ApiResponse<any>>(
      `/api/contracts/${contractId}/metrics`
    );
    return response.data.data!;
  }

  // ==================== Settings ====================

  async getSettings(): Promise<Settings> {
    const response = await this.axiosInstance.get<Settings>('/api/settings');
    return response.data;
  }

  async updateSettings(settings: SettingsUpdateRequest): Promise<Settings> {
    const response = await this.axiosInstance.put<Settings>('/api/settings', settings);
    return response.data;
  }

  // ==================== Price Increases ====================

  async getPriceIncreases(skip: number = 0, limit: number = 100): Promise<PriceIncrease[]> {
    const response = await this.axiosInstance.get<PriceIncrease[]>('/api/price-increases', {
      params: { skip, limit },
    });
    return response.data;
  }

  async getPriceIncrease(priceIncreaseId: string): Promise<PriceIncrease> {
    const response = await this.axiosInstance.get<PriceIncrease>(
      `/api/price-increases/${priceIncreaseId}`
    );
    return response.data;
  }

  async createPriceIncrease(priceIncrease: PriceIncreaseCreateRequest): Promise<PriceIncrease> {
    const response = await this.axiosInstance.post<PriceIncrease>(
      '/api/price-increases',
      priceIncrease
    );
    return response.data;
  }

  async updatePriceIncrease(
    priceIncreaseId: string,
    priceIncrease: PriceIncreaseUpdateRequest
  ): Promise<PriceIncrease> {
    const response = await this.axiosInstance.put<PriceIncrease>(
      `/api/price-increases/${priceIncreaseId}`,
      priceIncrease
    );
    return response.data;
  }

  async deletePriceIncrease(priceIncreaseId: string): Promise<void> {
    await this.axiosInstance.delete(`/api/price-increases/${priceIncreaseId}`);
  }

  // ==================== Commission Rates ====================

  async getCommissionRates(): Promise<CommissionRate[]> {
    const response = await this.axiosInstance.get<CommissionRate[]>('/api/commission-rates/');
    return response.data;
  }

  async createCommissionRate(rate: CommissionRateCreateRequest): Promise<CommissionRate> {
    const response = await this.axiosInstance.post<CommissionRate>(
      '/api/commission-rates/',
      rate
    );
    return response.data;
  }

  async updateCommissionRate(
    rateId: string,
    rate: CommissionRateUpdateRequest
  ): Promise<CommissionRate> {
    const response = await this.axiosInstance.put<CommissionRate>(
      `/api/commission-rates/${rateId}`,
      rate
    );
    return response.data;
  }

  async deleteCommissionRate(rateId: string): Promise<void> {
    await this.axiosInstance.delete(`/api/commission-rates/${rateId}`);
  }

  // ==================== Analytics ====================

  async getDashboard(): Promise<DashboardSummary> {
    const response = await this.axiosInstance.get<ApiResponse<DashboardSummary>>(
      '/api/analytics/dashboard'
    );
    return response.data.data!;
  }

  async getForecast(months: number = 12): Promise<Forecast> {
    const response = await this.axiosInstance.get<ApiResponse<Forecast>>(
      '/api/analytics/forecast',
      { params: { months } }
    );
    return response.data.data!;
  }

  async getCustomerAnalytics(customerId: string) {
    const response = await this.axiosInstance.get<ApiResponse<any>>(
      `/api/analytics/customer/${customerId}`
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
