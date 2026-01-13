import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useCustomerStore } from '../stores/customerStore';
import { useContractStore } from '../stores/contractStore';
import { useSettingsStore } from '../stores/settingsStore';
import { Customer, Contract, CalculatedMetrics, PriceIncrease } from '../types';
import api from '../services/api';
import ContractModal from '../components/ContractModal';
import CustomerModal from '../components/CustomerModal';

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
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  
  const settings = useSettingsStore((state) => state.settings);

  // Hilfsfunktion: Berechne Basisbeträge mit Preiserhöhungen
  const calculateContractAmounts = (contract: Contract) => {
    const baseAmounts = {
      softwareRental: contract.softwareRentalAmount || 0,
      softwareCare: contract.softwareCareAmount || 0,
      apps: contract.appsAmount || 0,
      purchase: contract.purchaseAmount || 0,
    };

    const rentalStartDate = new Date(contract.rentalStartDate);
    const today = new Date();

    const increases = {
      softwareRental: 0,
      softwareCare: 0,
      apps: 0,
      purchase: 0,
    };

    // Wende alle gültigen Preiserhöhungen an
    if (priceIncreases && Array.isArray(priceIncreases) && priceIncreases.length > 0) {
      for (const increase of priceIncreases) {
        try {
          const validFromDate = new Date(increase.validFrom);
          if (isNaN(validFromDate.getTime())) {
            console.warn(`Invalid date for price increase ${increase.id}: ${increase.validFrom}`);
            continue;
          }

          if (validFromDate <= today) {
            const monthsRunning = Math.floor(
              (today.getTime() - rentalStartDate.getTime()) / (1000 * 60 * 60 * 24 * 30)
            );

            if (monthsRunning >= increase.lockInMonths) {
              if (increase.amountIncreases?.softwareRental > 0) {
                increases.softwareRental += increase.amountIncreases.softwareRental;
              }
              if (increase.amountIncreases?.softwareCare > 0) {
                increases.softwareCare += increase.amountIncreases.softwareCare;
              }
              if (increase.amountIncreases?.apps > 0) {
                increases.apps += increase.amountIncreases.apps;
              }
              if (increase.amountIncreases?.purchase > 0) {
                increases.purchase += increase.amountIncreases.purchase;
              }
            }
          }
        } catch (error) {
          console.warn(`Error processing price increase ${increase.id}:`, error);
          continue;
        }
      }
    }

    const adjustedAmounts = {
      softwareRental: baseAmounts.softwareRental * (1 + increases.softwareRental / 100),
      softwareCare: baseAmounts.softwareCare * (1 + increases.softwareCare / 100),
      apps: baseAmounts.apps * (1 + increases.apps / 100),
      purchase: baseAmounts.purchase * (1 + increases.purchase / 100),
    };

    const totalAmount = Object.values(adjustedAmounts).reduce((a, b) => a + b, 0);

    return {
      baseAmounts,
      adjustedAmounts,
      totalAmount,
    };
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

  const handleCustomerEditSuccess = () => {
    // Reload customer data after successful edit
    loadData();
    setIsCustomerModalOpen(false);
  };

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
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl font-bold text-gray-900">{customer.name} {customer.name2}</h1>
                <button
                  onClick={() => setIsCustomerModalOpen(true)}
                  className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition"
                  title="Kundendaten bearbeiten"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
              </div>
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
            {priceIncreases && priceIncreases.map((increase) => {
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
              const hasAnyIncrease = increase.amountIncreases && Object.values(increase.amountIncreases).some(v => v > 0);
              return (
                <div key={increase.id} className="bg-white p-3 rounded border border-blue-100">
                  <p className="text-xs text-gray-600 mb-2">
                    Gültig ab: {dateStr}
                  </p>
                  <div className="text-xs space-y-1">
                    {increase.amountIncreases?.softwareRental > 0 && (
                      <p><span className="text-gray-600">Software Miete:</span> +{increase.amountIncreases.softwareRental.toFixed(1)}%</p>
                    )}
                    {increase.amountIncreases?.softwareCare > 0 && (
                      <p><span className="text-gray-600">Software Pflege:</span> +{increase.amountIncreases.softwareCare.toFixed(1)}%</p>
                    )}
                    {increase.amountIncreases?.apps > 0 && (
                      <p><span className="text-gray-600">Apps:</span> +{increase.amountIncreases.apps.toFixed(1)}%</p>
                    )}
                    {increase.amountIncreases?.purchase > 0 && (
                      <p><span className="text-gray-600">Kauf Bestandsvertrag:</span> +{increase.amountIncreases.purchase.toFixed(1)}%</p>
                    )}
                    {!hasAnyIncrease && (
                      <p className="text-gray-500 italic">Keine Erhöhungen</p>
                    )}
                  </div>
                  <p className="text-xs text-gray-600 mt-2">
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
                  <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                    Keine Verträge vorhanden
                  </td>
                </tr>
              ) : (
                contracts.map((contract) => {
                  if (!contract) return null;
                  
                  const amounts = calculateContractAmounts(contract);
                  const commissionRates = (settings?.commissionRates as any) || {
                    softwareRental: 20,
                    softwareCare: 20,
                    apps: 20,
                    purchase: 0.083333,
                  };
                  
                  const commissions = {
                    softwareRental: (amounts?.adjustedAmounts?.softwareRental || 0) * ((commissionRates?.softwareRental || 20) / 100),
                    softwareCare: (amounts?.adjustedAmounts?.softwareCare || 0) * ((commissionRates?.softwareCare || 20) / 100),
                    apps: (amounts?.adjustedAmounts?.apps || 0) * ((commissionRates?.apps || 20) / 100),
                    purchase: (amounts?.adjustedAmounts?.purchase || 0) * ((commissionRates?.purchase || 0.083333) / 100),
                  };
                  const totalCommission = Object.values(commissions).reduce((a, b) => a + b, 0);
                  
                  return (
                    <tr key={contract.id} className="hover:bg-gray-50 transition">
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
                        €{amounts.totalAmount.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-green-600 font-semibold">
                        €{totalCommission.toFixed(2)}
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

      {customer && (
        <CustomerModal
          isOpen={isCustomerModalOpen}
          onClose={() => setIsCustomerModalOpen(false)}
          customer={customer}
          onSuccess={handleCustomerEditSuccess}
        />
      )}
    </div>
  );
}

export default CustomerDetail;
