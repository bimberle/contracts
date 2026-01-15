import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import * as XLSX from 'xlsx';
import api from '../services/api';
import { Contract, Customer, ContractMetrics } from '../types';

interface ContractWithCustomerInfo extends Contract {
  customerName: string;
  customerName2?: string;
  plz: string;
  ort: string;
  customerId: string;
}

export default function AllContracts() {
  const [contracts, setContracts] = useState<ContractWithCustomerInfo[]>([]);
  const [filteredContracts, setFilteredContracts] = useState<ContractWithCustomerInfo[]>([]);
  const [contractMetrics, setContractMetrics] = useState<Record<string, ContractMetrics>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive' | 'completed'>('all');
  const [sortBy, setSortBy] = useState<'customer' | 'cost' | 'commission'>('customer');
  const [selectedContract, setSelectedContract] = useState<ContractWithCustomerInfo | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [amountTypeFilters, setAmountTypeFilters] = useState({
    softwareRental: true,
    softwareCare: true,
    apps: true,
    purchase: true,
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

    if (statusFilter !== 'all') {
      filtered = filtered.filter((c) => c.status === statusFilter);
    }

    // Filter by amount types - only include contracts that have at least one selected amount type
    filtered = filtered.filter((c) => {
      if (amountTypeFilters.softwareRental && c.softwareRentalAmount > 0) return true;
      if (amountTypeFilters.softwareCare && c.softwareCareAmount > 0) return true;
      if (amountTypeFilters.apps && c.appsAmount > 0) return true;
      if (amountTypeFilters.purchase && c.purchaseAmount > 0) return true;
      return false;
    });

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter((c) =>
        c.customerName.toLowerCase().includes(term) ||
        (c.customerName2 && c.customerName2.toLowerCase().includes(term)) ||
        c.ort.toLowerCase().includes(term) ||
        c.plz.includes(term)
      );
    }

    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'customer':
          return a.customerName.localeCompare(b.customerName);
        case 'cost':
          return getTotalAmount(b) - getTotalAmount(a);
        case 'commission':
          return getCommission(b) - getCommission(a);
        default:
          return 0;
      }
    });

    setFilteredContracts(filtered);
  }, [contracts, searchTerm, statusFilter, sortBy, amountTypeFilters]);

  const getTotalAmount = (contract: Contract): number => {
    return (contract.softwareRentalAmount || 0) +
      (contract.softwareCareAmount || 0) +
      (contract.appsAmount || 0) +
      (contract.purchaseAmount || 0);
  };

  const getCommission = (contract: Contract): number => {
    return getTotalAmount(contract) * 0.15;
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, JSX.Element> = {
      active: <span className="px-3 py-1 bg-green-100 text-green-800 text-sm rounded-full font-medium">Aktiv</span>,
      inactive: <span className="px-3 py-1 bg-gray-100 text-gray-800 text-sm rounded-full font-medium">Inaktiv</span>,
      completed: <span className="px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full font-medium">Abgeschlossen</span>,
    };
    return badges[status] || status;
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2,
    }).format(value);
  };

  const handleEditContract = (contract: ContractWithCustomerInfo) => {
    setSelectedContract(contract);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedContract(null);
  };

  const handleExportToExcel = () => {
    // Prepare data for export
    const exportData: Array<Record<string, unknown>> = filteredContracts.map((contract) => ({
      'Kundenname': contract.customerName,
      'Name 2': contract.customerName2 || '',
      'PLZ': contract.plz,
      'Ort': contract.ort,
      'Status': contract.status,
      'Software Miete': contract.softwareRentalAmount || 0,
      'Software Pflege': contract.softwareCareAmount || 0,
      'Apps': contract.appsAmount || 0,
      'Bestand': contract.purchaseAmount || 0,
      'Gesamtbetrag': getTotalAmount(contract),
      'Provision': getCommission(contract),
      'Startdatum': contract.startDate ? contract.startDate.split('T')[0] : '',
    }));

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

  const totalRevenue = filteredContracts.reduce((sum, c) => sum + getTotalAmount(c), 0);
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Alle</option>
              <option value="active">Aktiv</option>
              <option value="inactive">Inaktiv</option>
              <option value="completed">Abgeschlossen</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Sortieren</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="customer">Kunde</option>
              <option value="cost">Kosten (absteigend)</option>
              <option value="commission">Provision (absteigend)</option>
            </select>
          </div>
        </div>

        {/* Amount Type Filters */}
        <div className="border-t border-gray-200 pt-4">
          <label className="block text-sm font-medium text-gray-700 mb-3">Nach Betragstypen filtern</label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Kundenname</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">PLZ / Ort</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Status</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-700">Software Miete</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-700">Software Pflege</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-700">Apps</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-700">Bestand</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-700">Gesamt</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-700">Provision</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-700">Exit-Zahlung</th>
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
                    <td className="px-6 py-4 text-sm">{getStatusBadge(contract.status)}</td>
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
                    <td className="px-6 py-4 text-sm text-right font-semibold text-gray-900">
                      {formatCurrency(getTotalAmount(contract))}
                    </td>
                    <td className="px-6 py-4 text-sm text-right font-semibold text-green-600">
                      {formatCurrency(getCommission(contract))}
                    </td>
                    <td className="px-6 py-4 text-sm text-right font-semibold text-orange-600">
                      {contractMetrics[contract.id]?.exitPayout !== undefined
                        ? formatCurrency(contractMetrics[contract.id].exitPayout)
                        : '—'}
                    </td>
                    <td className="px-6 py-4 text-sm text-center">
                      <Link
                        to={`/customers/${contract.customerId}`}
                        className="inline-flex items-center justify-center w-8 h-8 rounded hover:bg-blue-100 text-blue-600 hover:text-blue-800 transition"
                        title="Zum Kunden"
                      >
                        👤
                      </Link>
                      <button
                        onClick={() => handleEditContract(contract)}
                        className="inline-flex items-center justify-center w-8 h-8 rounded hover:bg-gray-300 text-gray-600 hover:text-gray-800 transition ml-2"
                        title="Vertrag anschauen"
                      >
                        🔍
                      </button>
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

      {/* Contract Details Modal */}
      {showModal && selectedContract && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-900">Vertrag anschauen</h2>
              <button
                onClick={handleCloseModal}
                className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
              >
                ✕
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-6">
              {/* Customer Info */}
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <h3 className="font-semibold text-gray-900 mb-2">Kunde</h3>
                <p className="text-gray-700">
                  {selectedContract.customerName}
                  {selectedContract.customerName2 && ` ${selectedContract.customerName2}`}
                </p>
                <p className="text-sm text-gray-600">
                  {selectedContract.plz} {selectedContract.ort}
                </p>
              </div>

              {/* Contract Details Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Software Miete (€/Monat)</label>
                  <input
                    type="number"
                    defaultValue={selectedContract.softwareRentalAmount || 0}
                    disabled
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-900 cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Software Pflege (€/Monat)</label>
                  <input
                    type="number"
                    defaultValue={selectedContract.softwareCareAmount || 0}
                    disabled
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-900 cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Apps (€/Monat)</label>
                  <input
                    type="number"
                    defaultValue={selectedContract.appsAmount || 0}
                    disabled
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-900 cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Bestand (€/Monat)</label>
                  <input
                    type="number"
                    defaultValue={selectedContract.purchaseAmount || 0}
                    disabled
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-900 cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                  <input
                    type="text"
                    defaultValue={selectedContract.status}
                    disabled
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-900 cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Startdatum</label>
                  <input
                    type="date"
                    defaultValue={selectedContract.startDate?.split('T')[0] || ''}
                    disabled
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-900 cursor-not-allowed"
                  />
                </div>
              </div>

              {/* Summary */}
              <div className="border-t border-gray-200 pt-6">
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <p className="text-xs text-blue-600 font-medium mb-1">Gesamtbetrag</p>
                    <p className="text-xl font-bold text-blue-900">{formatCurrency(getTotalAmount(selectedContract))}</p>
                  </div>
                  <div className="bg-green-50 p-4 rounded-lg">
                    <p className="text-xs text-green-600 font-medium mb-1">Geschätzte Provision</p>
                    <p className="text-xl font-bold text-green-900">{formatCurrency(getCommission(selectedContract))}</p>
                  </div>
                  <div className="bg-gray-100 p-4 rounded-lg">
                    <p className="text-xs text-gray-600 font-medium mb-1">Währung</p>
                    <p className="text-xl font-bold text-gray-900">{selectedContract.currency}</p>
                  </div>
                </div>
              </div>

              {/* Info Text */}
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-sm text-yellow-800">
                  ℹ️ Die Vertragsdaten sind aktuell schreibgeschützt. Die Bearbeitung erfolgt in der Kundendetailseite.
                </p>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 p-6 flex justify-between">
              <Link
                to={`/customers/${selectedContract.customerId}`}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
              >
                Zum Kunden
              </Link>
              <button
                onClick={handleCloseModal}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition font-medium"
              >
                Schließen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
