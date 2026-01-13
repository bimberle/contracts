import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useCustomerStore } from '../stores/customerStore';
import { useContractStore } from '../stores/contractStore';
import { useSettingsStore } from '../stores/settingsStore';
import { Customer, Contract, CalculatedMetrics, PriceIncrease } from '../types';
import api from '../services/api';
import ContractModal from '../components/ContractModal';

function CustomerDetail() {
  const { customerId } = useParams<{ customerId: string }>();
  const navigate = useNavigate();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [metrics, setMetrics] = useState<CalculatedMetrics | null>(null);
  const [priceIncreases, setPriceIncreases] = useState<PriceIncrease[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isContractModalOpen, setIsContractModalOpen] = useState(false);
  const [selectedContractForEdit, setSelectedContractForEdit] = useState<Contract | null>(null);
  
  const settings = useSettingsStore((state) => state.settings);

  // Hilfsfunktion: Berechne Preis mit Preiserhöhungen
  const calculateMonthlyPrice = (contract: Contract): number => {
    let adjustablePrice = contract.adjustablePrice;
    const rentalStartDate = new Date(contract.rentalStartDate);
    const today = new Date();

    // Wende alle gültigen Preiserhöhungen an
    for (const increase of priceIncreases) {
      // Versuche das Datum zu parsen - es könnte verschiedene Formate haben
      let validFromDate: Date;
      try {
        validFromDate = new Date(increase.validFrom);
        // Prüfe ob das Datum valid ist
        if (isNaN(validFromDate.getTime())) {
          console.warn(`Invalid date for price increase ${increase.id}: ${increase.validFrom}`);
          continue;
        }
      } catch {
        console.warn(`Error parsing date for price increase ${increase.id}: ${increase.validFrom}`);
        continue;
      }
      
      // Prüfe ob Preiserhöhung gültig ist (validFrom liegt in der Vergangenheit)
      if (validFromDate <= today) {
        // Prüfe ob Vertragstyp betroffen ist
        if (increase.appliesToTypes.includes(contract.type)) {
          // Berechne Monate seit Mietbeginn
          const monthsRunning = Math.floor(
            (today.getTime() - rentalStartDate.getTime()) / (1000 * 60 * 60 * 24 * 30)
          );
          
          // Prüfe Bestandsschutz
          if (monthsRunning >= increase.lockInMonths) {
            adjustablePrice *= (1 + increase.factor / 100);
          }
        }
      }
    }

    return contract.fixedPrice + adjustablePrice;
  };

  const loadData = async () => {
    if (!customerId) return;
    try {
      setLoading(true);
      const [customerData, contractsData, metricsData, priceIncreasesData] = await Promise.all([
        api.getCustomer(customerId),
        api.getContractsByCustomer(customerId),
        api.getCustomerMetrics(customerId),
        api.getPriceIncreases(),
      ]);

      setCustomer(customerData);
      setContracts(contractsData);
      setMetrics(metricsData);
      setPriceIncreases(priceIncreasesData);
      setError(null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Fehler beim Laden der Kundendaten';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!customerId) return;
    loadData();
  }, [customerId]);

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <p className="text-gray-600 mt-4">Lade Kundendaten...</p>
      </div>
    );
  }

  if (error || !customer) {
    return (
      <div className="space-y-4">
        <button
          onClick={() => navigate('/')}
          className="text-blue-600 hover:text-blue-800"
        >
          ← Zurück zum Dashboard
        </button>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          <p className="font-semibold">Fehler</p>
          <p>{error || 'Kunde nicht gefunden'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <button
          onClick={() => navigate('/')}
          className="text-blue-600 hover:text-blue-800 mb-4"
        >
          ← Zurück zum Dashboard
        </button>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{customer.name} {customer.name2}</h1>
              <p className="text-gray-600 mt-2">Kundennummer: {customer.kundennummer}</p>
              <p className="text-gray-600">
                {customer.ort}, {customer.plz}, {customer.land}
              </p>
            </div>
            <div className="space-y-3">
              {metrics && (
                <>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Monatliche Provision:</span>
                    <span className="font-bold text-green-600">
                      €{metrics.totalMonthlyCommission.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Bisher verdient:</span>
                    <span className="font-bold">€{metrics.totalEarned.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Exit-Auszahlung:</span>
                    <span className="font-bold">€{metrics.exitPayoutIfTodayInMonths.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Aktive Verträge:</span>
                    <span className="font-bold">{metrics.activeContracts}</span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Price Increases */}
      {priceIncreases.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-semibold text-blue-900 mb-3">Geltende Preiserhöhungen:</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {priceIncreases.map((increase) => {
              let validFromDate: Date;
              let dateStr = 'Ungültiges Datum';
              try {
                validFromDate = new Date(increase.validFrom);
                if (!isNaN(validFromDate.getTime())) {
                  dateStr = validFromDate.toLocaleDateString('de-DE');
                }
              } catch {
                // keep default dateStr
              }
              return (
                <div key={increase.id} className="bg-white p-3 rounded border border-blue-100">
                  <p className="text-sm font-medium text-gray-900">
                    {increase.factor > 0 ? '+' : ''}{increase.factor}%
                  </p>
                  <p className="text-xs text-gray-600">
                    Gültig ab: {dateStr}
                  </p>
                  <p className="text-xs text-gray-600">
                    Bestandsschutz: {increase.lockInMonths} Monate
                  </p>
                  {increase.description && (
                    <p className="text-xs text-gray-500 mt-1">{increase.description}</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Contracts */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-900">Verträge</h2>
          <button
            onClick={() => setIsContractModalOpen(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition text-sm"
          >
            + Neuer Vertrag
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Typ
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Monatspreis
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Provision
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Aktionen
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {contracts.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                    Keine Verträge vorhanden
                  </td>
                </tr>
              ) : (
                contracts.map((contract) => {
                  const monthlyPrice = calculateMonthlyPrice(contract);
                  const commissionRate = settings?.commissionRates?.[contract.type] ?? 0;
                  const monthlyCommission = monthlyPrice * (commissionRate / 100);
                  
                  return (
                    <tr key={contract.id} className="hover:bg-gray-50 transition">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {contract.type === 'rental' ? 'Miete' : 'Software-Pflege'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-medium ${
                            contract.status === 'active'
                              ? 'bg-green-100 text-green-800'
                              : contract.status === 'inactive'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {contract.status === 'active' ? 'Aktiv' : contract.status === 'inactive' ? 'Inaktiv' : 'Abgeschlossen'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900 font-semibold">
                        €{monthlyPrice.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-green-600 font-semibold">
                        €{monthlyCommission.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <button 
                          onClick={() => {
                            setSelectedContractForEdit(contract);
                            setIsContractModalOpen(true);
                          }}
                          className="text-blue-600 hover:text-blue-800 transition"
                        >
                          Bearbeiten
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {customerId && (
        <ContractModal
          isOpen={isContractModalOpen}
          onClose={() => {
            setIsContractModalOpen(false);
            setSelectedContractForEdit(null);
          }}
          customerId={customerId}
          contract={selectedContractForEdit}
          onSuccess={() => {
            // Reload contracts
            if (customerId) {
              loadData();
            }
            setSelectedContractForEdit(null);
          }}
        />
      )}
    </div>
  );
}

export default CustomerDetail;
