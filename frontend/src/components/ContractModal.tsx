import React, { useState, useEffect } from 'react';
import { Contract } from '../types';
import { useContractStore } from '../stores/contractStore';
import { useSettingsStore } from '../stores/settingsStore';
import { formatCurrency, formatDate } from '../utils/formatting';

interface ContractModalProps {
  isOpen: boolean;
  onClose: () => void;
  customerId: string;
  contract?: Contract | null;
  onSuccess?: () => void;
}

const ContractModal: React.FC<ContractModalProps> = ({
  isOpen,
  onClose,
  customerId,
  contract,
  onSuccess,
}) => {
  const [formData, setFormData] = useState({
    softwareRentalAmount: 0,
    softwareCareAmount: 0,
    appsAmount: 0,
    purchaseAmount: 0,
    currency: 'EUR',
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
    isFounderDiscount: false,
    notes: '',
    excludedPriceIncreaseIds: [] as string[],
  });
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'form' | 'breakdown'>('form');

  const createContract = useContractStore((state: any) => state.createContract);
  const updateContract = useContractStore((state: any) => state.updateContract);
  const fetchPriceIncreases = useSettingsStore((state: any) => state.fetchPriceIncreases);
  const priceIncreases = useSettingsStore((state: any) => state.priceIncreases);
  const settings = useSettingsStore((state: any) => state.settings);

  useEffect(() => {
    if (contract) {
      setFormData({
        softwareRentalAmount: contract.softwareRentalAmount,
        softwareCareAmount: contract.softwareCareAmount,
        appsAmount: contract.appsAmount,
        purchaseAmount: contract.purchaseAmount,
        currency: contract.currency,
        startDate: contract.startDate.split('T')[0],
        endDate: contract.endDate ? contract.endDate.split('T')[0] : '',
        isFounderDiscount: contract.isFounderDiscount,
        notes: contract.notes,
        excludedPriceIncreaseIds: contract.excludedPriceIncreaseIds || [],
      });
    } else {
      setFormData({
        softwareRentalAmount: 0,
        softwareCareAmount: 0,
        appsAmount: 0,
        purchaseAmount: 0,
        currency: 'EUR',
        startDate: new Date().toISOString().split('T')[0],
        endDate: '',
        isFounderDiscount: false,
        notes: '',
        excludedPriceIncreaseIds: [],
      });
    }
    setError(null);
    setActiveTab('form');
    fetchPriceIncreases();
  }, [contract, isOpen, fetchPriceIncreases]);

  // Hilfsfunktion: Finde geltende Preiserhöhungen
  const getApplicablePriceIncreases = () => {
    if (!priceIncreases || !Array.isArray(priceIncreases)) return [];

    const startDate = new Date(formData.startDate);
    const today = new Date();

    return priceIncreases.filter((increase: any) => {
      try {
        const validFromDate = new Date(increase.validFrom);
        if (isNaN(validFromDate.getTime())) return false;

        // Muss gültig sein (validFrom in der Vergangenheit)
        if (validFromDate > today) return false;

        // Bestandsschutz-Prüfung: Vertrag muss mindestens lockInMonths alt sein
        const monthsRunning = Math.floor(
          (today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 30)
        );
        if (monthsRunning < increase.lockInMonths) return false;

        // Typ-Prüfung: Die Preiserhöhung muss für diesen Vertragstyp gelten
        if (!increase.amountIncreases) return false;
        
        // Schaue, ob für diesen Vertrag überhaupt eine Erhöhung existiert
        const hasApplicableIncrease = 
          (formData.softwareRentalAmount > 0 && (increase.amountIncreases.softwareRental ?? 0) > 0) ||
          (formData.softwareCareAmount > 0 && (increase.amountIncreases.softwareCare ?? 0) > 0) ||
          (formData.appsAmount > 0 && (increase.amountIncreases.apps ?? 0) > 0) ||
          (formData.purchaseAmount > 0 && (increase.amountIncreases.purchase ?? 0) > 0);

        return hasApplicableIncrease;
      } catch (error) {
        console.warn(`Error processing price increase:`, error);
        return false;
      }
    });
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;

    setFormData((prev: any) => ({
      ...prev,
      [name]:
        type === 'checkbox'
          ? checked
          : ['softwareRentalAmount', 'softwareCareAmount', 'appsAmount', 'purchaseAmount'].includes(name)
          ? parseFloat(value) || 0
          : value,
    }));
  };

  // Handle excluding/including price increases
  const handlePriceIncreaseToggle = (priceIncreaseId: string) => {
    setFormData((prev: any) => {
      const excluded = prev.excludedPriceIncreaseIds || [];
      if (excluded.includes(priceIncreaseId)) {
        return {
          ...prev,
          excludedPriceIncreaseIds: excluded.filter((id: string) => id !== priceIncreaseId),
        };
      } else {
        return {
          ...prev,
          excludedPriceIncreaseIds: [...excluded, priceIncreaseId],
        };
      }
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      // Konvertiere Daten in das richtige Format
      const payload: any = {
        softwareRentalAmount: formData.softwareRentalAmount,
        softwareCareAmount: formData.softwareCareAmount,
        appsAmount: formData.appsAmount,
        purchaseAmount: formData.purchaseAmount,
        currency: formData.currency,
        startDate: new Date(formData.startDate + 'T00:00:00').toISOString(),
        endDate: formData.endDate ? new Date(formData.endDate + 'T00:00:00').toISOString() : null,
        isFounderDiscount: formData.isFounderDiscount,
        notes: formData.notes,
        excludedPriceIncreaseIds: formData.excludedPriceIncreaseIds || [],
      };

      if (contract) {
        // Bei Update: kein customerId (ist ja schon in der Route)
        await updateContract(contract.id, payload);
      } else {
        // Bei Create: customerId mitgeben
        payload.customerId = customerId;
        await createContract(payload);
      }
      onSuccess?.();
      onClose();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Ein Fehler ist aufgetreten';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Calculate breakdown with price increases
  const calculateBreakdown = () => {
    const baseAmounts = {
      softwareRental: formData.softwareRentalAmount,
      softwareCare: formData.softwareCareAmount,
      apps: formData.appsAmount,
      purchase: formData.purchaseAmount,
    };

    const startDate = new Date(formData.startDate);
    const today = new Date();
    const increases = {
      softwareRental: 0,
      softwareCare: 0,
      apps: 0,
      purchase: 0,
    };

    // Apply price increases
    for (const increase of priceIncreases) {
      // Skip if excluded
      if ((formData.excludedPriceIncreaseIds || []).includes(increase.id)) {
        continue;
      }

      const validFromDate = new Date(increase.validFrom);
      if (validFromDate <= today) {
        const monthsRunning = Math.floor(
          (today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 30)
        );

        if (monthsRunning >= increase.lockInMonths) {
          if (increase.amountIncreases.softwareRental > 0) {
            increases.softwareRental += increase.amountIncreases.softwareRental;
          }
          if (increase.amountIncreases.softwareCare > 0) {
            increases.softwareCare += increase.amountIncreases.softwareCare;
          }
          if (increase.amountIncreases.apps > 0) {
            increases.apps += increase.amountIncreases.apps;
          }
          if (increase.amountIncreases.purchase > 0) {
            increases.purchase += increase.amountIncreases.purchase;
          }
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

    // Calculate commissions
    const commissionRates = settings?.commissionRates || {
      software_rental: 20,
      software_care: 20,
      apps: 20,
      purchase: 0.083333,
    };

    const commissions = {
      softwareRental: adjustedAmounts.softwareRental * (commissionRates.software_rental / 100),
      softwareCare: adjustedAmounts.softwareCare * (commissionRates.software_care / 100),
      apps: adjustedAmounts.apps * (commissionRates.apps / 100),
      purchase: adjustedAmounts.purchase * (commissionRates.purchase / 100),
    };

    const totalCommission = Object.values(commissions).reduce((a, b) => a + b, 0);

    return {
      baseAmounts,
      increases,
      adjustedAmounts,
      totalAmount,
      commissions,
      totalCommission,
    };
  };

  const breakdown = calculateBreakdown();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200 sticky top-0 bg-white">
          <h2 className="text-2xl font-bold text-gray-900">
            {contract ? 'Vertrag bearbeiten' : 'Neuer Vertrag'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl"
          >
            ×
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 px-6 pt-4">
          <button
            onClick={() => setActiveTab('form')}
            className={`px-4 py-2 font-medium text-sm transition ${
              activeTab === 'form'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            Grunddaten
          </button>
          <button
            onClick={() => setActiveTab('breakdown')}
            className={`px-4 py-2 font-medium text-sm transition ${
              activeTab === 'breakdown'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            Kostenaufschlüsselung
          </button>
        </div>

        {/* Content */}
        {activeTab === 'form' ? (
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">
                {error}
              </div>
            )}

            {/* Start Date - FIRST FIELD */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Startdatum *
                </label>
                <input
                  type="date"
                  name="startDate"
                  value={formData.startDate}
                  onChange={handleChange}
                  autoFocus
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Enddatum (optional)
                </label>
                <input
                  type="date"
                  name="endDate"
                  value={formData.endDate}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                />
              </div>
            </div>

            {/* Amount Fields */}
            <div className="space-y-3 bg-blue-50 p-4 rounded-lg">
              <h3 className="font-semibold text-blue-900 mb-3">Beträge (€/Monat)</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Software Miete
                  </label>
                  <input
                    type="number"
                    name="softwareRentalAmount"
                    value={formData.softwareRentalAmount}
                    onChange={handleChange}
                    step="0.01"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Software Pflege
                  </label>
                  <input
                    type="number"
                    name="softwareCareAmount"
                    value={formData.softwareCareAmount}
                    onChange={handleChange}
                    step="0.01"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Apps
                  </label>
                  <input
                    type="number"
                    name="appsAmount"
                    value={formData.appsAmount}
                    onChange={handleChange}
                    step="0.01"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Monatliche Softwarepflege Kauf
                  </label>
                  <input
                    type="number"
                    name="purchaseAmount"
                    value={formData.purchaseAmount}
                    onChange={handleChange}
                    step="0.01"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  name="isFounderDiscount"
                  checked={formData.isFounderDiscount}
                  onChange={handleChange}
                  className="rounded border-gray-300"
                />
                <span className="text-sm font-medium text-gray-700">Existenzgründer-Rabatt</span>
              </label>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notizen
              </label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              />
            </div>

            {/* Buttons */}
            <div className="flex gap-3 justify-end pt-4 border-t border-gray-200">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
              >
                Abbrechen
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
              >
                {isLoading ? 'Speichern...' : contract ? 'Aktualisieren' : 'Erstellen'}
              </button>
            </div>
          </form>
        ) : (
          /* Breakdown Tab */
          <div className="p-6 space-y-6">
            {/* Breakdown Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-gray-100 border-b border-gray-300">
                    <th className="px-4 py-2 text-left font-semibold text-gray-900">Beschreibung</th>
                    <th className="px-4 py-2 text-right font-semibold text-gray-900">Software Miete</th>
                    <th className="px-4 py-2 text-right font-semibold text-gray-900">Software Pflege</th>
                    <th className="px-4 py-2 text-right font-semibold text-gray-900">Apps</th>
                    <th className="px-4 py-2 text-right font-semibold text-gray-900">Kauf Bestandsvertrag</th>
                    <th className="px-4 py-2 text-center font-semibold text-gray-900">Aktion</th>
                  </tr>
                </thead>
                <tbody>
                  {/* Base Amounts Row */}
                  <tr className="border-b border-gray-200 bg-blue-50 hover:bg-blue-100 transition">
                    <td className="px-4 py-3 font-medium text-gray-900">Basispreise</td>
                    <td className="px-4 py-3 text-right font-medium text-gray-900">{formatCurrency(breakdown.baseAmounts.softwareRental)}</td>
                    <td className="px-4 py-3 text-right font-medium text-gray-900">{formatCurrency(breakdown.baseAmounts.softwareCare)}</td>
                    <td className="px-4 py-3 text-right font-medium text-gray-900">{formatCurrency(breakdown.baseAmounts.apps)}</td>
                    <td className="px-4 py-3 text-right font-medium text-gray-900">{formatCurrency(breakdown.baseAmounts.purchase)}</td>
                    <td className="px-4 py-3 text-center">-</td>
                  </tr>

                  {/* Price Increases Rows */}
                  {getApplicablePriceIncreases().map((increase: any, index: number) => {
                    // Calculate the amounts with this specific increase applied
                    const increaseAmounts = {
                      softwareRental: breakdown.baseAmounts.softwareRental * (increase.amountIncreases.softwareRental / 100),
                      softwareCare: breakdown.baseAmounts.softwareCare * (increase.amountIncreases.softwareCare / 100),
                      apps: breakdown.baseAmounts.apps * (increase.amountIncreases.apps / 100),
                      purchase: breakdown.baseAmounts.purchase * (increase.amountIncreases.purchase / 100),
                    };

                    const isExcluded = (formData.excludedPriceIncreaseIds || []).includes(increase.id);

                    return (
                      <tr
                        key={increase.id || index}
                        className={`border-b border-gray-200 transition ${
                          isExcluded ? 'bg-red-50 opacity-60' : 'bg-white hover:bg-gray-50'
                        }`}
                      >
                        <td className="px-4 py-3 text-gray-900">
                          <div className="text-sm font-medium">
                            {formatDate(increase.validFrom)}
                            {increase.description && <span className="text-gray-600 ml-1">({increase.description})</span>}
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            {increase.amountIncreases.softwareRental > 0 && (
                              <span className="inline-block mr-3">SM: +{increase.amountIncreases.softwareRental.toFixed(1)}%</span>
                            )}
                            {increase.amountIncreases.softwareCare > 0 && (
                              <span className="inline-block mr-3">SP: +{increase.amountIncreases.softwareCare.toFixed(1)}%</span>
                            )}
                            {increase.amountIncreases.apps > 0 && (
                              <span className="inline-block mr-3">Apps: +{increase.amountIncreases.apps.toFixed(1)}%</span>
                            )}
                            {increase.amountIncreases.purchase > 0 && (
                              <span className="inline-block">KB: +{increase.amountIncreases.purchase.toFixed(1)}%</span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right text-gray-900">
                          {increaseAmounts.softwareRental > 0 ? (
                            <>
                              <div className="text-sm font-medium text-green-700">+{formatCurrency(increaseAmounts.softwareRental)}</div>
                              <div className="text-xs text-gray-500">+{increase.amountIncreases.softwareRental.toFixed(1)}%</div>
                            </>
                          ) : (
                            '-'
                          )}
                        </td>
                        <td className="px-4 py-3 text-right text-gray-900">
                          {increaseAmounts.softwareCare > 0 ? (
                            <>
                              <div className="text-sm font-medium text-green-700">+{formatCurrency(increaseAmounts.softwareCare)}</div>
                              <div className="text-xs text-gray-500">+{increase.amountIncreases.softwareCare.toFixed(1)}%</div>
                            </>
                          ) : (
                            '-'
                          )}
                        </td>
                        <td className="px-4 py-3 text-right text-gray-900">
                          {increaseAmounts.apps > 0 ? (
                            <>
                              <div className="text-sm font-medium text-green-700">+{formatCurrency(increaseAmounts.apps)}</div>
                              <div className="text-xs text-gray-500">+{increase.amountIncreases.apps.toFixed(1)}%</div>
                            </>
                          ) : (
                            '-'
                          )}
                        </td>
                        <td className="px-4 py-3 text-right text-gray-900">
                          {increaseAmounts.purchase > 0 ? (
                            <>
                              <div className="text-sm font-medium text-green-700">+{formatCurrency(increaseAmounts.purchase)}</div>
                              <div className="text-xs text-gray-500">+{increase.amountIncreases.purchase.toFixed(1)}%</div>
                            </>
                          ) : (
                            '-'
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <label className="flex items-center justify-center">
                            <input
                              type="checkbox"
                              checked={!isExcluded}
                              onChange={() => handlePriceIncreaseToggle(increase.id)}
                              className="rounded border-gray-300 cursor-pointer w-4 h-4"
                              title={isExcluded ? 'Preiserhöhung ist deaktiviert' : 'Preiserhöhung ist aktiv'}
                            />
                          </label>
                        </td>
                      </tr>
                    );
                  })}

                  {/* Total Row */}
                  <tr className="bg-green-100 border-t-2 border-gray-400">
                    <td className="px-4 py-3 font-bold text-gray-900">Summe (mit Erhöhungen)</td>
                    <td className="px-4 py-3 text-right font-bold text-gray-900">{formatCurrency(breakdown.adjustedAmounts.softwareRental)}</td>
                    <td className="px-4 py-3 text-right font-bold text-gray-900">{formatCurrency(breakdown.adjustedAmounts.softwareCare)}</td>
                    <td className="px-4 py-3 text-right font-bold text-gray-900">{formatCurrency(breakdown.adjustedAmounts.apps)}</td>
                    <td className="px-4 py-3 text-right font-bold text-gray-900">{formatCurrency(breakdown.adjustedAmounts.purchase)}</td>
                    <td className="px-4 py-3 text-center">-</td>
                  </tr>

                  {/* Grand Total Row */}
                  <tr className="bg-green-600 text-white">
                    <td className="px-4 py-3 font-bold">Gesamtbetrag</td>
                    <td colSpan={4} className="px-4 py-3 text-right font-bold text-lg">
                      {formatCurrency(breakdown.totalAmount)}
                    </td>
                    <td className="px-4 py-3 text-center">-</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Commission Summary */}
            <div className="space-y-3 bg-purple-50 p-4 rounded-lg">
              <h3 className="font-semibold text-purple-900 mb-2">Provisionen (basierend auf Summe):</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-700">Software Miete (20%):</span>
                  <span className="font-medium">{formatCurrency(breakdown.commissions.softwareRental)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-700">Software Pflege (20%):</span>
                  <span className="font-medium">{formatCurrency(breakdown.commissions.softwareCare)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-700">Apps (20%):</span>
                  <span className="font-medium">{formatCurrency(breakdown.commissions.apps)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-700">Kauf Bestandsvertrag (1/12%):</span>
                  <span className="font-medium">{formatCurrency(breakdown.commissions.purchase)}</span>
                </div>
              </div>
              <div className="border-t border-purple-200 pt-3 mt-3 flex justify-between font-bold text-lg">
                <span>Gesamtprovision:</span>
                <span className="text-purple-900">{formatCurrency(breakdown.totalCommission)}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ContractModal;
