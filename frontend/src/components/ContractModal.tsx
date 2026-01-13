import React, { useState, useEffect } from 'react';
import { Contract, ContractCreateRequest, ContractUpdateRequest, ContractType, ContractStatus, Settings, PriceIncrease } from '../types';
import { useContractStore } from '../stores/contractStore';
import { useSettingsStore } from '../stores/settingsStore';

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
    type: 'rental' as ContractType,
    fixedPrice: 0,
    adjustablePrice: 0,
    currency: 'EUR',
    startDate: new Date().toISOString().split('T')[0],
    rentalStartDate: new Date().toISOString().split('T')[0],
    endDate: '',
    isFounderDiscount: false,
    status: 'active' as ContractStatus,
    notes: '',
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
        type: contract.type,
        fixedPrice: contract.fixedPrice,
        adjustablePrice: contract.adjustablePrice,
        currency: contract.currency,
        startDate: contract.startDate.split('T')[0],
        rentalStartDate: contract.rentalStartDate.split('T')[0],
        endDate: contract.endDate ? contract.endDate.split('T')[0] : '',
        isFounderDiscount: contract.isFounderDiscount,
        status: contract.status,
        notes: contract.notes,
      });
    } else {
      setFormData({
        type: 'rental',
        fixedPrice: 0,
        adjustablePrice: 0,
        currency: 'EUR',
        startDate: new Date().toISOString().split('T')[0],
        rentalStartDate: new Date().toISOString().split('T')[0],
        endDate: '',
        isFounderDiscount: false,
        status: 'active',
        notes: '',
      });
    }
    setError(null);
    setActiveTab('form');
    // Fetch price increases when modal opens
    fetchPriceIncreases();
  }, [contract, isOpen, fetchPriceIncreases]);

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
          : name === 'fixedPrice' || name === 'adjustablePrice'
          ? parseFloat(value) || 0
          : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      // Use camelCase for frontend - Pydantic will handle alias mapping
      const payload = {
        customerId,
        ...formData,
        startDate: new Date(formData.startDate).toISOString(),
        rentalStartDate: new Date(formData.rentalStartDate).toISOString(),
        endDate: formData.endDate ? new Date(formData.endDate).toISOString() : null,
      };

      if (contract) {
        const { customerId: _, ...updatePayload } = payload;
        await updateContract(contract.id, updatePayload as any);
      } else {
        await createContract(payload as any);
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

  if (!isOpen) return null;

  const totalPrice = formData.fixedPrice + formData.adjustablePrice;

  // Helper function to calculate cost breakdown
  const calculateCostBreakdown = () => {
    const rentalStart = new Date(formData.rentalStartDate);
    const today = new Date();
    
    // Get applicable price increases for this contract type
    const applicableIncreases = priceIncreases.filter((increase: any) => 
      increase.appliesToTypes.includes(formData.type) && 
      new Date(increase.validFrom) <= today
    );

    // Calculate months running
    const monthsRunning = Math.floor(
      (today.getFullYear() - rentalStart.getFullYear()) * 12 +
      (today.getMonth() - rentalStart.getMonth())
    );

    // Filter increases that meet lock-in requirement
    const applicableWithLockIn = applicableIncreases.filter(
      (increase: any) => monthsRunning >= increase.lockInMonths
    );

    // Calculate adjusted base price
    let adjustedPrice = formData.adjustablePrice;
    for (const increase of applicableWithLockIn) {
      adjustedPrice *= (1 + increase.factor / 100);
    }

    return {
      fixedPrice: formData.fixedPrice,
      baseAdjustablePrice: formData.adjustablePrice,
      adjustedPrice,
      increases: applicableWithLockIn,
      monthsRunning,
      totalMonthlyPrice: formData.fixedPrice + adjustedPrice,
    };
  };

  const breakdown = calculateCostBreakdown();
  const commissionRate = settings?.commissionRates[formData.type] ?? 0;
  const monthlyCommission = breakdown.totalMonthlyPrice * (commissionRate / 100);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 my-8">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">
            {contract ? 'Vertrag bearbeiten' : 'Neuer Vertrag'}
          </h2>
          
          {/* Tab Navigation */}
          <div className="flex gap-4 mt-4">
            <button
              type="button"
              onClick={() => setActiveTab('form')}
              className={`px-4 py-2 font-medium text-sm rounded-t-lg transition ${
                activeTab === 'form'
                  ? 'bg-blue-100 text-blue-700 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Formular
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('breakdown')}
              className={`px-4 py-2 font-medium text-sm rounded-t-lg transition ${
                activeTab === 'breakdown'
                  ? 'bg-blue-100 text-blue-700 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Kostenaufschlüsselung
            </button>
          </div>
        </div>

        {activeTab === 'form' ? (
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Typ
              </label>
              <select
                autoFocus
                name="type"
                value={formData.type}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              >
                <option value="rental">Miete</option>
                <option value="software-care">Software-Pflege</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Fixer Betrag (€/Monat)
              </label>
              <input
                type="number"
                name="fixedPrice"
                value={formData.fixedPrice}
                onChange={handleChange}
                step="0.01"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Anpassbarer Betrag (€/Monat)
              </label>
              <input
                type="number"
                name="adjustablePrice"
                value={formData.adjustablePrice}
                onChange={handleChange}
                step="0.01"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                required
              />
            </div>
          </div>

          <div className="bg-blue-50 rounded-lg p-3">
            <p className="text-sm font-medium text-gray-700">
              Gesamtbetrag: <span className="text-blue-600 font-bold">{totalPrice.toFixed(2)}€/Monat</span>
            </p>
            <p className="text-xs text-gray-600 mt-1">
              Preiserhöhungen werden nur auf den anpassbaren Betrag angewendet
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Startdatum
              </label>
              <input
                type="date"
                name="startDate"
                value={formData.startDate}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Mietbeginn
              </label>
              <input
                type="date"
                name="rentalStartDate"
                value={formData.rentalStartDate}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
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

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                name="status"
                value={formData.status}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              >
                <option value="active">Aktiv</option>
                <option value="inactive">Inaktiv</option>
                <option value="completed">Abgeschlossen</option>
              </select>
            </div>
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              name="isFounderDiscount"
              checked={formData.isFounderDiscount}
              onChange={handleChange}
              className="h-4 w-4 text-blue-600 border-gray-300 rounded"
            />
            <label className="ml-2 text-sm text-gray-700">Existenzgründer-Rabatt</label>
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

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
              disabled={isLoading}
            >
              Abbrechen
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
              disabled={isLoading}
            >
              {isLoading ? 'Speichert...' : 'Speichern'}
            </button>
          </div>
        </form>
        ) : (
        <div className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">
              {error}
            </div>
          )}

          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 mb-3">Kostenaufschlüsselung</h3>
            
            <div className="space-y-3 mb-4">
              {/* Fixed Price */}
              <div className="flex justify-between items-center py-2 border-b border-gray-200">
                <span className="text-gray-700">Fixer Betrag</span>
                <span className="font-medium text-gray-900">{breakdown.fixedPrice.toFixed(2)}€/Monat</span>
              </div>

              {/* Adjustable Base Price */}
              <div className="flex justify-between items-center py-2 border-b border-gray-200">
                <span className="text-gray-700">Anpassbarer Betrag (Basis)</span>
                <span className="font-medium text-gray-900">{breakdown.baseAdjustablePrice.toFixed(2)}€/Monat</span>
              </div>

              {/* Price Increases */}
              {breakdown.increases.length > 0 ? (
                <>
                  <div className="py-2 text-sm font-semibold text-gray-700">Preiserhöhungen:</div>
                  {breakdown.increases.map((increase: any, index: number) => {
                    const increaseAmount = breakdown.baseAdjustablePrice * (increase.factor / 100);
                    const validFromDate = new Date(increase.validFrom);
                    const dateStr = validFromDate.toLocaleDateString('de-DE', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                    });
                    
                    return (
                      <div key={index} className="flex justify-between items-center py-2 pl-4 border-l-2 border-blue-300 bg-blue-50">
                        <span className="text-gray-700 text-sm">
                          +{increase.factor.toFixed(1)}% (gültig ab {dateStr})
                        </span>
                        <span className="font-medium text-gray-900">+{increaseAmount.toFixed(2)}€</span>
                      </div>
                    );
                  })}
                </>
              ) : (
                <div className="py-2 text-sm text-gray-600 italic">Keine Preiserhöhungen anwendbar</div>
              )}

              {/* Total */}
              <div className="flex justify-between items-center py-3 px-3 bg-blue-100 rounded-lg mt-4">
                <span className="font-semibold text-gray-900">Gesamtpreis (monatlich)</span>
                <span className="text-lg font-bold text-blue-700">{breakdown.totalMonthlyPrice.toFixed(2)}€</span>
              </div>

              {/* Commission Info */}
              <div className="flex justify-between items-center py-2 px-3 bg-green-50 rounded-lg">
                <span className="text-gray-700">Deine Provision ({commissionRate.toFixed(1)}%)</span>
                <span className="font-semibold text-green-700">{monthlyCommission.toFixed(2)}€/Monat</span>
              </div>
            </div>

            <div className="text-xs text-gray-600 italic mt-4 pt-4 border-t border-gray-200">
              <p>Hinweis: Preiserhöhungen werden nur auf den anpassbaren Betrag angewendet und erfordern eine Mindestvertragslaufzeit von {breakdown.increases.length > 0 ? breakdown.increases[0].lockInMonths : 0} Monaten.</p>
              <p className="mt-2">Laufzeit: {breakdown.monthsRunning} Monate seit Mietbeginn</p>
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
            >
              Schließen
            </button>
          </div>
        </div>
        )}
      </div>
    </div>
  );
};

export default ContractModal;
