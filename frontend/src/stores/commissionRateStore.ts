import { create } from 'zustand';
import api from '../services/api';
import { CommissionRate, CommissionRateCreateRequest, CommissionRateUpdateRequest } from '../types';

interface CommissionRateStore {
  commissionRates: CommissionRate[];
  loading: boolean;
  error: string | null;
  fetchCommissionRates: () => Promise<void>;
  createCommissionRate: (rate: CommissionRateCreateRequest) => Promise<void>;
  updateCommissionRate: (id: string, rate: CommissionRateUpdateRequest) => Promise<void>;
  deleteCommissionRate: (id: string) => Promise<void>;
}

export const useCommissionRateStore = create<CommissionRateStore>((set) => ({
  commissionRates: [],
  loading: false,
  error: null,

  fetchCommissionRates: async () => {
    set({ loading: true, error: null });
    try {
      const commissionRates = await api.getCommissionRates();
      set({ commissionRates });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch commission rates';
      set({ error: message });
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  createCommissionRate: async (rate: CommissionRateCreateRequest) => {
    set({ loading: true, error: null });
    try {
      const newRate = await api.createCommissionRate(rate);
      set((state) => ({
        commissionRates: [newRate, ...state.commissionRates],
      }));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create commission rate';
      set({ error: message });
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  updateCommissionRate: async (id: string, rate: CommissionRateUpdateRequest) => {
    set({ loading: true, error: null });
    try {
      const updatedRate = await api.updateCommissionRate(id, rate);
      set((state) => ({
        commissionRates: state.commissionRates.map((cr) => (cr.id === id ? updatedRate : cr)),
      }));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update commission rate';
      set({ error: message });
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  deleteCommissionRate: async (id: string) => {
    set({ loading: true, error: null });
    try {
      await api.deleteCommissionRate(id);
      set((state) => ({
        commissionRates: state.commissionRates.filter((cr) => cr.id !== id),
      }));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete commission rate';
      set({ error: message });
      throw error;
    } finally {
      set({ loading: false });
    }
  },
}));
