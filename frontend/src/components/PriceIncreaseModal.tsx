import React, { useState, useEffect } from 'react';
import { PriceIncreaseCreateRequest, PriceIncrease } from '../types';
import { useSettingsStore } from '../stores/settingsStore';

// Hilfsfunktion für Komma-Anzeige - Strings werden direkt durchgelassen
const displayWithComma = (val: number | string | undefined | null): string => {
  // Wenn undefined oder null, leerer String
  if (val === undefined || val === null) return '0';
  // Wenn es bereits ein String ist, einfach durchlassen (für Eingabe)
  if (typeof val === 'string') return val;
  // Nur Zahlen konvertieren (für initiale Anzeige aus DB)
  if (typeof val === 'number') {
    if (isNaN(val)) return '';
    return val.toString().replace('.', ',');
  }
  return '';
};

// Hilfsfunktion zum Normalisieren von amountIncreases (snake_case → camelCase)
const normalizeAmountIncreases = (amounts: Record<string, number> | undefined): {
  softwareRental: number;
  softwareCare: number;
  apps: number;
  purchase: number;
} => {
  if (!amounts) {
    return { softwareRental: 0, softwareCare: 0, apps: 0, purchase: 0 };
  }
  return {
    softwareRental: amounts.softwareRental ?? amounts.software_rental ?? 0,
    softwareCare: amounts.softwareCare ?? amounts.software_care ?? 0,
    apps: amounts.apps ?? 0,
    purchase: amounts.purchase ?? 0,
  };
};

interface PriceIncreaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  priceIncrease?: PriceIncrease | null;
  onSuccess?: () => void;
}

interface FormDataType {
  validFrom: string;
  amountIncreases: {
    softwareRental: number | string;
    softwareCare: number | string;
    apps: number | string;
    purchase: number | string;
  };
  lockInMonths: number;
  description: string;
}

const PriceIncreaseModal: React.FC<PriceIncreaseModalProps> = ({ isOpen, onClose, priceIncrease, onSuccess }) => {
  const [formData, setFormData] = useState<FormDataType>({
    validFrom: new Date().toISOString().split('T')[0],
    amountIncreases: {
      softwareRental: 0,
      softwareCare: 0,
      apps: 0,
      purchase: 0,
    },
    lockInMonths: 48,
    description: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const createPriceIncrease = useSettingsStore((state) => state.createPriceIncrease);
  const updatePriceIncrease = useSettingsStore((state) => state.updatePriceIncrease);

  useEffect(() => {
    if (isOpen) {
      if (priceIncrease) {
        // Edit mode: pre-fill with existing data
        // Normalize amount increases to handle both snake_case and camelCase from API
        const normalizedAmounts = normalizeAmountIncreases(priceIncrease.amountIncreases as unknown as Record<string, number>);
        setFormData({
          validFrom: priceIncrease.validFrom.split('T')[0],
          amountIncreases: normalizedAmounts,
          lockInMonths: priceIncrease.lockInMonths,
          description: priceIncrease.description || '',
        });
      } else {
        // Create mode: reset form with default 48 months lock-in
        setFormData({
          validFrom: new Date().toISOString().split('T')[0],
          amountIncreases: {
            softwareRental: 0,
            softwareCare: 0,
            apps: 0,
            purchase: 0,
          },
          lockInMonths: 48,
          description: '',
        });
      }
      setError(null);
    }
  }, [isOpen, priceIncrease]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    // Hilfsfunktion zum Parsen (Komma → Punkt)
    const parseAmount = (val: number | string): number => {
      if (typeof val === 'number') return val;
      return parseFloat(val.replace(',', '.')) || 0;
    };

    const parsedAmounts = {
      softwareRental: parseAmount(formData.amountIncreases.softwareRental),
      softwareCare: parseAmount(formData.amountIncreases.softwareCare),
      apps: parseAmount(formData.amountIncreases.apps),
      purchase: parseAmount(formData.amountIncreases.purchase),
    };

    try {
      if (
        parsedAmounts.softwareRental === 0 &&
        parsedAmounts.softwareCare === 0 &&
        parsedAmounts.apps === 0 &&
        parsedAmounts.purchase === 0
      ) {
        setError('Bitte geben Sie mindestens eine Preiserhöhung ein.');
        setIsLoading(false);
        return;
      }

      // Konvertiere das Datum zu ISO8601 Format
      const dateStr = formData.validFrom;
      const dateObj = new Date(dateStr + 'T12:00:00Z');

      if (priceIncrease) {
        // Update mode
        await updatePriceIncrease(priceIncrease.id, {
          validFrom: dateObj.toISOString(),
          amountIncreases: parsedAmounts,
          lockInMonths: formData.lockInMonths || 24,
          description: formData.description,
        });
      } else {
        // Create mode
        await createPriceIncrease({
          validFrom: dateObj.toISOString(),
          amountIncreases: parsedAmounts,
          lockInMonths: formData.lockInMonths || 24,
          description: formData.description,
        });
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

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 my-8">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-900">
            {priceIncrease ? 'Preiserhöhung bearbeiten' : 'Neue Preiserhöhung'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Gültig ab
            </label>
            <input
              autoFocus
              type="date"
              value={formData.validFrom}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  validFrom: e.target.value,
                })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              Datum ab dem die Preiserhöhung gültig wird
            </p>
          </div>

          <div className="border-t pt-4">
            <p className="text-sm font-medium text-gray-700 mb-3">Erhöhungen pro Typ (%)</p>
            
            <div>
              <label className="block text-sm text-gray-700 mb-1">
                Software Miete
              </label>
              <input
                type="text"
                inputMode="decimal"
                value={displayWithComma(formData.amountIncreases.softwareRental)}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    amountIncreases: {
                      ...formData.amountIncreases,
                      softwareRental: e.target.value,
                    },
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              />
            </div>

            <div className="mt-2">
              <label className="block text-sm text-gray-700 mb-1">
                Software Pflege
              </label>
              <input
                type="text"
                inputMode="decimal"
                value={displayWithComma(formData.amountIncreases.softwareCare)}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    amountIncreases: {
                      ...formData.amountIncreases,
                      softwareCare: e.target.value,
                    },
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              />
            </div>

            <div className="mt-2">
              <label className="block text-sm text-gray-700 mb-1">
                Apps
              </label>
              <input
                type="text"
                inputMode="decimal"
                value={displayWithComma(formData.amountIncreases.apps)}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    amountIncreases: {
                      ...formData.amountIncreases,
                      apps: e.target.value,
                    },
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              />
            </div>

            <div className="mt-2">
              <label className="block text-sm text-gray-700 mb-1">
                Kauf Bestandsvertrag
              </label>
              <input
                type="text"
                inputMode="decimal"
                value={displayWithComma(formData.amountIncreases.purchase)}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    amountIncreases: {
                      ...formData.amountIncreases,
                      purchase: e.target.value,
                    },
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Bestandsschutz (Monate)
            </label>
            <input
              type="number"
              min="0"
              value={formData.lockInMonths || 24}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  lockInMonths: parseInt(e.target.value) || 24,
                })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              Mindestvertragslaufzeit für Anwendung
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Beschreibung
            </label>
            <input
              type="text"
              placeholder="z.B. Inflation 2026"
              value={formData.description}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  description: e.target.value,
                })
              }
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
              className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50"
              disabled={isLoading}
            >
              {isLoading
                ? priceIncrease
                  ? 'Wird aktualisiert...'
                  : 'Wird hinzugefügt...'
                : priceIncrease
                ? 'Aktualisieren'
                : 'Hinzufügen'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PriceIncreaseModal;
