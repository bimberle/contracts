import { useState, useEffect } from 'react';

interface CommissionRateModalProps {
  isOpen: boolean;
  onClose: () => void;
  commissionRate?: any;
  onSuccess: () => void;
}

export default function CommissionRateModal({
  isOpen,
  onClose,
  commissionRate,
  onSuccess,
}: CommissionRateModalProps) {
  const [formData, setFormData] = useState({
    validFrom: new Date().toISOString().split('T')[0],
    rates: {
      softwareRental: 20,
      softwareCare: 20,
      apps: 20,
      purchase: 10,
    },
    description: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (commissionRate) {
        setFormData({
          validFrom: commissionRate.validFrom.split('T')[0],
          rates: commissionRate.rates,
          description: commissionRate.description || '',
        });
      } else {
        setFormData({
          validFrom: new Date().toISOString().split('T')[0],
          rates: {
            softwareRental: 20,
            softwareCare: 20,
            apps: 20,
            purchase: 10,
          },
          description: '',
        });
      }
      setError(null);
    }
  }, [isOpen, commissionRate]);

  const handleChange = (field: string, value: string | number) => {
    if (field.startsWith('rates.')) {
      const rateField = field.split('.')[1];
      // Konvertiere Komma zu Punkt für Dezimalzahlen
      const stringValue = String(value).replace(',', '.');
      setFormData({
        ...formData,
        rates: {
          ...formData.rates,
          [rateField]: parseFloat(stringValue) || 0,
        },
      });
    } else {
      setFormData({
        ...formData,
        [field]: value,
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const payload = {
        validFrom: new Date(formData.validFrom + 'T00:00:00').toISOString(),
        rates: formData.rates,
        description: formData.description,
      };

      const url = commissionRate
        ? `/api/commission-rates/${commissionRate.id}`
        : '/api/commission-rates/';

      const method = commissionRate ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.detail || 'Fehler beim Speichern');
      }

      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Speichern');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 my-8">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-900">
            {commissionRate ? 'Provisionsatz bearbeiten' : 'Neuer Provisionsatz'}
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
              type="date"
              value={formData.validFrom}
              onChange={(e) => handleChange('validFrom', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              required
            />
          </div>

          <div className="border-t pt-4">
            <p className="text-sm font-medium text-gray-700 mb-3">Provisionsätze (%)</p>
            <div className="space-y-3">
              <div>
                <label className="block text-sm text-gray-700 mb-1">
                  Software Miete (%)
                </label>
                <input
                  type="text"
                  value={formData.rates.softwareRental}
                  onChange={(e) => handleChange('rates.softwareRental', e.target.value)}
                  placeholder="z.B. 20 oder 20,5"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-1">
                  Software Pflege (%)
                </label>
                <input
                  type="text"
                  value={formData.rates.softwareCare}
                  onChange={(e) => handleChange('rates.softwareCare', e.target.value)}
                  placeholder="z.B. 20 oder 20,5"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-1">
                  Apps (%)
                </label>
                <input
                  type="text"
                  value={formData.rates.apps}
                  onChange={(e) => handleChange('rates.apps', e.target.value)}
                  placeholder="z.B. 20 oder 20,5"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-1">
                  Kauf Bestandsvertrag (%)
                </label>
                <input
                  type="text"
                  step="0.01"
                  min="0"
                  value={formData.rates.purchase}
                  onChange={(e) => handleChange('rates.purchase', e.target.value)}
                  placeholder="z.B. 10 oder 10,5"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Beschreibung (optional)
            </label>
            <input
              type="text"
              placeholder="z.B. Standard Rates"
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
              disabled={loading}
            >
              Abbrechen
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
              disabled={loading}
            >
              {loading ? 'Speichert...' : commissionRate ? 'Aktualisieren' : 'Erstellen'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
