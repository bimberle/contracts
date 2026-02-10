import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import * as XLSX from 'xlsx';
import api from '../services/api';
import { Contract, Customer, ContractMetrics } from '../types';
import ContractModal from '../components/ContractModal';

interface ContractWithCustomerInfo extends Contract {
  customerName: string;
  customerName2?: string;
  plz: string;
  ort: string;
  customerId: string;
  kundennummer?: string;
  land?: string;
}

export default function AllContracts() {
  const [contracts, setContracts] = useState<ContractWithCustomerInfo[]>([]);
  const [filteredContracts, setFilteredContracts] = useState<ContractWithCustomerInfo[]>([]);
  const [contractMetrics, setContractMetrics] = useState<Record<string, ContractMetrics>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'customer' | 'plz' | 'status' | 'softwareRental' | 'softwareCare' | 'apps' | 'purchase' | 'cloud' | 'total' | 'commission' | 'exit'>('customer');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [selectedContract, setSelectedContract] = useState<ContractWithCustomerInfo | null>(null);
  const [isContractModalOpen, setIsContractModalOpen] = useState(false);
  const [amountTypeFilters, setAmountTypeFilters] = useState({
    softwareRental: true,
    softwareCare: true,
    apps: true,
    purchase: true,
    cloud: true,
  });

  useEffect(() => {
    loadAllContracts();
  }, []);

  const loadAllContracts = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const customersData = await api.getCustomers(0, 1000);
      const customers: Customer[] = Array.isArray(customersData) ? customersData : [];

      const contractsData = await api.getContracts(0, 1000);
      const allContracts: Contract[] = Array.isArray(contractsData) ? contractsData : [];

      const contractsWithInfo: ContractWithCustomerInfo[] = allContracts.map((contract) => {
        const customer = customers.find((c) => c.id === contract.customerId);
        return {
          ...contract,
          customerName: customer?.name || 'Unbekannt',
          customerName2: customer?.name2 || '',
          plz: customer?.plz || '',
          ort: customer?.ort || '',
          kundennummer: customer?.kundennummer || '',
          land: customer?.land || '',
        };
      });

      setContracts(contractsWithInfo);

      // Lade Metriken für jeden Vertrag
      const metricsMap: Record<string, ContractMetrics> = {};
      const metricsPromises = contractsWithInfo.map(contract =>
        api.getContractMetrics(contract.id)
          .then(m => {
            metricsMap[contract.id] = m;
          })
          .catch((err: any) => {
            // Nur 404-Fehler silenzieren (Vertrag wurde gelöscht), andere Fehler loggen
            if (err.response?.status === 404) {
              console.debug(`Vertrag ${contract.id} nicht mehr vorhanden (wurde gelöscht)`);
            } else {
              console.warn(`Fehler beim Laden der Metriken für Vertrag ${contract.id}:`, err);
            }
          })
      );
      await Promise.all(metricsPromises);
      setContractMetrics(metricsMap);
    } catch (err) {
      console.error('Failed to load contracts:', err);
      setError('Fehler beim Laden der Verträge');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let filtered = contracts;

    // Filter by amount types - wenn ALLE Filter aktiv sind, zeige alle Verträge
    // Ansonsten zeige nur Verträge, die mindestens einen ausgewählten Typ mit > 0 haben
    const allFiltersActive = amountTypeFilters.softwareRental && 
                              amountTypeFilters.softwareCare && 
                              amountTypeFilters.apps && 
                              amountTypeFilters.purchase &&
                              amountTypeFilters.cloud;
    
    if (!allFiltersActive) {
      filtered = filtered.filter((c) => {
        if (amountTypeFilters.softwareRental && c.softwareRentalAmount > 0) return true;
        if (amountTypeFilters.softwareCare && c.softwareCareAmount > 0) return true;
        if (amountTypeFilters.apps && c.appsAmount > 0) return true;
        if (amountTypeFilters.purchase && c.purchaseAmount > 0) return true;
        if (amountTypeFilters.cloud && (c.cloudAmount || 0) > 0) return true;
        return false;
      });
    }

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter((c) =>
        c.customerName.toLowerCase().includes(term) ||
        (c.customerName2 && c.customerName2.toLowerCase().includes(term)) ||
        c.ort.toLowerCase().includes(term) ||
        c.plz.includes(term) ||
        (c.kundennummer && c.kundennummer.toLowerCase().includes(term)) ||
        (c.land && c.land.toLowerCase().includes(term))
      );
    }

    filtered.sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case 'customer':
          comparison = a.customerName.localeCompare(b.customerName);
          break;
        case 'plz':
          comparison = (a.plz || '').localeCompare(b.plz || '');
          break;
        case 'status':
          comparison = a.status.localeCompare(b.status);
          break;
        case 'softwareRental':
          comparison = (a.softwareRentalAmount || 0) - (b.softwareRentalAmount || 0);
          break;
        case 'softwareCare':
          comparison = (a.softwareCareAmount || 0) - (b.softwareCareAmount || 0);
          break;
        case 'apps':
          comparison = (a.appsAmount || 0) - (b.appsAmount || 0);
          break;
        case 'purchase':
          comparison = (a.purchaseAmount || 0) - (b.purchaseAmount || 0);
          break;
        case 'cloud':
          comparison = (a.cloudAmount || 0) - (b.cloudAmount || 0);
          break;
        case 'total':
          comparison = getTotalAmount(a) - getTotalAmount(b);
          break;
        case 'commission':
          const commA = contractMetrics[a.id]?.currentMonthlyCommission || 0;
          const commB = contractMetrics[b.id]?.currentMonthlyCommission || 0;
          comparison = commA - commB;
          break;
        case 'exit':
          const exitA = contractMetrics[a.id]?.exitPayout || 0;
          const exitB = contractMetrics[b.id]?.exitPayout || 0;
          comparison = exitA - exitB;
          break;
        default:
          comparison = 0;
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });

    setFilteredContracts(filtered);
  }, [contracts, searchTerm, sortBy, sortDirection, amountTypeFilters, contractMetrics]);

  const getTotalAmount = (contract: Contract): number => {
    return (contract.softwareRentalAmount || 0) +
      (contract.softwareCareAmount || 0) +
      (contract.appsAmount || 0) +
      (contract.purchaseAmount || 0) +
      (contract.cloudAmount || 0);
  };

  // Verwende echte Metriken statt statischer Berechnung
  const getCommission = (contract: Contract): number => {
    return contractMetrics[contract.id]?.currentMonthlyCommission || 0;
  };

  // Vertrag löschen
  const handleDeleteContract = async (contract: ContractWithCustomerInfo) => {
    if (!confirm(`Vertrag von "${contract.customerName}" wirklich löschen?`)) {
      return;
    }
    try {
      await api.deleteContract(contract.id);
      loadAllContracts();
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

  const handleEditContract = (contract: ContractWithCustomerInfo) => {
    setSelectedContract(contract);
    setIsContractModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsContractModalOpen(false);
    setSelectedContract(null);
  };

  const handleExportToExcel = () => {
    // Prepare data for export - verwende echte Metriken
    const exportData: Array<Record<string, unknown>> = filteredContracts.map((contract) => {
      const metrics = contractMetrics[contract.id];
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
        'Gesamtbetrag': metrics?.currentMonthlyPrice || getTotalAmount(contract),
        'Provision': metrics?.currentMonthlyCommission || 0,
        'Exit-Zahlung': metrics?.exitPayout || 0,
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
      'Exit-Zahlung': filteredContracts.reduce((sum, c) => sum + (contractMetrics[c.id]?.exitPayout || 0), 0),
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

  // Verwende echte Metriken für die Summen
  const totalRevenue = filteredContracts.reduce((sum, c) => {
    const metrics = contractMetrics[c.id];
    // Verwende aktuelle Preise mit Erhöhungen falls verfügbar
    return sum + (metrics?.currentMonthlyPrice || getTotalAmount(c));
  }, 0);
  const totalCommission = filteredContracts.reduce((sum, c) => sum + getCommission(c), 0);

  if (isLoading) {
    return (
      <div className="text-center py-8">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <p className="text-gray-600 mt-2">Lade Verträge...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Alle Verträge</h1>
          <p className="text-gray-600 mt-2">Übersicht aller Kundenverträge mit Kosten und Provisionen</p>
        </div>
        <button
          onClick={handleExportToExcel}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-medium flex items-center gap-2 whitespace-nowrap"
          title="Als Excel exportieren"
        >
          📊 Excel
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <p className="text-gray-600 text-sm font-medium mb-2">Anzahl Verträge</p>
          <p className="text-3xl font-bold text-gray-900">{filteredContracts.length}</p>
          <p className="text-gray-500 text-xs mt-2">von {contracts.length} Verträgen</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <p className="text-gray-600 text-sm font-medium mb-2">Monatliche Kosten</p>
          <p className="text-3xl font-bold text-purple-600">{formatCurrency(totalRevenue)}</p>
          <div className="text-xs text-gray-500 mt-2">brutto</div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <p className="text-gray-600 text-sm font-medium mb-2">Meine Provision</p>
          <p className="text-3xl font-bold text-green-600">{formatCurrency(totalCommission)}</p>
          <div className="text-xs text-gray-500 mt-2">netto</div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Suchen</label>
            <input
              type="text"
              placeholder="Kunde, Ort..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Amount Type Filters */}
        <div className="border-t border-gray-200 pt-4">
          <label className="block text-sm font-medium text-gray-700 mb-3">Nach Betragstypen filtern</label>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
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

      {filteredContracts.length === 0 ? (
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
                {filteredContracts.map((contract) => (
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
                      {formatCurrency(contractMetrics[contract.id]?.currentMonthlyPrice || getTotalAmount(contract))}
                    </td>
                    <td className="px-6 py-4 text-sm text-right font-semibold text-green-600">
                      {formatCurrency(getCommission(contract))}
                    </td>
                    <td className="px-6 py-4 text-sm text-right font-semibold text-orange-600">
                      {contractMetrics[contract.id]?.exitPayout !== undefined
                        ? formatCurrency(contractMetrics[contract.id].exitPayout)
                        : '—'}
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
        <p className="text-sm text-gray-600">{filteredContracts.length} von {contracts.length} Verträgen</p>
        <button
          onClick={loadAllContracts}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-medium"
        >
          Aktualisieren
        </button>
      </div>

      {/* Contract Modal */}
      <ContractModal
        isOpen={isContractModalOpen}
        onClose={handleCloseModal}
        contract={selectedContract}
        customerId={selectedContract?.customerId || ''}
        onSuccess={() => {
          handleCloseModal();
          loadAllContracts();
        }}
      />
    </div>
  );
}
