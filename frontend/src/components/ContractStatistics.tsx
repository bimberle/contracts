import { useEffect, useState, useMemo } from 'react';
import api from '../services/api';
import { Forecast as ForecastType } from '../types';
import { formatCurrency } from '../utils/formatting';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

function ContractStatistics() {
  const [forecast, setForecast] = useState<ForecastType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [chartMode, setChartMode] = useState<'revenue' | 'commission'>('revenue');

  // Get last 12 months of data
  useEffect(() => {
    const loadForecast = async () => {
      try {
        setLoading(true);
        const data = await api.getForecast(12);
        setForecast(data);
        setError(null);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Fehler beim Laden der Daten';
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    loadForecast();
  }, []);

  // Calculate active contracts trend per month
  const contractTrendData = useMemo(() => {
    if (!forecast) return [];
    
    return forecast.months.map(month => ({
      name: month.monthName,
      date: month.date,
      activeContracts: month.activeContracts,
      endingContracts: month.endingContracts,
      newContracts: month.newContracts,
    }));
  }, [forecast]);

  // Chart data for revenue/commission
  const revenueCommissionData = useMemo(() => {
    if (!forecast) return [];
    
    return forecast.months.map(month => ({
      name: month.monthName,
      date: month.date,
      Umsatz: month.totalRevenue,
      Provision: month.totalCommission,
    }));
  }, [forecast]);

  // Statistics
  const stats = useMemo(() => {
    if (!forecast || forecast.months.length === 0) {
      return {
        avgActiveContracts: 0,
        totalEndingContracts: 0,
        totalNewContracts: 0,
        totalRevenue: 0,
        avgRevenue: 0,
        totalCommission: 0,
        avgCommission: 0,
      };
    }

    const totalRevenue = forecast.months.reduce((sum, m) => sum + m.totalRevenue, 0);
    const totalCommission = forecast.months.reduce((sum, m) => sum + m.totalCommission, 0);
    const totalActiveContracts = forecast.months.reduce((sum, m) => sum + m.activeContracts, 0);
    const totalEndingContracts = forecast.months.reduce((sum, m) => sum + m.endingContracts, 0);
    const totalNewContracts = forecast.months.reduce((sum, m) => sum + m.newContracts, 0);

    return {
      avgActiveContracts: totalActiveContracts / forecast.months.length,
      totalEndingContracts,
      totalNewContracts,
      totalRevenue,
      avgRevenue: totalRevenue / forecast.months.length,
      totalCommission,
      avgCommission: totalCommission / forecast.months.length,
    };
  }, [forecast]);

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <p className="text-gray-600 mt-4">Daten werden geladen...</p>
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

  if (!forecast || forecast.months.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        Keine Daten vorhanden
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-gray-500 text-sm font-medium">Neue Verträge (12M)</div>
          <div className="text-3xl font-bold text-purple-600 mt-2">{stats.totalNewContracts}</div>
          <div className="text-xs text-gray-500 mt-2">brutto</div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-gray-500 text-sm font-medium">Ø Aktive Verträge</div>
          <div className="text-3xl font-bold text-purple-600 mt-2">{Math.round(stats.avgActiveContracts)}</div>
          <div className="text-xs text-gray-500 mt-2">brutto</div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-gray-500 text-sm font-medium">Gesamtumsatz (12M)</div>
          <div className="text-3xl font-bold text-green-600 mt-2">{formatCurrency(stats.totalRevenue)}</div>
          <div className="text-xs text-gray-500 mt-2">netto</div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-gray-500 text-sm font-medium">Gesamtprovision (12M)</div>
          <div className="text-3xl font-bold text-green-600 mt-2">{formatCurrency(stats.totalCommission)}</div>
          <div className="text-xs text-gray-500 mt-2">netto</div>
        </div>
      </div>

      {/* Chart 1: New Contracts Trend */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-6">Neue Verträge der letzten 12 Monate</h2>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={contractTrendData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="newContracts" fill="#10b981" name="Neue Verträge" />
            <Bar dataKey="endingContracts" fill="#ef4444" name="Endende Verträge" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Chart 2: Revenue/Commission with Dropdown */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-gray-900">Umsatz & Provisionen (12M)</h2>
          <select
            value={chartMode}
            onChange={(e) => setChartMode(e.target.value as 'revenue' | 'commission')}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
          >
            <option value="revenue">Umsatz</option>
            <option value="commission">Provision</option>
          </select>
        </div>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={revenueCommissionData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip formatter={(value) => formatCurrency(value as number)} />
            <Legend />
            {chartMode === 'revenue' && <Line type="monotone" dataKey="Umsatz" stroke="#3b82f6" name="Umsatz" />}
            {chartMode === 'commission' && <Line type="monotone" dataKey="Provision" stroke="#10b981" name="Provision" />}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Detailed Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-medium text-gray-600">Monat</th>
              <th className="px-6 py-3 text-right text-sm font-medium text-gray-600">Neue Verträge</th>
              <th className="px-6 py-3 text-right text-sm font-medium text-gray-600">Aktive Verträge</th>
              <th className="px-6 py-3 text-right text-sm font-medium text-gray-600">Umsatz</th>
              <th className="px-6 py-3 text-right text-sm font-medium text-gray-600">Provision</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {forecast.months.map((month, idx) => (
              <tr key={idx} className="hover:bg-gray-50">
                <td className="px-6 py-3 text-sm font-medium text-gray-900">{month.monthName}</td>
                <td className="px-6 py-3 text-sm text-right text-green-600 font-medium">{month.newContracts}</td>
                <td className="px-6 py-3 text-sm text-right text-gray-700">{month.activeContracts}</td>
                <td className="px-6 py-3 text-sm text-right text-blue-600 font-medium">{formatCurrency(month.totalRevenue)}</td>
                <td className="px-6 py-3 text-sm text-right text-green-600 font-medium">{formatCurrency(month.totalCommission)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default ContractStatistics;
