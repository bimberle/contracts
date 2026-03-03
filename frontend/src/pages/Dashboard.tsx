import { useEffect, useState, useCallback, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import api from '../services/api';
import { Customer, CalculatedMetrics, DashboardSummary } from '../types';
import { formatCurrency, formatCurrencyRaw } from '../utils/formatting';
import CustomerModal from '../components/CustomerModal';
import PullToRefresh from '../components/PullToRefresh';
import * as XLSX from 'xlsx';

// SessionStorage Key für Suchergebnisse
const SEARCH_STATE_KEY = 'dashboard_search_state';

interface SearchResult {
  customer: Customer;
  metrics: CalculatedMetrics;
}

interface SearchState {
  searchTerm: string;
  results: SearchResult[];
  sortBy: string;
  sortDirection: 'asc' | 'desc';
}

function Dashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [sortBy, setSortBy] = useState<'kundennummer' | 'name' | 'ort' | 'revenue' | 'commission' | 'netIncome' | 'exit'>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [hasSearched, setHasSearched] = useState(false);
  const [showingAll, setShowingAll] = useState(false);
  
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Restore search state from sessionStorage on mount
  useEffect(() => {
    const savedState = sessionStorage.getItem(SEARCH_STATE_KEY);
    if (savedState) {
      try {
        const state: SearchState = JSON.parse(savedState);
        setSearchTerm(state.searchTerm);
        setSearchResults(state.results);
        setSortBy(state.sortBy as typeof sortBy);
        setSortDirection(state.sortDirection);
        setHasSearched(state.results.length > 0 || state.searchTerm.length >= 3);
      } catch {
        // Ignore parse errors
      }
    }
    setInitialLoading(false);
  }, []);

  // Save search state to sessionStorage whenever it changes
  useEffect(() => {
    if (!initialLoading) {
      const state: SearchState = {
        searchTerm,
        results: searchResults,
        sortBy,
        sortDirection
      };
      sessionStorage.setItem(SEARCH_STATE_KEY, JSON.stringify(state));
    }
  }, [searchTerm, searchResults, sortBy, sortDirection, initialLoading]);

  // Load dashboard summary (without customers)
  const loadDashboardSummary = useCallback(async () => {
    try {
      const dashboardData = await api.getDashboard();
      setSummary(dashboardData);
      setError(null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Fehler beim Laden';
      setError(errorMessage);
    }
  }, []);

  useEffect(() => {
    loadDashboardSummary();
  }, [loadDashboardSummary]);

  // Debounced search
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // Nur ab 3 Zeichen suchen
    if (searchTerm.length >= 3) {
      setLoading(true);
      searchTimeoutRef.current = setTimeout(async () => {
        try {
          const result = await api.searchCustomers(searchTerm);
          setSearchResults(result.data);
          setHasSearched(true);
          setError(null);
        } catch (err) {
          console.error('Fehler bei der Suche:', err);
          setError('Fehler bei der Suche');
        } finally {
          setLoading(false);
        }
      }, 300);
    } else if (searchTerm.length === 0 && !showingAll) {
      // Bei leerem Suchfeld: Ergebnisse leeren (außer "Alle anzeigen" ist aktiv)
      setSearchResults([]);
      setHasSearched(false);
      setLoading(false);
    } else if (searchTerm.length > 0 && searchTerm.length < 3) {
      // 1-2 Zeichen: Ergebnisse leeren, aber warten
      setSearchResults([]);
      setHasSearched(false);
      setShowingAll(false);
      setLoading(false);
    }

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchTerm]);

  const exportToExcel = () => {
    const data = sortedResults.map(({ customer, metrics }) => ({
      'Kundennummer': customer.kundennummer,
      'Name': `${customer.name} ${customer.name2 || ''}`.trim(),
      'PLZ': customer.plz || '',
      'Ort': customer.ort || '',
      'Land': customer.land || '',
      'Mtl. Umsatz': formatCurrencyRaw(metrics.totalMonthlyRevenue),
      'Monatliche Provision': formatCurrencyRaw(metrics.totalMonthlyCommission),
      'Netto-Gehalt': formatCurrencyRaw(metrics.totalMonthlyNetIncome),
      'Exit-Auszahlung': formatCurrencyRaw(metrics.exitPayoutIfTodayInMonths),
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Kunden');
    
    ws['!cols'] = [
      { wch: 12 }, { wch: 30 }, { wch: 8 }, { wch: 20 }, { wch: 10 },
      { wch: 15 }, { wch: 18 }, { wch: 15 }, { wch: 15 },
    ];
    
    const today = new Date().toISOString().split('T')[0];
    XLSX.writeFile(wb, `Kunden_Export_${today}.xlsx`);
  };

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

  const handleRefresh = useCallback(async () => {
    await loadDashboardSummary();
    if (showingAll) {
      const result = await api.getAllCustomersWithMetrics();
      setSearchResults(result.data);
    } else if (searchTerm.length >= 3) {
      const result = await api.searchCustomers(searchTerm);
      setSearchResults(result.data);
    }
  }, [loadDashboardSummary, searchTerm, showingAll]);

  const handleShowAll = async () => {
    setLoading(true);
    setSearchTerm('');
    try {
      const result = await api.getAllCustomersWithMetrics();
      setSearchResults(result.data);
      setHasSearched(true);
      setShowingAll(true);
      setError(null);
    } catch (err) {
      console.error('Fehler beim Laden aller Kunden:', err);
      setError('Fehler beim Laden aller Kunden');
    } finally {
      setLoading(false);
    }
  };

  const handleCustomerSuccess = async () => {
    await loadDashboardSummary();
    // Nach Erstellung neuen Kunden suchen falls Suchbegriff existiert
    if (searchTerm.length >= 3) {
      const result = await api.searchCustomers(searchTerm);
      setSearchResults(result.data);
    }
    setIsCustomerModalOpen(false);
  };

  // Sorted results
  const sortedResults = [...searchResults].sort((a, b) => {
    let comparison = 0;
    
    switch (sortBy) {
      case 'kundennummer':
        comparison = a.customer.kundennummer.localeCompare(b.customer.kundennummer);
        break;
      case 'name':
        comparison = `${a.customer.name} ${a.customer.name2}`.localeCompare(`${b.customer.name} ${b.customer.name2}`);
        break;
      case 'ort':
        comparison = `${a.customer.plz} ${a.customer.ort}`.localeCompare(`${b.customer.plz} ${b.customer.ort}`);
        break;
      case 'revenue':
        comparison = (a.metrics.totalMonthlyRevenue || 0) - (b.metrics.totalMonthlyRevenue || 0);
        break;
      case 'commission':
        comparison = (a.metrics.totalMonthlyCommission || 0) - (b.metrics.totalMonthlyCommission || 0);
        break;
      case 'netIncome':
        comparison = (a.metrics.totalMonthlyNetIncome || 0) - (b.metrics.totalMonthlyNetIncome || 0);
        break;
      case 'exit':
        comparison = (a.metrics.exitPayoutIfTodayInMonths || 0) - (b.metrics.exitPayoutIfTodayInMonths || 0);
        break;
    }
    
    return sortDirection === 'asc' ? comparison : -comparison;
  });

  if (initialLoading) {
    return (
      <div className="text-center py-12">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <p className="text-gray-600 mt-4">Dashboard wird geladen...</p>
      </div>
    );
  }

  if (error && !hasSearched) {
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
      {/* Header mit Button rechts */}
      <div className="flex justify-between items-center mb-4 flex-shrink-0">
        <h1 className="text-2xl font-bold text-gray-900">Kunden</h1>
        <div className="flex gap-2">
          {searchResults.length > 0 && (
            <button
              onClick={exportToExcel}
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition font-medium text-sm flex items-center gap-2"
              title="Nach Excel exportieren"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Excel Export
            </button>
          )}
          <button
            onClick={() => setIsCustomerModalOpen(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition font-medium text-sm"
          >
            + Neuer Kunde
          </button>
        </div>
      </div>

      {/* Customers Table */}
      <div className="bg-white rounded-lg shadow flex-1 flex flex-col min-h-0">
        <div className="p-4 border-b border-gray-200 flex-shrink-0">
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Kundensuche (mind. 3 Zeichen)..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                if (e.target.value.length > 0) setShowingAll(false);
              }}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              autoFocus
            />
            <button
              onClick={handleShowAll}
              disabled={loading || showingAll}
              className={`px-4 py-2 text-sm rounded-lg transition whitespace-nowrap ${
                showingAll
                  ? 'bg-blue-100 text-blue-700 border border-blue-300'
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
              }`}
              title="Alle Kunden anzeigen"
            >
              Alle
            </button>
            {(searchTerm.length > 0 || showingAll) && (
              <button
                onClick={() => {
                  setSearchTerm('');
                  setSearchResults([]);
                  setHasSearched(false);
                  setShowingAll(false);
                }}
                className="px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition"
              >
                ✕
              </button>
            )}
          </div>
          {searchTerm.length > 0 && searchTerm.length < 3 && (
            <p className="text-xs text-gray-500 mt-2">Noch {3 - searchTerm.length} Zeichen...</p>
          )}
          {hasSearched && searchResults.length > 0 && (
            <p className="text-xs text-gray-500 mt-2">
              {showingAll ? `Alle ${searchResults.length} Kunden` : `${searchResults.length} Kunden gefunden`}
            </p>
          )}
        </div>

        <div className="overflow-auto flex-1 min-h-0">
          {/* Initial state - no search yet */}
          {!hasSearched && searchTerm.length < 3 && (
            <div className="flex flex-col items-center justify-center h-full text-gray-500">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mb-4 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <p className="text-lg font-medium">Kundensuche</p>
              <p className="text-sm">Geben Sie mindestens 3 Zeichen ein, um Kunden zu suchen</p>
            </div>
          )}

          {/* Loading */}
          {loading && (
            <div className="flex items-center justify-center h-full">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <p className="ml-3 text-gray-600">Suche...</p>
            </div>
          )}

          {/* Results table */}
          {!loading && hasSearched && (
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
                {sortedResults.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                      Keine Kunden gefunden für "{searchTerm}"
                    </td>
                  </tr>
                ) : (
                  sortedResults.map(({ customer, metrics }) => (
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
                        {formatCurrency(metrics.totalMonthlyRevenue)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-purple-600 font-semibold">
                        {formatCurrency(metrics.totalMonthlyCommission)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-green-600 font-semibold">
                        {formatCurrency(metrics.totalMonthlyNetIncome)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-green-600 font-semibold">
                        {formatCurrency(metrics.exitPayoutIfTodayInMonths)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
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
