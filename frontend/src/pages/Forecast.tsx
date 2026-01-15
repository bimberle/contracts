import { useEffect, useState } from 'react';
import api from '../services/api';
import { Forecast as ForecastType } from '../types';
import { formatCurrency } from '../utils/formatting';
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

  // Get current year
  const currentYear = today.getFullYear();

  // Calculate KPIs from all months - only for current year
  const currentYearMonths = forecast.months.filter(month => {
    const monthYear = parseInt(month.date.split('-')[0]);
    return monthYear === currentYear;
  });

  const totals = forecast.months.reduce(
    (acc, month) => ({
      totalRevenue: acc.totalRevenue + month.totalRevenue,
      totalCommission: acc.totalCommission + month.totalCommission,
    }),
    { totalRevenue: 0, totalCommission: 0 }
  );

  const yearlyTotals = currentYearMonths.reduce(
    (acc, month) => ({
      totalCommission: acc.totalCommission + month.totalCommission,
      totalNetIncome: acc.totalNetIncome + month.totalNetIncome,
    }),
    { totalCommission: 0, totalNetIncome: 0 }
  );

  const averageMonthlyRevenue = forecast.months.length > 0 ? totals.totalRevenue / forecast.months.length : 0;
  const averageMonthlyCommission = forecast.months.length > 0 ? totals.totalCommission / forecast.months.length : 0;
  const averageMonthlyNetIncome = forecast.months.length > 0 
    ? forecast.months.reduce((sum, m) => sum + m.totalNetIncome, 0) / forecast.months.length 
    : 0;

  const yearlyCommission = yearlyTotals.totalCommission;
  const yearlyNetIncome = yearlyTotals.totalNetIncome;

  // Prepare chart data
  const chartData = forecast.months.map(month => ({
    name: month.monthName,
    revenue: month.totalRevenue,
    provision: month.totalCommission,
    netIncome: month.totalNetIncome,
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
            <div className="mt-3 space-y-2">
              <div className="text-sm">
                <span className="text-gray-600">Umsatz:</span>
                <span className="font-bold text-blue-600 ml-1">{formatCurrency(previousMonth.totalRevenue)}</span>
              </div>
              <div className="text-sm">
                <span className="text-gray-600">Provision:</span>
                <span className="font-bold text-gray-600 ml-1">{formatCurrency(previousMonth.totalCommission)}</span>
              </div>
              <div className="text-sm">
                <span className="text-gray-600">Netto:</span>
                <span className="font-bold text-purple-600 ml-1">{formatCurrency(previousMonth.totalNetIncome)}</span>
              </div>
            </div>
            <div className="text-xs text-gray-500 mt-3">
              {previousMonth.activeContracts} aktive Verträge
            </div>
          </div>
        )}
        
        {currentMonth ? (
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg shadow-md p-6 border-l-4 border-blue-600">
            <div className="text-blue-700 text-sm font-bold">AKTUELLER MONAT</div>
            <div className="text-blue-900 text-xs mt-1">{currentMonth.monthName}</div>
            <div className="mt-3 space-y-2">
              <div className="text-sm">
                <span className="text-blue-700">Umsatz:</span>
                <span className="font-bold text-blue-600 ml-1">{formatCurrency(currentMonth.totalRevenue)}</span>
              </div>
              <div className="text-sm">
                <span className="text-blue-700">Provision:</span>
                <span className="font-bold text-blue-600 ml-1">{formatCurrency(currentMonth.totalCommission)}</span>
              </div>
              <div className="text-sm">
                <span className="text-blue-700">Netto:</span>
                <span className="font-bold text-purple-600 ml-1">{formatCurrency(currentMonth.totalNetIncome)}</span>
              </div>
            </div>
            <div className="text-xs text-blue-700 mt-3">
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
            <div className="mt-3 space-y-2">
              <div className="text-sm">
                <span className="text-gray-600">Umsatz:</span>
                <span className="font-bold text-green-600 ml-1">{formatCurrency(nextMonth.totalRevenue)}</span>
              </div>
              <div className="text-sm">
                <span className="text-gray-600">Provision:</span>
                <span className="font-bold text-green-600 ml-1">{formatCurrency(nextMonth.totalCommission)}</span>
              </div>
              <div className="text-sm">
                <span className="text-gray-600">Netto:</span>
                <span className="font-bold text-purple-600 ml-1">{formatCurrency(nextMonth.totalNetIncome)}</span>
              </div>
            </div>
            <div className="text-xs text-gray-500 mt-3">
              {nextMonth.activeContracts} aktive Verträge
            </div>
          </div>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-gray-500 text-sm font-medium">Ø Umsatz/Monat</div>
          <div className="text-3xl font-bold text-blue-600 mt-2">
            {formatCurrency(averageMonthlyRevenue)}
          </div>
          <div className="text-xs text-gray-500 mt-2">brutto</div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-gray-500 text-sm font-medium">Ø Provision/Monat</div>
          <div className="text-3xl font-bold text-green-600 mt-2">
            {formatCurrency(averageMonthlyCommission)}
          </div>
          <div className="text-xs text-gray-500 mt-2">netto</div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-gray-500 text-sm font-medium">Ø Netto-Gehalt/Monat</div>
          <div className="text-3xl font-bold text-purple-600 mt-2">
            {formatCurrency(averageMonthlyNetIncome)}
          </div>
          <div className="text-xs text-gray-500 mt-2">netto</div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-gray-500 text-sm font-medium">Jahresbrutto {currentYear}</div>
          <div className="text-3xl font-bold text-green-600 mt-2">
            {formatCurrency(yearlyCommission)}
          </div>
          <div className="text-xs text-gray-500 mt-2">brutto</div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-gray-500 text-sm font-medium">Jahresnetto {currentYear}</div>
          <div className="text-3xl font-bold text-purple-600 mt-2">
            {formatCurrency(yearlyNetIncome)}
          </div>
          <div className="text-xs text-gray-500 mt-2">netto</div>
        </div>
      </div>

      {/* Chart */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-6">Netto-Gehalt - 12-Monats-Prognose</h2>
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
              label={{ value: 'Betrag (€)', angle: -90, position: 'insideLeft' }}
              tick={{ fontSize: 12 }}
            />
            <Tooltip 
              formatter={(value: number | undefined) => value ? formatCurrency(value) : formatCurrency(0)}
              labelFormatter={(label) => `Monat: ${label}`}
              contentStyle={{ backgroundColor: '#fff', border: '1px solid #ccc', borderRadius: '4px' }}
            />
            <Legend wrapperStyle={{ paddingTop: '20px' }} />
            <Line 
              type="monotone" 
              dataKey="netIncome" 
              stroke="#a855f7" 
              strokeWidth={2}
              dot={{ fill: '#a855f7', r: 4 }}
              activeDot={{ r: 6 }}
              name="Netto-Gehalt"
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
                  Umsatz (€)
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Provision (€)
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Netto-Gehalt (€)
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
                  <td className="px-6 py-4 text-sm text-right text-blue-600 font-semibold">
                    {formatCurrency(month.totalRevenue)}
                  </td>
                  <td className="px-6 py-4 text-sm text-right text-green-600 font-semibold">
                    {formatCurrency(month.totalCommission)}
                  </td>
                  <td className="px-6 py-4 text-sm text-right text-purple-600 font-semibold">
                    {formatCurrency(month.totalNetIncome)}
                  </td>
                  <td className="px-6 py-4 text-sm text-right text-gray-900 font-semibold">
                    {formatCurrency(month.cumulative)}
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
