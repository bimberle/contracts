import { useEffect, useState } from 'react';
import api from '../services/api';
import { Forecast as ForecastType } from '../types';

function Forecast() {
  const [forecast, setForecast] = useState<ForecastType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [months, setMonths] = useState(12);

  useEffect(() => {
    const loadForecast = async () => {
      try {
        setLoading(true);
        const data = await api.getForecast(months);
        setForecast(data);
        setError(null);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Fehler beim Laden des Forecasts';
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    loadForecast();
  }, [months]);

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <p className="text-gray-600 mt-4">Forecast wird geladen...</p>
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

  if (!forecast) {
    return (
      <div className="text-center py-12 text-gray-500">
        Keine Forecast-Daten vorhanden
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">12-Monats Provisions-Forecast</h1>
        <p className="text-gray-600 mt-2">Geplante Provisionen für die nächsten Monate</p>
      </div>

      {/* Month Selector */}
      <div className="bg-white rounded-lg shadow p-4 flex gap-4">
        <select
          value={months}
          onChange={(e) => setMonths(parseInt(e.target.value))}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
        >
          <option value={6}>6 Monate</option>
          <option value={12}>12 Monate</option>
          <option value={24}>24 Monate</option>
          <option value={36}>36 Monate</option>
        </select>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-gray-500 text-sm font-medium">Durchschnitt</div>
          <div className="text-3xl font-bold text-gray-900 mt-2">
            €{forecast.kpis.average.toFixed(2)}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-gray-500 text-sm font-medium">Höchster Monat</div>
          <div className="text-3xl font-bold text-green-600 mt-2">
            €{forecast.kpis.highest.toFixed(2)}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-gray-500 text-sm font-medium">Niedrigster Monat</div>
          <div className="text-3xl font-bold text-orange-600 mt-2">
            €{forecast.kpis.lowest.toFixed(2)}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-gray-500 text-sm font-medium">Trend</div>
          <div className="text-xl font-bold text-gray-900 mt-2 capitalize">
            {forecast.kpis.trend === 'increasing' ? '📈 Steigend' : forecast.kpis.trend === 'decreasing' ? '📉 Fallend' : '➡️ Stabil'}
          </div>
        </div>
      </div>

      {/* Chart Placeholder */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-6">Provisions-Entwicklung</h2>
        <div className="h-80 bg-gray-50 rounded-lg flex items-center justify-center text-gray-500">
          <div className="text-center">
            <p className="font-semibold mb-2">📊 Chart-Visualisierung</p>
            <p className="text-sm">Implementierung mit Recharts oder Chart.js</p>
          </div>
        </div>
      </div>

      {/* Monthly Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">Monatliche Übersicht</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Monat
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Provision (€)
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Kumulativ (€)
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Aktive Verträge
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {forecast.months.map((month) => (
                <tr key={month.date} className="hover:bg-gray-50 transition">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">
                    {month.month_name}
                  </td>
                  <td className="px-6 py-4 text-sm text-right text-green-600 font-semibold">
                    €{month.total_commission.toFixed(2)}
                  </td>
                  <td className="px-6 py-4 text-sm text-right text-gray-900 font-semibold">
                    €{month.cumulative ? month.cumulative.toFixed(2) : '—'}
                  </td>
                  <td className="px-6 py-4 text-sm text-right text-gray-900">
                    {month.active_contracts}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default Forecast;
