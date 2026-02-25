import { useState, useEffect, useCallback } from 'react';
import Forecast from './Forecast';
import ContractStatistics from '../components/ContractStatistics';
import PullToRefresh from '../components/PullToRefresh';
import api from '../services/api';
import { DashboardSummary } from '../types';
import { formatCurrency } from '../utils/formatting';

function Statistics() {
  const [activeTab, setActiveTab] = useState<'forecast' | 'contracts'>('forecast');
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [exitDate, setExitDate] = useState<string>(''); // Stichtag für Exit-Zahlungen

  const loadSummary = useCallback(async () => {
    try {
      // Lade Dashboard mit optionalem Exit-Stichtag
      const dashboardData = await api.getDashboard(exitDate || undefined);
      setSummary(dashboardData);
    } catch (err) {
      console.error('Fehler beim Laden der Übersicht:', err);
    } finally {
      setLoading(false);
    }
  }, [exitDate]);

  useEffect(() => {
    loadSummary();
  }, [loadSummary]);

  // Pull-to-Refresh Handler
  const handleRefresh = useCallback(async () => {
    await loadSummary();
  }, [loadSummary]);

  return (
    <PullToRefresh onRefresh={handleRefresh}>
    <div className="space-y-4">
      {/* Header */}
      <h1 className="text-2xl font-bold text-gray-900">Statistik</h1>

      {/* KPI Cards - kompakt */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
          <div className="bg-white rounded-lg shadow p-3">
            <div className="text-gray-500 text-xs font-medium">Kunden</div>
            <div className="text-xl font-bold text-gray-900 mt-1">{summary.totalCustomers}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-3">
            <div className="text-gray-500 text-xs font-medium">Verträge</div>
            <div className="text-xl font-bold text-gray-900 mt-1">{summary.totalActiveContracts}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-3">
            <div className="text-gray-500 text-xs font-medium">Mtl. Umsatz</div>
            <div className="text-lg font-bold text-purple-600 mt-1">
              {formatCurrency(summary.totalMonthlyRevenue)}
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-3">
            <div className="text-gray-500 text-xs font-medium">Mtl. Provision</div>
            <div className="text-lg font-bold text-purple-600 mt-1">
              {formatCurrency(summary.totalMonthlyCommission)}
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-3">
            <div className="text-gray-500 text-xs font-medium">Ø Provision/Kunde</div>
            <div className="text-lg font-bold text-purple-600 mt-1">
              {formatCurrency(summary.totalCustomers > 0 ? summary.totalMonthlyCommission / summary.totalCustomers : 0)}
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-3">
            <div className="text-gray-500 text-xs font-medium">Ø Provision/Vertrag</div>
            <div className="text-lg font-bold text-purple-600 mt-1">
              {formatCurrency(summary.totalActiveContracts > 0 ? summary.totalMonthlyCommission / summary.totalActiveContracts : 0)}
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-3">
            <div className="text-gray-500 text-xs font-medium">Mtl. Gehalt</div>
            <div className="text-lg font-bold text-green-600 mt-1">
              {formatCurrency(summary.totalMonthlyNetIncome)}
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-3">
            <div className="text-gray-500 text-xs font-medium flex items-center gap-1">
              Exit-Zahlung
              <span className="text-gray-400 text-xs cursor-help" title="Stichtag für Exit-Berechnung wählen">
                📅
              </span>
            </div>
            <div className="text-lg font-bold text-green-600 mt-1">
              {formatCurrency(summary.totalExitPayoutNet)}
            </div>
            <input
              type="date"
              value={exitDate}
              onChange={(e) => setExitDate(e.target.value)}
              className="mt-1 w-full text-xs border border-gray-200 rounded px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
              title="Stichtag für Exit-Berechnung"
            />
          </div>
        </div>
      )}

      {/* Loading Skeleton für KPI Cards */}
      {loading && !summary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="bg-white rounded-lg shadow p-3 animate-pulse">
              <div className="h-3 bg-gray-200 rounded w-16 mb-2"></div>
              <div className="h-5 bg-gray-200 rounded w-12"></div>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow border-b border-gray-200">
        <div className="flex gap-0">
          <button
            onClick={() => setActiveTab('forecast')}
            className={`flex-1 px-6 py-4 font-medium text-center transition-colors ${
              activeTab === 'forecast'
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'border-b-2 border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            Forecast
          </button>
          <button
            onClick={() => setActiveTab('contracts')}
            className={`flex-1 px-6 py-4 font-medium text-center transition-colors ${
              activeTab === 'contracts'
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'border-b-2 border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            Verträge
          </button>
        </div>
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'forecast' && <Forecast />}
        {activeTab === 'contracts' && <ContractStatistics />}
      </div>
    </div>
    </PullToRefresh>
  );
}

export default Statistics;
