import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Customer, Contract, CalculatedMetrics, PriceIncrease, ContractMetrics } from '../types';
import api from '../services/api';
import { formatCurrency, formatDate } from '../utils/formatting';
import ContractModal from '../components/ContractModal';
import CustomerModal from '../components/CustomerModal';

function CustomerDetail() {
  const { customerId } = useParams<{ customerId: string }>();
  const navigate = useNavigate();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [metrics, setMetrics] = useState<CalculatedMetrics | null>(null);
  const [contractMetrics, setContractMetrics] = useState<Record<string, ContractMetrics>>({});
  const [priceIncreases, setPriceIncreases] = useState<PriceIncrease[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isContractModalOpen, setIsContractModalOpen] = useState(false);
  const [selectedContractForEdit, setSelectedContractForEdit] = useState<Contract | null>(null);
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [expandedContractId, setExpandedContractId] = useState<string | null>(null);

  // Hilfsfunktion: Finde geltende Preiserhöhungen für einen Vertrag
  const getApplicablePriceIncreases = (contract: Contract): PriceIncrease[] => {
    if (!priceIncreases || !Array.isArray(priceIncreases)) return [];

    const startDate = new Date(contract.startDate);
    const today = new Date();

    return priceIncreases.filter((increase) => {
      try {
        const validFromDate = new Date(increase.validFrom);
        if (isNaN(validFromDate.getTime())) return false;

        // Preiserhöhung muss NACH dem Vertragsbeginn gültig werden
        if (validFromDate < startDate) return false;

        // Muss gültig sein (validFrom in der Vergangenheit oder heute)
        if (validFromDate > today) return false;

        // Bestandsschutz-Prüfung: Vertrag muss mindestens lockInMonths alt sein
        const monthsRunning = Math.floor(
          (today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 30)
        );
        if (monthsRunning < increase.lockInMonths) return false;

        // Prüfe: Hat diese Preiserhöhung überhaupt positive Werte?
        if (!increase.amountIncreases) return false;
        
        const hasSoftwareRentalIncrease = (increase.amountIncreases.softwareRental ?? 0) > 0;
        const hasSoftwareCareIncrease = (increase.amountIncreases.softwareCare ?? 0) > 0;
        const hasAppsIncrease = (increase.amountIncreases.apps ?? 0) > 0;
        const hasPurchaseIncrease = (increase.amountIncreases.purchase ?? 0) > 0;
        
        // Keine Erhöhungen haben? Dann ist die Preiserhöhung ungültig
        if (!hasSoftwareRentalIncrease && !hasSoftwareCareIncrease && !hasAppsIncrease && !hasPurchaseIncrease) {
          return false;
        }

        // Jetzt: Schaue, ob für DIESEN Vertrag eine gültige Erhöhung existiert
        const hasApplicableIncrease = 
          (contract.softwareRentalAmount && contract.softwareRentalAmount > 0 && hasSoftwareRentalIncrease) ||
          (contract.softwareCareAmount && contract.softwareCareAmount > 0 && hasSoftwareCareIncrease) ||
          (contract.appsAmount && contract.appsAmount > 0 && hasAppsIncrease) ||
          (contract.purchaseAmount && contract.purchaseAmount > 0 && hasPurchaseIncrease);

        return hasApplicableIncrease;
      } catch (error) {
        console.warn(`Error processing price increase ${increase.id}:`, error);
        return false;
      }
    });
  };

  // Hilfsfunktion: Berechne Basisbeträge mit Preiserhöhungen
  const calculateContractAmounts = (contract: Contract) => {
    const baseAmounts = {
      softwareRental: contract.softwareRentalAmount || 0,
      softwareCare: contract.softwareCareAmount || 0,
      apps: contract.appsAmount || 0,
      purchase: contract.purchaseAmount || 0,
    };

    const increases = {
      softwareRental: 0,
      softwareCare: 0,
      apps: 0,
      purchase: 0,
    };

    // Wende alle gültigen Preiserhöhungen an
    const applicableIncreases = getApplicablePriceIncreases(contract);
    for (const increase of applicableIncreases) {
      try {
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
      } catch (error) {
        console.warn(`Error processing price increase:`, error);
        continue;
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
      const [customerData, contractsData, metricsData] = await Promise.all([
        api.getCustomer(customerId),
        api.getContractsByCustomer(customerId),
        api.getCustomerMetrics(customerId),
      ]);

      setCustomer(customerData);
      setContracts(contractsData);
      setMetrics(metricsData);
      
      // Lade Metriken für jeden Vertrag
      if (contractsData.length > 0) {
        const contractMetricsMap: Record<string, ContractMetrics> = {};
        const metricsPromises = contractsData.map(contract =>
          api.getContractMetrics(contract.id)
            .then(m => {
              contractMetricsMap[contract.id] = m;
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
        setContractMetrics(contractMetricsMap);

        // Lade Preiserhöhungen
        const priceIncreasesData = await api.getPriceIncreases();
        setPriceIncreases(priceIncreasesData);
      } else {
        setContractMetrics({});
        setPriceIncreases([]);
      }
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
    loadData();
    setIsCustomerModalOpen(false);
  };

  const deleteCustomer = async () => {
    if (!customerId || !customer) return;
    try {
      await api.deleteCustomer(customerId);
      // Navigate back to dashboard after successful deletion
      navigate('/');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Fehler beim Löschen des Kunden';
      alert(`Fehler: ${errorMessage}`);
    }
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
                <button
                  onClick={() => {
                    if (confirm(`Möchtest du den Kunden "${customer.name}" und alle seine Verträge wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.`)) {
                      deleteCustomer();
                    }
                  }}
                  className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition"
                  title="Kunden löschen"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
              <p className="text-gray-600 mt-2">Kundennummer: {customer.kundennummer}</p>
              <p className="text-gray-600">
                {customer.plz} {customer.ort}, {customer.land}
              </p>
            </div>
            <div className="space-y-3">
              {metrics && (
                <>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Monatliche Basisbeträge:</span>
                    <span className="font-bold">{formatCurrency(metrics.totalMonthlyRental)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Mit Preiserhöhungen:</span>
                    <span className="font-bold text-blue-600">{formatCurrency(metrics.totalMonthlyRevenue)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Monatliche Provision:</span>
                    <span className="font-bold text-green-600">
                      {formatCurrency(metrics.totalMonthlyCommission)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Bisher verdient:</span>
                    <span className="font-bold">{formatCurrency(metrics.totalEarned)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Exit-Auszahlung:</span>
                    <span className="font-bold">{formatCurrency(metrics.exitPayoutIfTodayInMonths)}</span>
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

        <div className="divide-y divide-gray-200">
          {contracts.length === 0 ? (
            <div className="px-6 py-8 text-center text-gray-500">
              Keine Verträge vorhanden
            </div>
          ) : (
            contracts.map((contract) => {
              if (!contract) return null;
              
              const amounts = calculateContractAmounts(contract);
              // Verwende echte Metriken vom Backend statt lokale Berechnung
              const metricsForContract = contractMetrics[contract.id];
              const totalCommission = metricsForContract?.currentMonthlyCommission || 0;
              
              const applicableIncreases = getApplicablePriceIncreases(contract);
              const isExpanded = expandedContractId === contract.id;

              return (
                <div key={contract.id}>
                  <div className="p-6 hover:bg-gray-50 transition">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex-1">
                        <p className="font-semibold text-gray-900">
                          {contract.softwareRentalAmount ? '🖥️ Software Miete' : ''}
                          {contract.softwareCareAmount ? (contract.softwareRentalAmount ? ' + ' : '') + '🛠️ Software Pflege' : ''}
                          {contract.appsAmount ? (contract.softwareRentalAmount || contract.softwareCareAmount ? ' + ' : '') + '📱 Apps' : ''}
                          {contract.purchaseAmount ? (contract.softwareRentalAmount || contract.softwareCareAmount || contract.appsAmount ? ' + ' : '') + '💳 Kauf' : ''}
                        </p>
                        <p className="text-sm text-gray-600 mt-1">Startdatum: {formatDate(contract.startDate)}</p>
                      </div>
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
                    </div>
                    
                    <div className="grid grid-cols-4 gap-6 mb-3">
                      <div>
                        <p className="text-sm text-gray-600">Monatspreis</p>
                        <p className="text-lg font-bold text-gray-900">{formatCurrency(amounts.totalAmount)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Meine Provision</p>
                        <p className="text-lg font-bold text-green-600">{formatCurrency(totalCommission)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Exit-Zahlung</p>
                        <p className="text-lg font-bold text-orange-600">{formatCurrency(contractMetrics[contract.id]?.exitPayout || 0)}</p>
                      </div>
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => {
                            setSelectedContractForEdit(contract);
                            setIsContractModalOpen(true);
                          }}
                          className="text-blue-600 hover:text-blue-800 transition text-sm"
                        >
                          Bearbeiten
                        </button>
                        <button
                          onClick={async () => {
                            if (confirm('Vertrag wirklich löschen?')) {
                              try {
                                await api.deleteContract(contract.id);
                                loadData();
                              } catch (err) {
                                alert('Fehler beim Löschen des Vertrags');
                              }
                            }
                          }}
                          className="text-red-600 hover:text-red-800 transition text-sm"
                        >
                          Löschen
                        </button>
                        {applicableIncreases.length > 0 && (
                          <button 
                            onClick={() => setExpandedContractId(isExpanded ? null : contract.id)}
                            className="text-blue-600 hover:text-blue-800 transition text-sm"
                          >
                            {isExpanded ? '▼' : '▶'} {applicableIncreases.length}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {isExpanded && applicableIncreases.length > 0 && (
                    <div className="px-6 py-4 bg-blue-50 border-t border-blue-200">
                      <h4 className="text-sm font-semibold text-blue-900 mb-3">Preiserhöhungen:</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {applicableIncreases.map((increase) => {
                          const isExcluded = (contract.excludedPriceIncreaseIds || []).includes(increase.id);
                          return (
                            <div 
                              key={increase.id} 
                              className={`p-3 rounded border text-sm transition ${
                                isExcluded
                                  ? 'bg-gray-100 border-gray-200 opacity-50'
                                  : 'bg-white border-blue-100'
                              }`}
                            >
                              <div className="flex items-start gap-2 mb-2">
                                <input
                                  type="checkbox"
                                  checked={!isExcluded}
                                  onChange={() => {
                                    const excluded = contract.excludedPriceIncreaseIds || [];
                                    let updated: string[];
                                    if (isExcluded) {
                                      updated = excluded.filter(id => id !== increase.id);
                                    } else {
                                      updated = [...excluded, increase.id];
                                    }
                                    setSelectedContractForEdit({
                                      ...contract,
                                      excludedPriceIncreaseIds: updated
                                    });
                                  }}
                                  className="mt-1 cursor-pointer w-4 h-4"
                                  title={isExcluded ? 'Klicken zum Aktivieren' : 'Klicken zum Deaktivieren'}
                                />
                                <div className="flex-1">
                                  <p className={`text-xs mb-1 ${isExcluded ? 'text-gray-500' : 'text-gray-600'}`}>
                                    Gültig ab: {formatDate(increase.validFrom)}
                                  </p>
                                  {isExcluded && (
                                    <p className="text-xs text-gray-500 font-medium">⊗ Deaktiviert</p>
                                  )}
                                </div>
                              </div>
                              <div className={`text-xs space-y-1 ${isExcluded ? 'text-gray-500' : ''}`}>
                                {increase.amountIncreases?.softwareRental > 0 && (
                                  <p><span className="text-gray-600">Software Miete:</span> <span className="font-semibold">+{increase.amountIncreases.softwareRental.toFixed(1)}%</span></p>
                                )}
                                {increase.amountIncreases?.softwareCare > 0 && (
                                  <p><span className="text-gray-600">Software Pflege:</span> <span className="font-semibold">+{increase.amountIncreases.softwareCare.toFixed(1)}%</span></p>
                                )}
                                {increase.amountIncreases?.apps > 0 && (
                                  <p><span className="text-gray-600">Apps:</span> <span className="font-semibold">+{increase.amountIncreases.apps.toFixed(1)}%</span></p>
                                )}
                                {increase.amountIncreases?.purchase > 0 && (
                                  <p><span className="text-gray-600">Kauf Bestandsvertrag:</span> <span className="font-semibold">+{increase.amountIncreases.purchase.toFixed(1)}%</span></p>
                                )}
                              </div>
                              <p className={`text-xs mt-2 ${isExcluded ? 'text-gray-400' : 'text-gray-600'}`}>
                                Bestandsschutz: {increase.lockInMonths} Monate
                              </p>
                              {increase.description && (
                                <p className={`text-xs mt-2 italic ${isExcluded ? 'text-gray-400' : 'text-gray-600'}`}>
                                  {increase.description}
                                </p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
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
