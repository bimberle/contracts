import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { useCustomerStore } from '../stores/customerStore';
import { DashboardSummary, CalculatedMetrics } from '../types';
import { formatCurrency } from '../utils/formatting';
import CustomerModal from '../components/CustomerModal';

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

  const loadDashboardData = async () => {
    try {
      await fetchCustomers();
      const dashboardData = await api.getDashboard();
      setSummary(dashboardData);
      setError(null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Fehler beim Laden der Dashboard-Daten';
      setError(errorMessage);
    }
  };

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

  // Load metrics for all customers
  useEffect(() => {
    const loadAllMetrics = async () => {
      if (customers.length === 0) return;

      const metrics: Record<string, CalculatedMetrics> = {};
      for (const customer of customers) {
        try {
          const customerMetrics = await api.getCustomerMetrics(customer.id);
          metrics[customer.id] = customerMetrics;
        } catch (err: any) {
          // Nur 404-Fehler silenzieren (Kunde wurde gelöscht), andere Fehler loggen
          if (err.response?.status === 404) {
            console.debug(`Kunde ${customer.id} nicht mehr vorhanden (wurde gelöscht)`);
          } else {
            console.error(`Fehler beim Laden der Metriken für Kunde ${customer.id}:`, err);
          }
        }
      }
      setCustomerMetrics(metrics);
    };

    loadAllMetrics();
  }, [customers]);

  const filteredCustomers = customers
    .filter(
      (customer) =>
        `${customer.name} ${customer.name2}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.kundennummer.toLowerCase().includes(searchTerm.toLowerCase())
    )
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
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-2">Übersicht aller Kunden und Verträge</p>
      </div>

      {/* KPI Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-gray-500 text-sm font-medium">Kunden</div>
            <div className="text-3xl font-bold text-gray-900 mt-2">{summary.totalCustomers}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-gray-500 text-sm font-medium">Aktive Verträge</div>
            <div className="text-3xl font-bold text-gray-900 mt-2">{summary.totalActiveContracts}</div>
          </div>
        </div>
      )}

      {/* Revenue & Commission Cards in one row */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-gray-500 text-sm font-medium">Mtl. Umsatz</div>
            <div className="text-3xl font-bold text-purple-600 mt-2">
              {formatCurrency(summary.totalMonthlyRevenue)}
            </div>
            <div className="text-xs text-gray-500 mt-2">brutto</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-gray-500 text-sm font-medium">Mtl. Provision</div>
            <div className="text-3xl font-bold text-purple-600 mt-2">
              {formatCurrency(summary.totalMonthlyCommission)}
            </div>
            <div className="text-xs text-gray-500 mt-2">brutto</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-gray-500 text-sm font-medium">Mtl. Gehalt</div>
            <div className="text-3xl font-bold text-green-600 mt-2">
              {formatCurrency(summary.totalMonthlyNetIncome)}
            </div>
            <div className="text-xs text-gray-500 mt-2">netto</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-gray-500 text-sm font-medium">Exit-Zahlung</div>
            <div className="text-3xl font-bold text-green-600 mt-2">
              {formatCurrency(summary.totalExitPayoutNet)}
            </div>
            <div className="text-xs text-gray-500 mt-2">netto</div>
          </div>
        </div>
      )}

      {/* Top Customers - ausgeblendet */}

      {/* Customers Table */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-gray-900">Kunden</h2>
            <button
              onClick={() => setIsCustomerModalOpen(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition font-medium text-sm"
            >
              + Neuer Kunde
            </button>
          </div>
          <input
            type="text"
            placeholder="Nach Name oder Kundennummer suchen..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <SortHeader column="kundennummer">KundenNr</SortHeader>
                <SortHeader column="name">Name</SortHeader>
                <SortHeader column="ort">PLZ / Ort</SortHeader>
                <SortHeader column="revenue" align="right">Mtl. Umsatz</SortHeader>
                <SortHeader column="commission" align="right">Monatliche Provision</SortHeader>
                <SortHeader column="netIncome" align="right">Netto-Gehalt</SortHeader>
                <SortHeader column="exit" align="right">Exit-Auszahlung</SortHeader>
                <th className="px-3 py-3 text-center text-xs font-medium text-gray-700">
                  🔍
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-8 text-center text-gray-500">
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
                      <td className="px-3 py-4 whitespace-nowrap text-sm text-center">
                        <Link
                          to={`/customers/${customer.id}`}
                          className="inline-flex items-center justify-center w-7 h-7 rounded hover:bg-gray-200 text-gray-600 hover:text-gray-800 transition"
                          title="Details anzeigen"
                        >
                          🔍
                        </Link>
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
  );
}

export default Dashboard;
