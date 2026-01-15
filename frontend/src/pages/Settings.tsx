import { useEffect, useState } from 'react';
import { useSettingsStore } from '../stores/settingsStore';
import { Settings as SettingsType, SettingsUpdateRequest, PriceIncrease } from '../types';
import { formatDate } from '../utils/formatting';
import PriceIncreaseModal from '../components/PriceIncreaseModal';

function Settings() {
  const { settings, loading, error, fetchSettings, updateSettings, fetchPriceIncreases, priceIncreases, deletePriceIncrease } = useSettingsStore();
  const [formData, setFormData] = useState<SettingsType | null>(null);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [isPriceIncreaseModalOpen, setIsPriceIncreaseModalOpen] = useState(false);
  const [selectedPriceIncreaseForEdit, setSelectedPriceIncreaseForEdit] = useState<PriceIncrease | null>(null);

  useEffect(() => {
    fetchSettings();
    fetchPriceIncreases();
  }, [fetchSettings, fetchPriceIncreases]);

  useEffect(() => {
    if (settings) {
      setFormData(settings);
    }
  }, [settings]);

  const handleSettingsChange = (field: string, value: any) => {
    if (!formData) return;

    if (field.includes('post_contract_months.')) {
      const [section, key] = field.split('.');
      const sectionData = formData[section as keyof typeof formData];
      if (typeof sectionData === 'object' && sectionData !== null) {
        setFormData({
          ...formData,
          [section]: {
            ...(sectionData as Record<string, any>),
            [key]: value,
          },
        });
      }
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
        postContractMonths: formData.postContractMonths,
        minContractMonthsForPayout: formData.minContractMonthsForPayout,
        personalTaxRate: formData.personalTaxRate,
      };
      await updateSettings(updateData);
      setSaveStatus('success');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch {
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    }
  };

  const handleDeletePriceIncrease = async (id: string) => {
    if (confirm('Möchtest du diese Preiserhöhung wirklich löschen?')) {
      try {
        await deletePriceIncrease(id);
        await fetchPriceIncreases();
      } catch (err) {
        alert('Fehler beim Löschen der Preiserhöhung');
      }
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
                Existenzgründer-Rabatt (Monate)
              </label>
              <input
                type="number"
                value={formData.founderDelayMonths}
                onChange={(e) =>
                  handleSettingsChange('founderDelayMonths', parseInt(e.target.value))
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              />
              <p className="text-sm text-gray-500 mt-2">
                Neue Mietverträge starten dieser Anzahl Monate später
              </p>
            </div>

            {/* Post Contract Months */}
            <div className="border-t pt-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Post-Contract Monate</h3>
              <p className="text-sm text-gray-600 mb-4">
                Provision wird noch X Monate nach Vertragsende gezahlt
              </p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Software Miete
                  </label>
                  <input
                    type="number"
                    value={formData.postContractMonths.softwareRental}
                    onChange={(e) =>
                      handleSettingsChange(
                        'postContractMonths.softwareRental',
                        parseInt(e.target.value)
                      )
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Software Pflege
                  </label>
                  <input
                    type="number"
                    value={formData.postContractMonths.softwareCare}
                    onChange={(e) =>
                      handleSettingsChange('postContractMonths.softwareCare', parseInt(e.target.value))
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Apps
                  </label>
                  <input
                    type="number"
                    value={formData.postContractMonths.apps}
                    onChange={(e) =>
                      handleSettingsChange('postContractMonths.apps', parseInt(e.target.value))
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Kauf
                  </label>
                  <input
                    type="number"
                    value={formData.postContractMonths.purchase}
                    onChange={(e) =>
                      handleSettingsChange('postContractMonths.purchase', parseInt(e.target.value))
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

            {/* Personal Tax Rate */}
            <div className="border-t pt-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Persönlicher Steuersatz (%)
              </label>
              <input
                type="number"
                step="0.1"
                min="0"
                max="100"
                value={formData.personalTaxRate}
                onChange={(e) =>
                  handleSettingsChange('personalTaxRate', parseFloat(e.target.value))
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              />
              <p className="text-sm text-gray-500 mt-2">
                Ihr persönlicher Einkommensteuersatz für die Netto-Gehalt-Berechnung (z.B. 42)
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

      {/* Price Increases Section */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-gray-900">Preiserhöhungen</h2>
          <button
            onClick={() => {
              setSelectedPriceIncreaseForEdit(null);
              setIsPriceIncreaseModalOpen(true);
            }}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition text-sm font-medium"
          >
            + Neue Preiserhöhung
          </button>
        </div>

        {!priceIncreases || priceIncreases.length === 0 ? (
          <p className="text-gray-500 text-center py-8">Keine Preiserhöhungen vorhanden</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Gültig ab</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Software Miete</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Software Pflege</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Apps</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Bestandsvertrag</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Bestandsschutz</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Beschreibung</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-700 uppercase">Aktionen</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {priceIncreases.map((increase) => (
                  <tr key={increase.id} className="hover:bg-gray-50 transition">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{formatDate(increase.validFrom)}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {increase.amountIncreases.softwareRental > 0 ? `+${increase.amountIncreases.softwareRental.toFixed(1)}%` : '—'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {increase.amountIncreases.softwareCare > 0 ? `+${increase.amountIncreases.softwareCare.toFixed(1)}%` : '—'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {increase.amountIncreases.apps > 0 ? `+${increase.amountIncreases.apps.toFixed(1)}%` : '—'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {increase.amountIncreases.purchase > 0 ? `+${increase.amountIncreases.purchase.toFixed(1)}%` : '—'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{increase.lockInMonths} Monate</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{increase.description || '—'}</td>
                    <td className="px-6 py-4 text-center text-sm space-x-2">
                      <button
                        onClick={() => {
                          setSelectedPriceIncreaseForEdit(increase);
                          setIsPriceIncreaseModalOpen(true);
                        }}
                        className="text-blue-600 hover:text-blue-800 transition font-medium"
                      >
                        Bearbeiten
                      </button>
                      <button
                        onClick={() => handleDeletePriceIncrease(increase.id)}
                        className="text-red-600 hover:text-red-800 transition font-medium"
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

      <PriceIncreaseModal
        isOpen={isPriceIncreaseModalOpen}
        onClose={() => {
          setIsPriceIncreaseModalOpen(false);
          setSelectedPriceIncreaseForEdit(null);
        }}
        priceIncrease={selectedPriceIncreaseForEdit}
        onSuccess={() => {
          fetchPriceIncreases();
          setIsPriceIncreaseModalOpen(false);
          setSelectedPriceIncreaseForEdit(null);
        }}
      />
    </div>
  );
}

export default Settings;
