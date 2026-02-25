import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { useCustomerStore } from '../stores/customerStore';
import { DashboardSummary, CalculatedMetrics } from '../types';
import { formatCurrency } from '../utils/formatting';
import CustomerModal from '../components/CustomerModal';
import PullToRefresh from '../components/PullToRefresh';

function Dashboard() {
  const customers = useCustomerStore((state) => state.customers);
  const fetchCustomers = useCustomerStore((state) => state.fetchCustomers);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [customerMetrics, setCustomerMetrics] = useState<Record<string, CalculatedMetrics>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [sortBy, setSortBy] = useState<'kundennummer' | 'name' | 'ort' | 'revenue' | 'commission' | 'netIncome' | 'exit'>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const handleSort = (column: typeof sortBy) => {
    if (sortBy === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortDirection('asc');
    }
  };

  const SortHeader = ({ column, children, align = 'left' }: { column: typeof sortBy; children: React.ReactNode; align?: 'left' | 'right' }) => (
    <th
      className={`px-6 py-3 text-${align} text-xs font-semibold text-gray-700 cursor-pointer hover:bg-gray-100 select-none`}
      onClick={() => handleSort(column)}
    >
      <div className={`flex items-center gap-1 ${align === 'right' ? 'justify-end' : ''}`}>
        {children}
        {sortBy === column && (
          <span className="text-blue-600">{sortDirection === 'asc' ? '▲' : '▼'}</span>
        )}
      </div>
    </th>
  );

  const loadDashboardData = useCallback(async () => {
    try {
      await fetchCustomers();
      const dashboardData = await api.getDashboard();
      setSummary(dashboardData);
      setError(null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Fehler beim Laden der Dashboard-Daten';
      setError(errorMessage);
    }
  }, [fetchCustomers]);

  // Pull-to-Refresh Handler
  const handleRefresh = useCallback(async () => {
    await loadDashboardData();
    // Metrics werden durch den customers-Effect neu geladen
  }, [loadDashboardData]);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        await loadDashboardData();
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [fetchCustomers]);

  const handleCustomerSuccess = async () => {
    // Reload dashboard data when a customer is created/updated
    await loadDashboardData();
    setIsCustomerModalOpen(false);
  };

  // Load all customers with metrics in one optimized call
  useEffect(() => {
    const loadAllCustomersWithMetrics = async () => {
      try {
        const customersWithMetrics = await api.getCustomersWithMetrics();
        const metrics: Record<string, CalculatedMetrics> = {};
        for (const item of customersWithMetrics) {
          metrics[item.customer.id] = item.metrics;
        }
        setCustomerMetrics(metrics);
      } catch (err: unknown) {
        console.error('Fehler beim Laden der Kundenmetriken:', err);
      }
    };

    if (customers.length > 0) {
      loadAllCustomersWithMetrics();
    }
  }, [customers]);

  // Suche erst ab 3 Zeichen - oder wenn leer alle anzeigen
  const [showAllCustomers, setShowAllCustomers] = useState(true);
  
  const filteredCustomers = customers
    .filter((customer) => {
      // Wenn Suchbegriff weniger als 3 Zeichen und "Alle anzeigen" nicht aktiv: nur bei leerem Suchfeld alle zeigen
      if (searchTerm.length > 0 && searchTerm.length < 3 && !showAllCustomers) {
        return false;
      }
      // Bei leerem Suchfeld oder "Alle anzeigen": alle Kunden
      if (searchTerm.length === 0 || showAllCustomers) {
        if (searchTerm.length === 0) return true;
      }
      // Ab 3 Zeichen oder wenn "Alle anzeigen" aktiv: filtern
      const term = searchTerm.toLowerCase();
      return (
        `${customer.name} ${customer.name2}`.toLowerCase().includes(term) ||
        customer.kundennummer.toLowerCase().includes(term) ||
        (customer.ort || '').toLowerCase().includes(term) ||
        (customer.plz || '').toLowerCase().includes(term) ||
        (customer.land || '').toLowerCase().includes(term)
      );
    })
    .sort((a, b) => {
      const metricsA = customerMetrics[a.id];
      const metricsB = customerMetrics[b.id];
      let comparison = 0;
      
      switch (sortBy) {
        case 'kundennummer':
          comparison = a.kundennummer.localeCompare(b.kundennummer);
          break;
        case 'name':
          comparison = `${a.name} ${a.name2}`.localeCompare(`${b.name} ${b.name2}`);
          break;
        case 'ort':
          comparison = `${a.plz} ${a.ort}`.localeCompare(`${b.plz} ${b.ort}`);
          break;
        case 'revenue':
          comparison = (metricsA?.totalMonthlyRevenue || 0) - (metricsB?.totalMonthlyRevenue || 0);
          break;
        case 'commission':
          comparison = (metricsA?.totalMonthlyCommission || 0) - (metricsB?.totalMonthlyCommission || 0);
          break;
        case 'netIncome':
          comparison = (metricsA?.totalMonthlyNetIncome || 0) - (metricsB?.totalMonthlyNetIncome || 0);
          break;
        case 'exit':
          comparison = (metricsA?.exitPayoutIfTodayInMonths || 0) - (metricsB?.exitPayoutIfTodayInMonths || 0);
          break;
      }
      
      return sortDirection === 'asc' ? comparison : -comparison;
    });

  if (loading && !summary) {
    return (
      <div className="text-center py-12">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <p className="text-gray-600 mt-4">Dashboard wird geladen...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
        <p className="font-semibold">Fehler</p>
        <p>{error}</p>
      </div>
    );
  }

  return (
    <PullToRefresh onRefresh={handleRefresh}>
    <div className="flex flex-col h-[calc(100vh-120px)]">
      {/* Header mit Button rechts - fixed */}
      <div className="flex justify-between items-center mb-4 flex-shrink-0">
        <h1 className="text-2xl font-bold text-gray-900">Kunden</h1>
        <button
          onClick={() => setIsCustomerModalOpen(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition font-medium text-sm"
        >
          + Neuer Kunde
        </button>
      </div>

      {/* Customers Table */}
      <div className="bg-white rounded-lg shadow flex-1 flex flex-col min-h-0">
        <div className="p-4 border-b border-gray-200 flex-shrink-0">
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Mindestens 3 Zeichen eingeben..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                // Bei neuer Eingabe "Alle anzeigen" deaktivieren
                if (e.target.value.length > 0) {
                  setShowAllCustomers(false);
                } else {
                  setShowAllCustomers(true);
                }
              }}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            />
            {searchTerm.length > 0 && searchTerm.length < 3 && (
              <button
                onClick={() => setShowAllCustomers(true)}
                className="px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition whitespace-nowrap"
              >
                Alle zeigen
              </button>
            )}
            {searchTerm.length > 0 && (
              <button
                onClick={() => {
                  setSearchTerm('');
                  setShowAllCustomers(true);
                }}
                className="px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition"
              >
                ✕
              </button>
            )}
          </div>
          {searchTerm.length > 0 && searchTerm.length < 3 && !showAllCustomers && (
            <p className="text-xs text-gray-500 mt-2">Mindestens 3 Zeichen eingeben oder "Alle zeigen" klicken</p>
          )}
        </div>

        <div className="overflow-auto flex-1 min-h-0">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200 sticky top-0 z-10">
              <tr>
                <SortHeader column="kundennummer">KundenNr</SortHeader>
                <SortHeader column="name">Name</SortHeader>
                <SortHeader column="ort">PLZ / Ort</SortHeader>
                <SortHeader column="revenue" align="right">Mtl. Umsatz</SortHeader>
                <SortHeader column="commission" align="right">Monatliche Provision</SortHeader>
                <SortHeader column="netIncome" align="right">Netto-Gehalt</SortHeader>
                <SortHeader column="exit" align="right">Exit-Auszahlung</SortHeader>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                    Keine Kunden gefunden
                  </td>
                </tr>
              ) : (
                filteredCustomers.map((customer) => {
                  const metrics = customerMetrics[customer.id];
                  return (
                    <tr key={customer.id} className="hover:bg-gray-50 transition">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {customer.kundennummer}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <Link
                          to={`/customers/${customer.id}`}
                          className="text-blue-600 hover:text-blue-800 hover:underline font-medium"
                        >
                          {customer.name} {customer.name2}
                        </Link>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {customer.plz} {customer.ort}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-blue-600 font-semibold">
                        {metrics ? formatCurrency(metrics.totalMonthlyRevenue) : '—'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-purple-600 font-semibold">
                        {metrics ? formatCurrency(metrics.totalMonthlyCommission) : '—'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-green-600 font-semibold">
                        {metrics ? formatCurrency(metrics.totalMonthlyNetIncome) : '—'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-green-600 font-semibold">
                        {metrics ? formatCurrency(metrics.exitPayoutIfTodayInMonths) : '—'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <CustomerModal
        isOpen={isCustomerModalOpen}
        onClose={() => setIsCustomerModalOpen(false)}
        onSuccess={handleCustomerSuccess}
      />
    </div>
    </PullToRefresh>
  );
}

export default Dashboard;
