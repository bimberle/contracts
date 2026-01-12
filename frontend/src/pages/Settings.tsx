import { useEffect, useState } from 'react';
import { useSettingsStore } from '../stores/settingsStore';
import { Settings as SettingsType, SettingsUpdateRequest } from '../types';

function Settings() {
  const { settings, loading, error, fetchSettings, updateSettings } = useSettingsStore();
  const [formData, setFormData] = useState<SettingsType | null>(null);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

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
        founderDelayMonths: formData.founderDelayMonths,
        commissionRates: formData.commissionRates,
        postContractMonths: formData.postContractMonths,
        minContractMonthsForPayout: formData.minContractMonthsForPayout,
      };
      await updateSettings(updateData);
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
                autoFocus
                type="number"
                value={formData.founderDelayMonths}
                onChange={(e) =>
                  handleSettingsChange('founderDelayMonths', parseInt(e.target.value))
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
                    value={formData.commissionRates.rental}
                    onChange={(e) =>
                      handleSettingsChange('commissionRates.rental', parseFloat(e.target.value))
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
                    value={formData.commissionRates['software-care']}
                    onChange={(e) =>
                      handleSettingsChange('commissionRates.software-care', parseFloat(e.target.value))
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
                    value={formData.postContractMonths.rental}
                    onChange={(e) =>
                      handleSettingsChange('postContractMonths.rental', parseInt(e.target.value))
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
                    value={formData.postContractMonths['software-care']}
                    onChange={(e) =>
                      handleSettingsChange('postContractMonths.software-care', parseInt(e.target.value))
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
                value={formData.minContractMonthsForPayout}
                onChange={(e) =>
                  handleSettingsChange('minContractMonthsForPayout', parseInt(e.target.value))
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
    </div>
  );
}

export default Settings;
