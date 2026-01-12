import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { useCustomerStore } from '../stores/customerStore';
import { DashboardSummary, Customer, CalculatedMetrics } from '../types';
import CustomerModal from '../components/CustomerModal';

interface CustomerWithMetrics extends Customer {
  metrics: CalculatedMetrics;
}

function Dashboard() {
  const customers = useCustomerStore((state) => state.customers);
  const fetchCustomers = useCustomerStore((state) => state.fetchCustomers);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [customerMetrics, setCustomerMetrics] = useState<Record<string, CalculatedMetrics>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);

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
        } catch (err) {
          console.error(`Fehler beim Laden der Metriken für Kunde ${customer.id}:`, err);
        }
      }
      setCustomerMetrics(metrics);
    };

    loadAllMetrics();
  }, [customers]);

  const filteredCustomers = customers.filter(
    (customer) =>
      customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.kundennummer.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-2">Übersicht aller Kunden und Verträge</p>
        </div>
        <button
          onClick={() => setIsCustomerModalOpen(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
        >
          + Neuer Kunde
        </button>
      </div>

      {/* KPI Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-gray-500 text-sm font-medium">Kunden</div>
            <div className="text-3xl font-bold text-gray-900 mt-2">{summary.totalCustomers}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-gray-500 text-sm font-medium">Aktive Verträge</div>
            <div className="text-3xl font-bold text-gray-900 mt-2">{summary.totalActiveContracts}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-gray-500 text-sm font-medium">Monatliche Provision</div>
            <div className="text-3xl font-bold text-green-600 mt-2">
              €{summary.totalMonthlyRevenue.toFixed(2)}
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-gray-500 text-sm font-medium">Ø Pro Kunde</div>
            <div className="text-3xl font-bold text-gray-900 mt-2">
              €{summary.averageCommissionPerCustomer.toFixed(2)}
            </div>
          </div>
        </div>
      )}

      {/* Top Customers */}
      {summary && summary.topCustomers.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Top Kunden</h2>
          <div className="space-y-3">
            {summary.topCustomers.map((customer) => (
              <div key={customer.customerId} className="flex justify-between items-center py-2 border-b border-gray-200 last:border-b-0">
                <div>
                  <p className="font-medium text-gray-900">{customer.customerName}</p>
                </div>
                <p className="text-green-600 font-semibold">€{customer.monthlyCommission.toFixed(2)}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Customers Table */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Kunden</h2>
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
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Kundennummer
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Ort
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Monatliche Provision
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Exit-Auszahlung
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Aktionen
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
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
                        {customer.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {customer.ort}, {customer.plz}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-green-600 font-semibold">
                        {metrics ? `€${metrics.totalMonthlyCommission.toFixed(2)}` : '—'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900 font-semibold">
                        {metrics ? `€${metrics.exitPayoutIfTodayInMonths.toFixed(2)}` : '—'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <Link
                          to={`/customers/${customer.id}`}
                          className="text-blue-600 hover:text-blue-800 transition"
                        >
                          Details
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
