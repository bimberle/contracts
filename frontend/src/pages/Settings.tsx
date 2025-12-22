import { useEffect, useState } from 'react';
import { useSettingsStore } from '../stores/settingsStore';
import { Settings as SettingsType, SettingsUpdateRequest, PriceIncreaseCreateRequest } from '../types';

function Settings() {
  const { settings, priceIncreases, loading, error, fetchSettings, updateSettings, fetchPriceIncreases, createPriceIncrease, deletePriceIncrease } = useSettingsStore();
  const [formData, setFormData] = useState<SettingsType | null>(null);
  const [newPriceIncrease, setNewPriceIncrease] = useState<PriceIncreaseCreateRequest>({
    valid_from: new Date().toISOString(),
    factor: 0,
    lock_in_months: 24,
    applies_to_types: ['rental'],
    description: '',
  });
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');

  useEffect(() => {
    const loadData = async () => {
      await Promise.all([fetchSettings(), fetchPriceIncreases()]);
    };
    loadData();
  }, [fetchSettings, fetchPriceIncreases]);

  useEffect(() => {
    if (settings) {
      setFormData(settings);
    }
  }, [settings]);

  const handleSettingsChange = (field: string, value: any) => {
    if (!formData) return;

    if (field.includes('commission_rates.') || field.includes('post_contract_months.')) {
      const [section, key] = field.split('.');
      setFormData({
        ...formData,
        [section]: {
          ...formData[section as keyof typeof formData],
          [key]: value,
        },
      });
    } else {
      setFormData({
        ...formData,
        [field]: value,
      });
    }
  };

  const handleSaveSettings = async () => {
    if (!formData) return;

    try {
      setSaveStatus('saving');
      const updateData: SettingsUpdateRequest = {
        founder_delay_months: formData.founder_delay_months,
        commission_rates: formData.commission_rates,
        post_contract_months: formData.post_contract_months,
        min_contract_months_for_payout: formData.min_contract_months_for_payout,
      };
      await updateSettings(updateData);
      setSaveStatus('success');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch {
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    }
  };

  const handleAddPriceIncrease = async () => {
    try {
      setSaveStatus('saving');
      await createPriceIncrease(newPriceIncrease);
      setNewPriceIncrease({
        valid_from: new Date().toISOString(),
        factor: 0,
        lock_in_months: 24,
        applies_to_types: ['rental'],
        description: '',
      });
      setSaveStatus('success');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch {
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    }
  };

  if (loading && !formData) {
    return (
      <div className="text-center py-12">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <p className="text-gray-600 mt-4">Einstellungen werden geladen...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Einstellungen</h1>
        <p className="text-gray-600 mt-2">Verwalten Sie die Anwendungseinstellungen</p>
      </div>

      {/* Status Messages */}
      {saveStatus === 'success' && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-green-700">
          ✓ Erfolgreich gespeichert!
        </div>
      )}
      {saveStatus === 'error' && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          ✗ Fehler beim Speichern
        </div>
      )}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          {error}
        </div>
      )}

      {/* General Settings */}
      {formData && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Allgemeine Einstellungen</h2>

          <div className="space-y-6">
            {/* Founder Delay */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Existenzgründer-Verzögerung (Monate)
              </label>
              <input
                type="number"
                value={formData.founder_delay_months}
                onChange={(e) =>
                  handleSettingsChange('founder_delay_months', parseInt(e.target.value))
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              />
              <p className="text-sm text-gray-500 mt-2">
                Neue Mietverträge starten diese Anzahl von Monaten später
              </p>
            </div>

            {/* Commission Rates */}
            <div className="border-t pt-6">
              <h3 className="font-semibold text-gray-900 mb-4">Provisionssätze (%)</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Miete
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={formData.commission_rates.rental}
                    onChange={(e) =>
                      handleSettingsChange('commission_rates.rental', parseFloat(e.target.value))
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Software-Pflege
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={formData.commission_rates['software-care']}
                    onChange={(e) =>
                      handleSettingsChange('commission_rates.software-care', parseFloat(e.target.value))
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Post-Contract Months */}
            <div className="border-t pt-6">
              <h3 className="font-semibold text-gray-900 mb-4">Post-Vertrag Monate</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Miete
                  </label>
                  <input
                    type="number"
                    value={formData.post_contract_months.rental}
                    onChange={(e) =>
                      handleSettingsChange('post_contract_months.rental', parseInt(e.target.value))
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Software-Pflege
                  </label>
                  <input
                    type="number"
                    value={formData.post_contract_months['software-care']}
                    onChange={(e) =>
                      handleSettingsChange('post_contract_months.software-care', parseInt(e.target.value))
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Min Contract Months */}
            <div className="border-t pt-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Minimale Vertragslaufzeit für volle Auszahlung (Monate)
              </label>
              <input
                type="number"
                value={formData.min_contract_months_for_payout}
                onChange={(e) =>
                  handleSettingsChange('min_contract_months_for_payout', parseInt(e.target.value))
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              />
              <p className="text-sm text-gray-500 mt-2">
                Verträge unter dieser Dauer werden bei Ausscheiden mit Restprovision ausgezahlt
              </p>
            </div>

            <button
              onClick={handleSaveSettings}
              disabled={saveStatus === 'saving'}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
            >
              {saveStatus === 'saving' ? 'Speichern...' : 'Speichern'}
            </button>
          </div>
        </div>
      )}

      {/* Price Increases */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-6">Preiserhöhungen</h2>

        {/* List */}
        <div className="mb-6">
          {priceIncreases.length === 0 ? (
            <p className="text-gray-500 text-center py-8">Keine Preiserhöhungen definiert</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                      Gültig ab
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                      Erhöhung (%)
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                      Bestandsschutz (Monate)
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                      Anwendbar auf
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                      Beschreibung
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                      Aktionen
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {priceIncreases.map((pi) => (
                    <tr key={pi.id}>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {new Date(pi.valid_from).toLocaleDateString('de-DE')}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">{pi.factor}%</td>
                      <td className="px-6 py-4 text-sm text-gray-900">{pi.lock_in_months}</td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {pi.applies_to_types.includes('rental') && <span>Miete</span>}
                        {pi.applies_to_types.includes('software-care') && (
                          <span>{pi.applies_to_types.includes('rental') ? ', ' : ''}Software-Pflege</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">{pi.description}</td>
                      <td className="px-6 py-4 text-sm">
                        <button
                          onClick={() => deletePriceIncrease(pi.id)}
                          className="text-red-600 hover:text-red-800 transition"
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

        {/* Add New */}
        <div className="border-t pt-6">
          <h3 className="font-semibold text-gray-900 mb-4">Neue Preiserhöhung</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Gültig ab
              </label>
              <input
                type="datetime-local"
                value={newPriceIncrease.valid_from.slice(0, 16)}
                onChange={(e) =>
                  setNewPriceIncrease({
                    ...newPriceIncrease,
                    valid_from: new Date(e.target.value).toISOString(),
                  })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Erhöhung (%)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={newPriceIncrease.factor}
                  onChange={(e) =>
                    setNewPriceIncrease({
                      ...newPriceIncrease,
                      factor: parseFloat(e.target.value),
                    })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Bestandsschutz (Monate)
                </label>
                <input
                  type="number"
                  value={newPriceIncrease.lock_in_months}
                  onChange={(e) =>
                    setNewPriceIncrease({
                      ...newPriceIncrease,
                      lock_in_months: parseInt(e.target.value),
                    })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Beschreibung
              </label>
              <input
                type="text"
                placeholder="z.B. Inflation 2025"
                value={newPriceIncrease.description}
                onChange={(e) =>
                  setNewPriceIncrease({
                    ...newPriceIncrease,
                    description: e.target.value,
                  })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              />
            </div>
            <button
              onClick={handleAddPriceIncrease}
              disabled={saveStatus === 'saving'}
              className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition disabled:opacity-50"
            >
              {saveStatus === 'saving' ? 'Hinzufügen...' : '+ Preiserhöhung hinzufügen'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Settings;
