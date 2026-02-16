import { create } from 'zustand';
import { Customer, CustomerCreateRequest, CustomerUpdateRequest, CalculatedMetrics } from '../types';
import api from '../services/api';

interface CustomerStore {
  customers: Customer[];
  loading: boolean;
  error: string | null;
  selectedCustomer: Customer | null;
  selectedCustomerMetrics: CalculatedMetrics | null;

  // Actions
  fetchCustomers: (skip?: number, limit?: number) => Promise<void>;
  fetchCustomer: (customerId: string) => Promise<void>;
  createCustomer: (customer: CustomerCreateRequest) => Promise<Customer>;
  updateCustomer: (customerId: string, customer: CustomerUpdateRequest) => Promise<Customer>;
  deleteCustomer: (customerId: string) => Promise<void>;
  fetchCustomerMetrics: (customerId: string) => Promise<void>;
  clearError: () => void;
  setSelectedCustomer: (customer: Customer | null) => void;
}

export const useCustomerStore = create<CustomerStore>((set, get) => ({
  customers: [],
  loading: false,
  error: null,
  selectedCustomer: null,
  selectedCustomerMetrics: null,

  fetchCustomers: async (skip = 0, limit = 10000) => {
    set({ loading: true, error: null });
    try {
      const customers = await api.getCustomers(skip, limit);
      set({ customers, loading: false });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Fehler beim Laden der Kunden';
      set({ error: errorMessage, loading: false });
    }
  },

  fetchCustomer: async (customerId: string) => {
    set({ loading: true, error: null });
    try {
      const customer = await api.getCustomer(customerId);
      set({ selectedCustomer: customer, loading: false });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Fehler beim Laden des Kunden';
      set({ error: errorMessage, loading: false });
    }
  },

  createCustomer: async (customer: CustomerCreateRequest) => {
    set({ loading: true, error: null });
    try {
      const newCustomer = await api.createCustomer(customer);
      set((state) => ({
        customers: [...state.customers, newCustomer],
        loading: false,
      }));
      return newCustomer;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Fehler beim Erstellen des Kunden';
      set({ error: errorMessage, loading: false });
      throw error;
    }
  },

  updateCustomer: async (customerId: string, customer: CustomerUpdateRequest) => {
    set({ loading: true, error: null });
    try {
      const updatedCustomer = await api.updateCustomer(customerId, customer);
      set((state) => ({
        customers: state.customers.map((c) => (c.id === customerId ? updatedCustomer : c)),
        selectedCustomer:
          state.selectedCustomer?.id === customerId ? updatedCustomer : state.selectedCustomer,
        loading: false,
      }));
      return updatedCustomer;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Fehler beim Aktualisieren des Kunden';
      set({ error: errorMessage, loading: false });
      throw error;
    }
  },

  deleteCustomer: async (customerId: string) => {
    set({ loading: true, error: null });
    try {
      await api.deleteCustomer(customerId);
      set((state) => ({
        customers: state.customers.filter((c) => c.id !== customerId),
        selectedCustomer:
          state.selectedCustomer?.id === customerId ? null : state.selectedCustomer,
        loading: false,
      }));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Fehler beim Löschen des Kunden';
      set({ error: errorMessage, loading: false });
      throw error;
    }
  },

  fetchCustomerMetrics: async (customerId: string) => {
    try {
      const metrics = await api.getCustomerMetrics(customerId);
      set({ selectedCustomerMetrics: metrics });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Fehler beim Laden der Metriken';
      set({ error: errorMessage });
    }
  },

  clearError: () => set({ error: null }),
  setSelectedCustomer: (customer: Customer | null) => set({ selectedCustomer: customer }),
}));
