import { useEffect, useState } from 'react';
import api from '../services/api';
import { Forecast as ForecastType } from '../types';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

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

  if (!forecast || forecast.months.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        Keine Forecast-Daten vorhanden
      </div>
    );
  }

  // Find current month (today)
  const today = new Date();
  const currentMonthKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  const currentMonthIndex = forecast.months.findIndex(m => m.date === currentMonthKey);
  
  // Get current, previous, and next month data
  const previousMonth = currentMonthIndex > 0 ? forecast.months[currentMonthIndex - 1] : null;
  const currentMonth = currentMonthIndex >= 0 ? forecast.months[currentMonthIndex] : null;
  const nextMonth = currentMonthIndex >= 0 && currentMonthIndex < forecast.months.length - 1 
    ? forecast.months[currentMonthIndex + 1] 
    : null;

  // Calculate KPIs from all months
  const totals = forecast.months.reduce(
    (acc, month) => ({
      total: acc.total + month.totalCommission,
      highest: Math.max(acc.highest, month.totalCommission),
      lowest: acc.lowest === Infinity ? month.totalCommission : Math.min(acc.lowest, month.totalCommission),
    }),
    { total: 0, highest: 0, lowest: Infinity }
  );

  const averageMonthly = forecast.months.length > 0 ? totals.total / forecast.months.length : 0;
  const highestMonth = totals.highest;
  const lowestMonth = totals.lowest === Infinity ? 0 : totals.lowest;
  const trend = averageMonthly > (lowestMonth + highestMonth) / 2 ? 'up' : 'down';

  // Prepare chart data
  const chartData = forecast.months.map(month => ({
    name: month.monthName,
    provision: month.totalCommission,
    date: month.date,
  }));

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

      {/* Current Month Highlights */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {previousMonth && (
          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-gray-400">
            <div className="text-gray-500 text-sm font-medium">Vorheriger Monat</div>
            <div className="text-gray-700 text-xs mt-1">{previousMonth.monthName}</div>
            <div className="text-3xl font-bold text-gray-600 mt-3">
              €{previousMonth.totalCommission.toFixed(2)}
            </div>
            <div className="text-xs text-gray-500 mt-2">
              {previousMonth.activeContracts} aktive Verträge
            </div>
          </div>
        )}
        
        {currentMonth ? (
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg shadow-md p-6 border-l-4 border-blue-600">
            <div className="text-blue-700 text-sm font-bold">AKTUELLER MONAT</div>
            <div className="text-blue-900 text-xs mt-1">{currentMonth.monthName}</div>
            <div className="text-4xl font-bold text-blue-600 mt-3">
              €{currentMonth.totalCommission.toFixed(2)}
            </div>
            <div className="text-xs text-blue-700 mt-2">
              {currentMonth.activeContracts} aktive Verträge
            </div>
          </div>
        ) : (
          <div className="bg-gray-100 rounded-lg p-6 border-l-4 border-gray-400">
            <div className="text-gray-500 text-sm font-medium">Aktueller Monat</div>
            <div className="text-gray-400 text-xs mt-1">Keine Daten</div>
          </div>
        )}
        
        {nextMonth && (
          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-green-400">
            <div className="text-gray-500 text-sm font-medium">Nächster Monat</div>
            <div className="text-gray-700 text-xs mt-1">{nextMonth.monthName}</div>
            <div className="text-3xl font-bold text-green-600 mt-3">
              €{nextMonth.totalCommission.toFixed(2)}
            </div>
            <div className="text-xs text-gray-500 mt-2">
              {nextMonth.activeContracts} aktive Verträge
            </div>
          </div>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-gray-500 text-sm font-medium">Durchschnitt</div>
          <div className="text-3xl font-bold text-gray-900 mt-2">
            €{averageMonthly.toFixed(2)}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-gray-500 text-sm font-medium">Höchster Monat</div>
          <div className="text-3xl font-bold text-green-600 mt-2">
            €{highestMonth.toFixed(2)}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-gray-500 text-sm font-medium">Niedrigster Monat</div>
          <div className="text-3xl font-bold text-orange-600 mt-2">
            €{lowestMonth.toFixed(2)}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-gray-500 text-sm font-medium">Trend</div>
          <div className="text-xl font-bold text-gray-900 mt-2 capitalize">
            {trend === 'up' ? '📈 Steigend' : trend === 'down' ? '📉 Fallend' : '➡️ Stabil'}
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-6">Provisions-Entwicklung</h2>
        <ResponsiveContainer width="100%" height={400}>
          <LineChart data={chartData} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
            <XAxis 
              dataKey="name" 
              angle={-45}
              textAnchor="end"
              height={80}
              tick={{ fontSize: 12 }}
            />
            <YAxis 
              label={{ value: 'Provision (€)', angle: -90, position: 'insideLeft' }}
              tick={{ fontSize: 12 }}
            />
            <Tooltip 
              formatter={(value: number | undefined) => value ? `€${value.toFixed(2)}` : '€0.00'}
              labelFormatter={(label) => `Monat: ${label}`}
              contentStyle={{ backgroundColor: '#fff', border: '1px solid #ccc', borderRadius: '4px' }}
            />
            <Legend wrapperStyle={{ paddingTop: '20px' }} />
            <Line 
              type="monotone" 
              dataKey="provision" 
              stroke="#2563eb" 
              strokeWidth={2}
              dot={{ fill: '#2563eb', r: 4 }}
              activeDot={{ r: 6 }}
              name="Provision"
            />
          </LineChart>
        </ResponsiveContainer>
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
                <tr 
                  key={month.date} 
                  className={`hover:bg-gray-50 transition ${month.date === currentMonthKey ? 'bg-blue-50' : ''}`}
                >
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">
                    {month.monthName}
                    {month.date === currentMonthKey && <span className="ml-2 text-xs bg-blue-200 text-blue-800 px-2 py-1 rounded">JETZT</span>}
                  </td>
                  <td className="px-6 py-4 text-sm text-right text-green-600 font-semibold">
                    €{month.totalCommission.toFixed(2)}
                  </td>
                  <td className="px-6 py-4 text-sm text-right text-gray-900 font-semibold">
                    €{month.cumulative.toFixed(2)}
                  </td>
                  <td className="px-6 py-4 text-sm text-right text-gray-900">
                    {month.activeContracts}
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
