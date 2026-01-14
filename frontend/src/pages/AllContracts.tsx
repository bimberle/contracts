import { useEffect, useState } from 'react';
import api from '../services/api';
import { Contract, Customer } from '../types';

interface ContractWithCustomerInfo extends Contract {
  customerName: string;
  customerName2?: string;
  plz: string;
  ort: string;
}

export default function AllContracts() {
  const [contracts, setContracts] = useState<ContractWithCustomerInfo[]>([]);
  const [filteredContracts, setFilteredContracts] = useState<ContractWithCustomerInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive' | 'completed'>('all');
  const [sortBy, setSortBy] = useState<'customer' | 'cost' | 'commission'>('customer');

  useEffect(() => {
    loadAllContracts();
  }, []);

  const loadAllContracts = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const customersData = await api.getCustomers(0, 1000);
      const customers: Customer[] = Array.isArray(customersData) ? customersData : [];

      const contractsData = await api.getContracts(0, 1000);
      const allContracts: Contract[] = Array.isArray(contractsData) ? contractsData : [];

      const contractsWithInfo: ContractWithCustomerInfo[] = allContracts.map((contract) => {
        const customer = customers.find((c) => c.id === contract.customerId);
        return {
          ...contract,
          customerName: customer?.name || 'Unbekannt',
          customerName2: customer?.name2 || '',
          plz: customer?.plz || '',
          ort: customer?.ort || '',
        };
      });

      setContracts(contractsWithInfo);
    } catch (err) {
      console.error('Failed to load contracts:', err);
      setError('Fehler beim Laden der Verträge');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let filtered = contracts;

    if (statusFilter !== 'all') {
      filtered = filtered.filter((c) => c.status === statusFilter);
    }

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter((c) =>
        c.customerName.toLowerCase().includes(term) ||
        (c.customerName2 && c.customerName2.toLowerCase().includes(term)) ||
        c.ort.toLowerCase().includes(term) ||
        c.plz.includes(term)
      );
    }

    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'customer':
          return a.customerName.localeCompare(b.customerName);
        case 'cost':
          return getTotalAmount(b) - getTotalAmount(a);
        case 'commission':
          return getCommission(b) - getCommission(a);
        default:
          return 0;
      }
    });

    setFilteredContracts(filtered);
  }, [contracts, searchTerm, statusFilter, sortBy]);

  const getTotalAmount = (contract: Contract): number => {
    return (contract.softwareRentalAmount || 0) +
      (contract.softwareCareAmount || 0) +
      (contract.appsAmount || 0) +
      (contract.purchaseAmount || 0);
  };

  const getCommission = (contract: Contract): number => {
    return getTotalAmount(contract) * 0.15;
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, JSX.Element> = {
      active: <span className="px-3 py-1 bg-green-100 text-green-800 text-sm rounded-full font-medium">Aktiv</span>,
      inactive: <span className="px-3 py-1 bg-gray-100 text-gray-800 text-sm rounded-full font-medium">Inaktiv</span>,
      completed: <span className="px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full font-medium">Abgeschlossen</span>,
    };
    return badges[status] || status;
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2,
    }).format(value);
  };

  const totalRevenue = filteredContracts.reduce((sum, c) => sum + getTotalAmount(c), 0);
  const totalCommission = filteredContracts.reduce((sum, c) => sum + getCommission(c), 0);

  if (isLoading) {
    return (
      <div className="text-center py-8">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <p className="text-gray-600 mt-2">Lade Verträge...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Alle Verträge</h1>
        <p className="text-gray-600 mt-2">Übersicht aller Kundenverträge mit Kosten und Provisionen</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <p className="text-gray-600 text-sm font-medium mb-2">Anzahl Verträge</p>
          <p className="text-3xl font-bold text-gray-900">{filteredContracts.length}</p>
          <p className="text-gray-500 text-xs mt-2">von {contracts.length} Verträgen</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <p className="text-gray-600 text-sm font-medium mb-2">Monatliche Kosten</p>
          <p className="text-3xl font-bold text-blue-600">{formatCurrency(totalRevenue)}</p>
          <p className="text-gray-500 text-xs mt-2">Gesamtumsatz/Monat</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <p className="text-gray-600 text-sm font-medium mb-2">Meine Provision</p>
          <p className="text-3xl font-bold text-green-600">{formatCurrency(totalCommission)}</p>
          <p className="text-gray-500 text-xs mt-2">Geschätzte monatliche Provision</p>
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Suchen</label>
            <input
              type="text"
              placeholder="Kunde, Ort..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Alle</option>
              <option value="active">Aktiv</option>
              <option value="inactive">Inaktiv</option>
              <option value="completed">Abgeschlossen</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Sortieren</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="customer">Kunde</option>
              <option value="cost">Kosten (absteigend)</option>
              <option value="commission">Provision (absteigend)</option>
            </select>
          </div>
        </div>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-lg">{error}</div>}

      {filteredContracts.length === 0 ? (
        <div className="bg-white p-8 rounded-lg shadow-sm border border-gray-200 text-center">
          <p className="text-gray-500">Keine Verträge gefunden</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Kundenname</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">PLZ / Ort</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Status</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-700">Monatl. Kosten</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-700">Meine Provision</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredContracts.map((contract) => (
                  <tr key={contract.id} className="hover:bg-gray-50 transition">
                    <td className="px-6 py-4 text-sm">
                      <div className="font-medium text-gray-900">{contract.customerName}</div>
                      {contract.customerName2 && <div className="text-gray-500 text-xs">{contract.customerName2}</div>}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      <div>{contract.plz}</div>
                      <div className="text-xs text-gray-500">{contract.ort}</div>
                    </td>
                    <td className="px-6 py-4 text-sm">{getStatusBadge(contract.status)}</td>
                    <td className="px-6 py-4 text-sm text-right font-semibold text-gray-900">
                      {formatCurrency(getTotalAmount(contract))}
                    </td>
                    <td className="px-6 py-4 text-sm text-right font-semibold text-green-600">
                      {formatCurrency(getCommission(contract))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 flex justify-between items-center">
        <p className="text-sm text-gray-600">{filteredContracts.length} von {contracts.length} Verträgen</p>
        <button
          onClick={loadAllContracts}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-medium"
        >
          Aktualisieren
        </button>
      </div>
    </div>
  );
}
