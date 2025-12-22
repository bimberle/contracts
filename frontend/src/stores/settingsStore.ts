import { create } from 'zustand';
import { Settings, SettingsUpdateRequest, PriceIncrease, PriceIncreaseCreateRequest, PriceIncreaseUpdateRequest } from '../types';
import api from '../services/api';

interface SettingsStore {
  settings: Settings | null;
  priceIncreases: PriceIncrease[];
  loading: boolean;
  error: string | null;

  // Settings Actions
  fetchSettings: () => Promise<void>;
  updateSettings: (settings: SettingsUpdateRequest) => Promise<void>;

  // PriceIncrease Actions
  fetchPriceIncreases: (skip?: number, limit?: number) => Promise<void>;
  createPriceIncrease: (priceIncrease: PriceIncreaseCreateRequest) => Promise<void>;
  updatePriceIncrease: (id: string, priceIncrease: PriceIncreaseUpdateRequest) => Promise<void>;
  deletePriceIncrease: (id: string) => Promise<void>;

  // Utilities
  clearError: () => void;
}

export const useSettingsStore = create<SettingsStore>((set, get) => ({
  settings: null,
  priceIncreases: [],
  loading: false,
  error: null,

  fetchSettings: async () => {
    set({ loading: true, error: null });
    try {
      const settings = await api.getSettings();
      set({ settings, loading: false });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Fehler beim Laden der Einstellungen';
      set({ error: errorMessage, loading: false });
    }
  },

  updateSettings: async (settings: SettingsUpdateRequest) => {
    set({ loading: true, error: null });
    try {
      const updatedSettings = await api.updateSettings(settings);
      set({ settings: updatedSettings, loading: false });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Fehler beim Aktualisieren der Einstellungen';
      set({ error: errorMessage, loading: false });
      throw error;
    }
  },

  fetchPriceIncreases: async (skip = 0, limit = 100) => {
    set({ loading: true, error: null });
    try {
      const priceIncreases = await api.getPriceIncreases(skip, limit);
      set({ priceIncreases, loading: false });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Fehler beim Laden der Preiserhöhungen';
      set({ error: errorMessage, loading: false });
    }
  },

  createPriceIncrease: async (priceIncrease: PriceIncreaseCreateRequest) => {
    set({ loading: true, error: null });
    try {
      const newPriceIncrease = await api.createPriceIncrease(priceIncrease);
      set((state) => ({
        priceIncreases: [...state.priceIncreases, newPriceIncrease],
        loading: false,
      }));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Fehler beim Erstellen der Preiserhöhung';
      set({ error: errorMessage, loading: false });
      throw error;
    }
  },

  updatePriceIncrease: async (id: string, priceIncrease: PriceIncreaseUpdateRequest) => {
    set({ loading: true, error: null });
    try {
      const updatedPriceIncrease = await api.updatePriceIncrease(id, priceIncrease);
      set((state) => ({
        priceIncreases: state.priceIncreases.map((pi) =>
          pi.id === id ? updatedPriceIncrease : pi
        ),
        loading: false,
      }));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Fehler beim Aktualisieren der Preiserhöhung';
      set({ error: errorMessage, loading: false });
      throw error;
    }
  },

  deletePriceIncrease: async (id: string) => {
    set({ loading: true, error: null });
    try {
      await api.deletePriceIncrease(id);
      set((state) => ({
        priceIncreases: state.priceIncreases.filter((pi) => pi.id !== id),
        loading: false,
      }));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Fehler beim Löschen der Preiserhöhung';
      set({ error: errorMessage, loading: false });
      throw error;
    }
  },

  clearError: () => set({ error: null }),
}));
