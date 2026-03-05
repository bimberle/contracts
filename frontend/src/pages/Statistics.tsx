import { useState, useEffect, useCallback } from 'react';
import Forecast from './Forecast';
import ContractStatistics from '../components/ContractStatistics';
import api from '../services/api';
import { DashboardSummary } from '../types';
import { formatCurrency } from '../utils/formatting';

function Statistics() {
  const [activeTab, setActiveTab] = useState<'forecast' | 'contracts'>('forecast');
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [exitDate, setExitDate] = useState<string>('');
  const [isExitModalOpen, setIsExitModalOpen] = useState(false);

  const loadSummary = useCallback(async () => {
    try {
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

  return (
    <div className="flex flex-col h-full overflow-auto gap-4">
      {/* KPI Cards - kompakt, 7 Kacheln */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
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
            <div className="text-gray-500 text-xs font-medium">Mtl. Gehalt</div>
            <div className="text-lg font-bold text-green-600 mt-1">
              {formatCurrency(summary.totalMonthlyNetIncome)}
            </div>
          </div>
          <button
            onClick={() => setIsExitModalOpen(true)}
            className="bg-white rounded-lg shadow p-3 text-left hover:bg-gray-50 transition cursor-pointer"
          >
            <div className="text-gray-500 text-xs font-medium flex items-center gap-1">
              Exit-Zahlung
              <span className="text-blue-500">➤</span>
            </div>
            <div className="text-lg font-bold text-green-600 mt-1">
              {formatCurrency(summary.totalExitPayoutNet)}
            </div>
          </button>
        </div>
      )}

      {/* Loading Skeleton */}
      {loading && !summary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
          {[...Array(7)].map((_, i) => (
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
      <div className="flex-1 min-h-0 overflow-auto">
        {activeTab === 'forecast' && <Forecast />}
        {activeTab === 'contracts' && <ContractStatistics />}
      </div>

      {/* Exit-Zahlung Modal */}
      {isExitModalOpen && summary && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md mx-4">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Exit-Zahlung berechnen</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Stichtag für Exit-Berechnung
                </label>
                <input
                  type="date"
                  value={exitDate}
                  onChange={(e) => setExitDate(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white appearance-none text-base"
                  style={{ minHeight: '44px', fontSize: '16px' }}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Leer lassen für heutiges Datum
                </p>
              </div>

              <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Exit-Zahlung (Brutto)</span>
                  <span className="font-bold text-gray-900">{formatCurrency(summary.totalExitPayout)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Exit-Zahlung (Netto)</span>
                  <span className="font-bold text-green-600 text-lg">{formatCurrency(summary.totalExitPayoutNet)}</span>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => setIsExitModalOpen(false)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
                >
                  Schließen
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Statistics;
