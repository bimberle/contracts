import React, { useState, useEffect } from 'react';
import { PriceIncreaseCreateRequest, ContractType } from '../types';
import { useSettingsStore } from '../stores/settingsStore';

interface PriceIncreaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const PriceIncreaseModal: React.FC<PriceIncreaseModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [formData, setFormData] = useState<PriceIncreaseCreateRequest>({
    validFrom: new Date().toISOString().split('T')[0],
    factor: 0,
    lockInMonths: 24,
    appliesToTypes: ['rental'],
    description: '',
  });
  const [selectedTypes, setSelectedTypes] = useState<ContractType[]>(['rental']);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const createPriceIncrease = useSettingsStore((state) => state.createPriceIncrease);

  useEffect(() => {
    if (isOpen) {
      // Reset form when modal opens
      setFormData({
        validFrom: new Date().toISOString().split('T')[0],
        factor: 0,
        lockInMonths: 24,
        appliesToTypes: ['rental'],
        description: '',
      });
      setSelectedTypes(['rental']);
      setError(null);
    }
  }, [isOpen]);

  const toggleType = (type: ContractType) => {
    setSelectedTypes((prev) =>
      prev.includes(type)
        ? prev.filter((t) => t !== type)
        : [...prev, type]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      if (selectedTypes.length === 0) {
        setError('Bitte wählen Sie mindestens einen Vertragstyp aus.');
        setIsLoading(false);
        return;
      }

      if (formData.factor <= 0) {
        setError('Die Erhöhung muss größer als 0% sein.');
        setIsLoading(false);
        return;
      }

      // Konvertiere das Datum zu ISO8601 Format
      const dateStr = formData.validFrom;
      const dateObj = new Date(dateStr + 'T00:00:00Z');

      await createPriceIncrease({
        validFrom: dateObj.toISOString(),
        factor: formData.factor,
        lockInMonths: formData.lockInMonths || 24,
        appliesToTypes: selectedTypes,
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

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Erhöhung (%)
            </label>
            <input
              type="number"
              step="0.1"
              min="0.1"
              value={formData.factor}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  factor: parseFloat(e.target.value) || 0,
                })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              required
            />
            <p className="text-xs text-gray-500 mt-1">z.B. 5 für +5%</p>
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
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Anwendbar auf
            </label>
            <div className="space-y-2">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={selectedTypes.includes('rental')}
                  onChange={() => toggleType('rental')}
                  className="w-4 h-4 rounded border-gray-300 cursor-pointer"
                />
                <span className="ml-2 text-sm text-gray-700">Mietverträge</span>
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={selectedTypes.includes('software-care')}
                  onChange={() => toggleType('software-care')}
                  className="w-4 h-4 rounded border-gray-300 cursor-pointer"
                />
                <span className="ml-2 text-sm text-gray-700">Software-Pflege</span>
              </label>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Beschreibung
            </label>
            <input
              type="text"
              placeholder="z.B. Inflation 2025"
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
