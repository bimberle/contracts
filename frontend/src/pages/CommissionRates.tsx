import React, { useState, useEffect } from 'react';
import { useCommissionRateStore } from '../stores/commissionRateStore';
import { CommissionRateCreateRequest } from '../types';
import { format, parseISO } from 'date-fns';

interface FormData {
  validFrom: string;
  rates: {
    softwareRental: number;
    softwareCare: number;
    apps: number;
    purchase: number;
  };
  description: string;
}

export const CommissionRates: React.FC = () => {
  const {
    commissionRates,
    loading,
    error,
    fetchCommissionRates,
    createCommissionRate,
    updateCommissionRate,
    deleteCommissionRate,
  } = useCommissionRateStore();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormData>({
    validFrom: new Date().toISOString().split('T')[0],
    rates: {
      softwareRental: 20.0,
      softwareCare: 20.0,
      apps: 20.0,
      purchase: 0.083333,
    },
    description: '',
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchCommissionRates();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    if (name.startsWith('rates.')) {
      const rateKey = name.split('.')[1];
      setFormData((prev) => ({
        ...prev,
        rates: {
          ...prev.rates,
          [rateKey]: parseFloat(value) || 0,
        },
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: value,
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setIsSubmitting(true);

    try {
      const payload: CommissionRateCreateRequest = {
        validFrom: new Date(formData.validFrom + 'T00:00:00').toISOString(),
        rates: formData.rates,
        description: formData.description,
      };

      if (editingId) {
        await updateCommissionRate(editingId, {
          validFrom: payload.validFrom,
          rates: payload.rates,
          description: payload.description,
        });
      } else {
        await createCommissionRate(payload);
      }

      // Reset form
      setFormData({
        validFrom: new Date().toISOString().split('T')[0],
        rates: {
          softwareRental: 20.0,
          softwareCare: 20.0,
          apps: 20.0,
          purchase: 0.083333,
        },
        description: '',
      });
      setIsFormOpen(false);
      setEditingId(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error saving commission rate';
      setFormError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (rate: any) => {
    setEditingId(rate.id);
    setFormData({
      validFrom: rate.validFrom.split('T')[0],
      rates: rate.rates,
      description: rate.description || '',
    });
    setIsFormOpen(true);
    setFormError(null);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Wirklich löschen?')) {
      try {
        await deleteCommissionRate(id);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Error deleting commission rate';
        setFormError(message);
      }
    }
  };

  const handleCancel = () => {
    setIsFormOpen(false);
    setEditingId(null);
    setFormData({
      validFrom: new Date().toISOString().split('T')[0],
      rates: {
        softwareRental: 20.0,
        softwareCare: 20.0,
        apps: 20.0,
        purchase: 0.083333,
      },
      description: '',
    });
    setFormError(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Provisionsätze</h1>
        {!isFormOpen && (
          <button
            onClick={() => setIsFormOpen(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Neuer Provisionsatz
          </button>
        )}
      </div>

      {/* Error Messages */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          {error}
        </div>
      )}
      {formError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          {formError}
        </div>
      )}

      {/* Form */}
      {isFormOpen && (
        <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
          <h2 className="text-xl font-semibold mb-4">
            {editingId ? 'Provisionsatz bearbeiten' : 'Neuer Provisionsatz'}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Valid From Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Gültig ab
              </label>
              <input
                type="date"
                name="validFrom"
                value={formData.validFrom}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              />
            </div>

            {/* Commission Rates */}
            <div className="grid grid-cols-2 gap-4 bg-blue-50 p-4 rounded-lg">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Software Miete (%)
                </label>
                <input
                  type="number"
                  name="rates.softwareRental"
                  value={formData.rates.softwareRental}
                  onChange={handleInputChange}
                  step="0.01"
                  min="0"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Software Pflege (%)
                </label>
                <input
                  type="number"
                  name="rates.softwareCare"
                  value={formData.rates.softwareCare}
                  onChange={handleInputChange}
                  step="0.01"
                  min="0"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Apps (%)
                </label>
                <input
                  type="number"
                  name="rates.apps"
                  value={formData.rates.apps}
                  onChange={handleInputChange}
                  step="0.01"
                  min="0"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Kauf Bestandsvertrag (%)
                </label>
                <input
                  type="number"
                  name="rates.purchase"
                  value={formData.rates.purchase}
                  onChange={handleInputChange}
                  step="0.000001"
                  min="0"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                />
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Beschreibung (optional)
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                placeholder="z.B. Erhöht ab Q3 2024"
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              />
            </div>

            {/* Buttons */}
            <div className="flex gap-2 pt-4">
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
              >
                {isSubmitting ? 'Speichern...' : 'Speichern'}
              </button>
              <button
                type="button"
                onClick={handleCancel}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Abbrechen
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Commission Rates List */}
      {!loading && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {commissionRates.length === 0 ? (
            <div className="p-6 text-center text-gray-500">
              Keine Provisionsätze vorhanden
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Gültig ab
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Software Miete
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Software Pflege
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Apps
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Kauf
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Beschreibung
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Aktionen
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {commissionRates
                    .sort((a, b) => new Date(b.validFrom).getTime() - new Date(a.validFrom).getTime())
                    .map((rate) => (
                      <tr key={rate.id} className="hover:bg-gray-50 transition">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {format(parseISO(rate.validFrom), 'dd.MM.yyyy')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-600">
                          {rate.rates.softwareRental.toFixed(2)}%
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-600">
                          {rate.rates.softwareCare.toFixed(2)}%
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-600">
                          {rate.rates.apps.toFixed(2)}%
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-600">
                          {rate.rates.purchase.toFixed(6)}%
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {rate.description || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                          <button
                            onClick={() => handleEdit(rate)}
                            className="text-blue-600 hover:text-blue-800 font-medium"
                          >
                            Bearbeiten
                          </button>
                          <button
                            onClick={() => handleDelete(rate.id)}
                            className="text-red-600 hover:text-red-800 font-medium"
                          >
                            Löschen
                          </button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {loading && <div className="text-center text-gray-500 py-8">Laden...</div>}
    </div>
  );
};

export default CommissionRates;
