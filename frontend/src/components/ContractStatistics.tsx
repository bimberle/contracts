import { useEffect, useState, useMemo } from 'react';
import api from '../services/api';
import { Forecast as ForecastType } from '../types';
import { formatCurrency } from '../utils/formatting';
import {
  BarChart,
  Bar,
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
      newCustomers: month.newCustomers || 0,
    }));
  }, [forecast]);

  // Statistics
  const stats = useMemo(() => {
    if (!forecast || forecast.months.length === 0) {
      return {
        avgActiveContracts: 0,
        totalEndingContracts: 0,
        totalNewContracts: 0,
        totalNewCustomers: 0,
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
    const totalNewCustomers = forecast.months.reduce((sum, m) => sum + (m.newCustomers || 0), 0);

    return {
      avgActiveContracts: totalActiveContracts / forecast.months.length,
      totalEndingContracts,
      totalNewContracts,
      totalNewCustomers,
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
            <Bar dataKey="newCustomers" fill="#3b82f6" name="Neue Kunden" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export default ContractStatistics;
