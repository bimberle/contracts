import React, { useState, useEffect } from 'react';
import { PriceIncreaseCreateRequest } from '../types';
import { useSettingsStore } from '../stores/settingsStore';

interface PriceIncreaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const PriceIncreaseModal: React.FC<PriceIncreaseModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [formData, setFormData] = useState<PriceIncreaseCreateRequest>({
    validFrom: new Date().toISOString().split('T')[0],
    amountIncreases: {
      softwareRental: 0,
      softwareCare: 0,
      apps: 0,
      purchase: 0,
    },
    lockInMonths: 24,
    description: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const createPriceIncrease = useSettingsStore((state) => state.createPriceIncrease);

  useEffect(() => {
    if (isOpen) {
      // Reset form when modal opens
      setFormData({
        validFrom: new Date().toISOString().split('T')[0],
        amountIncreases: {
          softwareRental: 0,
          softwareCare: 0,
          apps: 0,
          purchase: 0,
        },
        lockInMonths: 24,
        description: '',
      });
      setError(null);
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      if (
        formData.amountIncreases.softwareRental === 0 &&
        formData.amountIncreases.softwareCare === 0 &&
        formData.amountIncreases.apps === 0 &&
        formData.amountIncreases.purchase === 0
      ) {
        setError('Bitte geben Sie mindestens eine Preiserhöhung ein.');
        setIsLoading(false);
        return;
      }

      // Konvertiere das Datum zu ISO8601 Format
      const dateStr = formData.validFrom;
      const dateObj = new Date(dateStr + 'T00:00:00Z');

      await createPriceIncrease({
        validFrom: dateObj.toISOString(),
        amountIncreases: formData.amountIncreases,
        lockInMonths: formData.lockInMonths || 24,
        description: formData.description,
      });

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
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">Neue Preiserhöhung</h2>
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
                type="number"
                step="0.1"
                min="0"
                value={formData.amountIncreases.softwareRental}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    amountIncreases: {
                      ...formData.amountIncreases,
                      softwareRental: parseFloat(e.target.value) || 0,
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
                type="number"
                step="0.1"
                min="0"
                value={formData.amountIncreases.softwareCare}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    amountIncreases: {
                      ...formData.amountIncreases,
                      softwareCare: parseFloat(e.target.value) || 0,
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
                type="number"
                step="0.1"
                min="0"
                value={formData.amountIncreases.apps}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    amountIncreases: {
                      ...formData.amountIncreases,
                      apps: parseFloat(e.target.value) || 0,
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
                type="number"
                step="0.1"
                min="0"
                value={formData.amountIncreases.purchase}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    amountIncreases: {
                      ...formData.amountIncreases,
                      purchase: parseFloat(e.target.value) || 0,
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
              {isLoading ? 'Wird hinzugefügt...' : 'Hinzufügen'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PriceIncreaseModal;
