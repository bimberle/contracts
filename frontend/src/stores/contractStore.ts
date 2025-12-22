import { create } from 'zustand';
import { Contract, ContractCreateRequest, ContractUpdateRequest } from '../types';
import api from '../services/api';

interface ContractStore {
  contracts: Contract[];
  contractsByCustomer: Record<string, Contract[]>;
  loading: boolean;
  error: string | null;
  selectedContract: Contract | null;

  // Actions
  fetchContracts: (skip?: number, limit?: number) => Promise<void>;
  fetchContractsByCustomer: (customerId: string) => Promise<void>;
  fetchContract: (contractId: string) => Promise<void>;
  createContract: (contract: ContractCreateRequest) => Promise<Contract>;
  updateContract: (contractId: string, contract: ContractUpdateRequest) => Promise<Contract>;
  deleteContract: (contractId: string) => Promise<void>;
  clearError: () => void;
  setSelectedContract: (contract: Contract | null) => void;
}

export const useContractStore = create<ContractStore>((set, get) => ({
  contracts: [],
  contractsByCustomer: {},
  loading: false,
  error: null,
  selectedContract: null,

  fetchContracts: async (skip = 0, limit = 100) => {
    set({ loading: true, error: null });
    try {
      const contracts = await api.getContracts(skip, limit);
      set({ contracts, loading: false });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Fehler beim Laden der Verträge';
      set({ error: errorMessage, loading: false });
    }
  },

  fetchContractsByCustomer: async (customerId: string) => {
    set({ loading: true, error: null });
    try {
      const contracts = await api.getContractsByCustomer(customerId);
      set((state) => ({
        contractsByCustomer: {
          ...state.contractsByCustomer,
          [customerId]: contracts,
        },
        loading: false,
      }));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Fehler beim Laden der Verträge';
      set({ error: errorMessage, loading: false });
    }
  },

  fetchContract: async (contractId: string) => {
    set({ loading: true, error: null });
    try {
      const contract = await api.getContract(contractId);
      set({ selectedContract: contract, loading: false });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Fehler beim Laden des Vertrags';
      set({ error: errorMessage, loading: false });
    }
  },

  createContract: async (contract: ContractCreateRequest) => {
    set({ loading: true, error: null });
    try {
      const newContract = await api.createContract(contract);
      set((state) => {
        const customerId = contract.customer_id;
        return {
          contracts: [...state.contracts, newContract],
          contractsByCustomer: {
            ...state.contractsByCustomer,
            [customerId]: [...(state.contractsByCustomer[customerId] || []), newContract],
          },
          loading: false,
        };
      });
      return newContract;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Fehler beim Erstellen des Vertrags';
      set({ error: errorMessage, loading: false });
      throw error;
    }
  },

  updateContract: async (contractId: string, contract: ContractUpdateRequest) => {
    set({ loading: true, error: null });
    try {
      const updatedContract = await api.updateContract(contractId, contract);
      set((state) => ({
        contracts: state.contracts.map((c) => (c.id === contractId ? updatedContract : c)),
        contractsByCustomer: {
          ...state.contractsByCustomer,
          ...(state.selectedContract && {
            [state.selectedContract.customer_id]: state.contractsByCustomer[
              state.selectedContract.customer_id
            ].map((c) => (c.id === contractId ? updatedContract : c)),
          }),
        },
        selectedContract:
          state.selectedContract?.id === contractId ? updatedContract : state.selectedContract,
        loading: false,
      }));
      return updatedContract;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Fehler beim Aktualisieren des Vertrags';
      set({ error: errorMessage, loading: false });
      throw error;
    }
  },

  deleteContract: async (contractId: string) => {
    set({ loading: true, error: null });
    try {
      await api.deleteContract(contractId);
      set((state) => ({
        contracts: state.contracts.filter((c) => c.id !== contractId),
        contractsByCustomer: {
          ...Object.fromEntries(
            Object.entries(state.contractsByCustomer).map(([customerId, contracts]) => [
              customerId,
              contracts.filter((c) => c.id !== contractId),
            ])
          ),
        },
        selectedContract:
          state.selectedContract?.id === contractId ? null : state.selectedContract,
        loading: false,
      }));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Fehler beim Löschen des Vertrags';
      set({ error: errorMessage, loading: false });
      throw error;
    }
  },

  clearError: () => set({ error: null }),
  setSelectedContract: (contract: Contract | null) => set({ selectedContract: contract }),
}));
