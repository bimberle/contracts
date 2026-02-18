import { useEffect, useState, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import * as XLSX from 'xlsx';
import api from '../services/api';
import { ContractWithDetails } from '../types';
import ContractModal from '../components/ContractModal';
import PullToRefresh from '../components/PullToRefresh';

export default function AllContracts() {
  const [contracts, setContracts] = useState<ContractWithDetails[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [totalCommission, setTotalCommission] = useState(0);
  const [totalExitPayout, setTotalExitPayout] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<string>('customer');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [selectedContract, setSelectedContract] = useState<ContractWithDetails | null>(null);
  const [isContractModalOpen, setIsContractModalOpen] = useState(false);
  const [amountTypeFilters, setAmountTypeFilters] = useState({
    softwareRental: true,
    softwareCare: true,
    apps: true,
    purchase: true,
    cloud: true,
  });
  
  // Debounce search term
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    searchTimeoutRef.current = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300); // 300ms debounce
    
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchTerm]);

  const loadContracts = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const result = await api.searchContracts({
        search: debouncedSearchTerm,
        sortBy,
        sortDirection,
        softwareRental: amountTypeFilters.softwareRental,
        softwareCare: amountTypeFilters.softwareCare,
        apps: amountTypeFilters.apps,
        purchase: amountTypeFilters.purchase,
        cloud: amountTypeFilters.cloud,
      });

      setContracts(result.contracts);
      setTotalCount(result.total);
      setTotalRevenue(result.totalRevenue);
      setTotalCommission(result.totalCommission);
      setTotalExitPayout(result.totalExitPayout);
    } catch (err) {
      console.error('Failed to load contracts:', err);
      setError('Fehler beim Laden der Verträge');
    } finally {
      setIsLoading(false);
    }
  }, [debouncedSearchTerm, sortBy, sortDirection, amountTypeFilters]);

  // Initial load and reload on filter changes
  useEffect(() => {
    loadContracts();
  }, [loadContracts]);

  // Pull-to-Refresh Handler
  const handleRefresh = useCallback(async () => {
    await loadContracts();
  }, [loadContracts]);

  // Vertrag löschen
  const handleDeleteContract = async (contract: ContractWithDetails) => {
    if (!confirm(`Vertrag von "${contract.customerName}" wirklich löschen?`)) {
      return;
    }
    try {
      await api.deleteContract(contract.id);
      loadContracts();
    } catch (err) {
      console.error('Fehler beim Löschen des Vertrags:', err);
      alert('Fehler beim Löschen des Vertrags');
    }
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, JSX.Element> = {
      active: <span className="px-3 py-1 bg-green-100 text-green-800 text-sm rounded-full font-medium">Aktiv</span>,
      inactive: <span className="px-3 py-1 bg-gray-100 text-gray-800 text-sm rounded-full font-medium">Inaktiv</span>,
      completed: <span className="px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full font-medium">Abgeschlossen</span>,
    };
    return badges[status] || status;
  };

  // Sortier-Handler für Spaltenköpfe
  const handleSort = (column: typeof sortBy) => {
    if (sortBy === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortDirection('asc');
    }
  };

  // Sortierbare Spaltenüberschrift Komponente
  const SortHeader = ({ column, children, align = 'left' }: { column: typeof sortBy; children: React.ReactNode; align?: 'left' | 'right' | 'center' }) => (
    <th
      onClick={() => handleSort(column)}
      className={`px-6 py-3 text-${align} text-xs font-semibold text-gray-700 cursor-pointer hover:bg-gray-100 select-none`}
    >
      <div className={`flex items-center gap-1 ${align === 'right' ? 'justify-end' : align === 'center' ? 'justify-center' : ''}`}>
        {children}
        {sortBy === column && (
          <span className="text-blue-600">{sortDirection === 'asc' ? '▲' : '▼'}</span>
        )}
      </div>
    </th>
  );

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2,
    }).format(value);
  };

  const handleEditContract = (contract: ContractWithDetails) => {
    setSelectedContract(contract);
    setIsContractModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsContractModalOpen(false);
    setSelectedContract(null);
  };

  const handleExportToExcel = () => {
    // Prepare data for export - alle Daten kommen vom Backend
    const exportData: Array<Record<string, unknown>> = contracts.map((contract) => {
      return {
        'Kundenname': contract.customerName,
        'Name 2': contract.customerName2 || '',
        'PLZ': contract.plz,
        'Ort': contract.ort,
        'Status': contract.status,
        'Software Miete': contract.softwareRentalAmount || 0,
        'Software Pflege': contract.softwareCareAmount || 0,
        'Apps': contract.appsAmount || 0,
        'Bestand': contract.purchaseAmount || 0,
        'Gesamtbetrag': contract.currentMonthlyPrice,
        'Provision': contract.currentMonthlyCommission,
        'Exit-Zahlung': contract.exitPayout,
        'Startdatum': contract.startDate ? contract.startDate.split('T')[0] : '',
      };
    });

    // Add summary row
    exportData.push({
      'Kundenname': 'GESAMT',
      'Name 2': '',
      'PLZ': '',
      'Ort': '',
      'Status': '',
      'Software Miete': 0,
      'Software Pflege': 0,
      'Apps': 0,
      'Bestand': 0,
      'Gesamtbetrag': totalRevenue,
      'Provision': totalCommission,
      'Exit-Zahlung': totalExitPayout,
      'Startdatum': '',
    });

    // Create workbook and worksheet
    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Verträge');

    // Set column widths
    worksheet['!cols'] = [
      { wch: 20 },
      { wch: 20 },
      { wch: 8 },
      { wch: 15 },
      { wch: 12 },
      { wch: 15 },
      { wch: 15 },
      { wch: 10 },
      { wch: 12 },
      { wch: 15 },
      { wch: 12 },
      { wch: 12 },
    ];

    // Generate filename with current date
    const today = new Date().toISOString().split('T')[0];
    const filename = `Verträge_${today}.xlsx`;

    // Download file
    XLSX.writeFile(workbook, filename);
  };

  if (isLoading) {
    return (
      <div className="text-center py-8">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <p className="text-gray-600 mt-2">Lade Verträge...</p>
      </div>
    );
  }

  return (
    <PullToRefresh onRefresh={handleRefresh}>
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start gap-2">
        <h1 className="text-2xl font-bold text-gray-900">Verträge</h1>
        <button
          onClick={handleExportToExcel}
          className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-medium flex items-center gap-2 whitespace-nowrap"
          title="Als Excel exportieren"
        >
          📊 Excel
        </button>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <p className="text-gray-600 text-xs font-medium mb-1">Verträge</p>
          <p className="text-xl font-bold text-gray-900">{contracts.length}<span className="text-sm text-gray-500 font-normal">/{totalCount}</span></p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <p className="text-gray-600 text-xs font-medium mb-1">Mtl. Umsatz</p>
          <p className="text-xl font-bold text-purple-600">{formatCurrency(totalRevenue)}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <p className="text-gray-600 text-xs font-medium mb-1">Ø Umsatz/Vertrag</p>
          <p className="text-xl font-bold text-purple-600">{formatCurrency(contracts.length > 0 ? totalRevenue / contracts.length : 0)}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <p className="text-gray-600 text-xs font-medium mb-1">Ø Provision/Vertrag</p>
          <p className="text-xl font-bold text-green-600">{formatCurrency(contracts.length > 0 ? totalCommission / contracts.length : 0)}</p>
        </div>
      </div>

      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 space-y-3">
        <input
          type="text"
          placeholder="Kunde, Ort..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />

        {/* Amount Type Filters */}
        <div className="border-t border-gray-200 pt-3">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={amountTypeFilters.softwareRental}
                onChange={(e) => setAmountTypeFilters({...amountTypeFilters, softwareRental: e.target.checked})}
                className="rounded border-gray-300"
              />
              <span className="text-sm text-gray-700">Software Miete</span>
            </label>
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={amountTypeFilters.softwareCare}
                onChange={(e) => setAmountTypeFilters({...amountTypeFilters, softwareCare: e.target.checked})}
                className="rounded border-gray-300"
              />
              <span className="text-sm text-gray-700">Software Pflege</span>
            </label>
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={amountTypeFilters.apps}
                onChange={(e) => setAmountTypeFilters({...amountTypeFilters, apps: e.target.checked})}
                className="rounded border-gray-300"
              />
              <span className="text-sm text-gray-700">Apps</span>
            </label>
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={amountTypeFilters.purchase}
                onChange={(e) => setAmountTypeFilters({...amountTypeFilters, purchase: e.target.checked})}
                className="rounded border-gray-300"
              />
              <span className="text-sm text-gray-700">Softwarepflege Kauf</span>
            </label>
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={amountTypeFilters.cloud}
                onChange={(e) => setAmountTypeFilters({...amountTypeFilters, cloud: e.target.checked})}
                className="rounded border-gray-300"
              />
              <span className="text-sm text-gray-700">Cloudkosten</span>
            </label>
          </div>
        </div>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-lg">{error}</div>}

      {contracts.length === 0 ? (
        <div className="bg-white p-8 rounded-lg shadow-sm border border-gray-200 text-center">
          <p className="text-gray-500">Keine Verträge gefunden</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <SortHeader column="customer">Kundenname</SortHeader>
                  <SortHeader column="plz">PLZ / Ort</SortHeader>
                  <SortHeader column="softwareRental" align="right">Software Miete</SortHeader>
                  <SortHeader column="softwareCare" align="right">Software Pflege</SortHeader>
                  <SortHeader column="apps" align="right">Apps</SortHeader>
                  <SortHeader column="purchase" align="right">Bestand</SortHeader>
                  <SortHeader column="cloud" align="right">Cloud</SortHeader>
                  <SortHeader column="total" align="right">Gesamt</SortHeader>
                  <SortHeader column="commission" align="right">Provision</SortHeader>
                  <SortHeader column="exit" align="right">Exit-Zahlung</SortHeader>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700">Aktionen</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {contracts.map((contract) => (
                  <tr key={contract.id} className="hover:bg-gray-50 transition">
                    <td className="px-6 py-4 text-sm">
                      <Link
                        to={`/customers/${contract.customerId}`}
                        className="font-medium text-blue-600 hover:text-blue-800 hover:underline"
                      >
                        {contract.customerName}
                      </Link>
                      {contract.customerName2 && <div className="text-gray-500 text-xs">{contract.customerName2}</div>}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      <div>{contract.plz}</div>
                      <div className="text-xs text-gray-500">{contract.ort}</div>
                    </td>
                    <td className="px-6 py-4 text-sm text-right text-gray-900">
                      {formatCurrency(contract.softwareRentalAmount || 0)}
                    </td>
                    <td className="px-6 py-4 text-sm text-right text-gray-900">
                      {formatCurrency(contract.softwareCareAmount || 0)}
                    </td>
                    <td className="px-6 py-4 text-sm text-right text-gray-900">
                      {formatCurrency(contract.appsAmount || 0)}
                    </td>
                    <td className="px-6 py-4 text-sm text-right text-gray-900">
                      {formatCurrency(contract.purchaseAmount || 0)}
                    </td>
                    <td className="px-6 py-4 text-sm text-right text-gray-900">
                      {formatCurrency(contract.cloudAmount || 0)}
                    </td>
                    <td className="px-6 py-4 text-sm text-right font-semibold text-purple-600">
                      {formatCurrency(contract.currentMonthlyPrice)}
                    </td>
                    <td className="px-6 py-4 text-sm text-right font-semibold text-green-600">
                      {formatCurrency(contract.currentMonthlyCommission)}
                    </td>
                    <td className="px-6 py-4 text-sm text-right font-semibold text-orange-600">
                      {formatCurrency(contract.exitPayout)}
                    </td>
                    <td className="px-3 py-4 text-sm text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1">
                        <Link
                          to={`/customers/${contract.customerId}`}
                          className="inline-flex items-center justify-center w-7 h-7 rounded hover:bg-blue-100 text-blue-600 hover:text-blue-800 transition"
                          title="Zum Kunden"
                        >
                          👤
                        </Link>
                        <button
                          onClick={() => handleEditContract(contract)}
                          className="inline-flex items-center justify-center w-7 h-7 rounded hover:bg-gray-300 text-gray-600 hover:text-gray-800 transition"
                          title="Vertrag anschauen"
                        >
                          🔍
                        </button>
                        <button
                          onClick={() => handleDeleteContract(contract)}
                          className="inline-flex items-center justify-center w-7 h-7 rounded hover:bg-red-100 text-red-600 hover:text-red-800 transition"
                          title="Vertrag löschen"
                        >
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 flex justify-between items-center">
        <p className="text-sm text-gray-600">{contracts.length} von {totalCount} Verträgen</p>
        <button
          onClick={loadContracts}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-medium"
        >
          Aktualisieren
        </button>
      </div>

      {/* Contract Modal */}
      <ContractModal
        isOpen={isContractModalOpen}
        onClose={handleCloseModal}
        contract={selectedContract ? {
          ...selectedContract,
          currency: selectedContract.currency as 'EUR' | 'CHF',
          status: selectedContract.status as 'active' | 'inactive' | 'completed'
        } : null}
        customerId={selectedContract?.customerId || ''}
        onSuccess={() => {
          handleCloseModal();
          loadContracts();
        }}
      />
    </div>
    </PullToRefresh>
  );
}
