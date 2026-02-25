import { useEffect, useState } from 'react';
import { useSettingsStore } from '../stores/settingsStore';
import { Settings as SettingsType, SettingsUpdateRequest, PriceIncrease, CommissionRate } from '../types';
import { formatDate } from '../utils/formatting';
import PriceIncreaseModal from '../components/PriceIncreaseModal';
import CommissionRateModal from '../components/CommissionRateModal';

function Settings() {
  const { settings, loading, error, fetchSettings, updateSettings, fetchPriceIncreases, priceIncreases, deletePriceIncrease } = useSettingsStore();
  const [formData, setFormData] = useState<SettingsType | null>(null);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [isPriceIncreaseModalOpen, setIsPriceIncreaseModalOpen] = useState(false);
  const [selectedPriceIncreaseForEdit, setSelectedPriceIncreaseForEdit] = useState<PriceIncrease | null>(null);
  const [activeTab, setActiveTab] = useState<'general' | 'price-increases' | 'commission-rates' | 'exit-payouts'>('general');
  const [commissionRates, setCommissionRates] = useState<CommissionRate[]>([]);
  const [commissionLoading, setCommissionLoading] = useState(false);
  const [isCommissionRateModalOpen, setIsCommissionRateModalOpen] = useState(false);
  const [selectedCommissionRateForEdit, setSelectedCommissionRateForEdit] = useState<CommissionRate | null>(null);

  useEffect(() => {
    fetchSettings();
    fetchPriceIncreases();
  }, [fetchSettings, fetchPriceIncreases]);

  useEffect(() => {
    if (activeTab === 'commission-rates') {
      loadCommissionRates();
    }
  }, [activeTab]);

  const loadCommissionRates = async () => {
    try {
      setCommissionLoading(true);
      const response = await fetch('/api/commission-rates/');
      const data = await response.json();
      setCommissionRates(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Fehler beim Laden der Provisionsätze:', err);
    } finally {
      setCommissionLoading(false);
    }
  };

  useEffect(() => {
    if (settings) {
      setFormData(settings);
    }
  }, [settings]);

  const handleSettingsChange = (field: string, value: any) => {
    if (!formData) return;

    if (field.includes('postContractMonths.')) {
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
        exitPayoutTiers: formData.exitPayoutTiers,
        exitPayoutByType: formData.exitPayoutByType,
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

  const handleDeleteCommissionRate = async (id: string) => {
    if (confirm('Möchtest du diesen Provisionsatz wirklich löschen?')) {
      try {
        await fetch(`/api/commission-rates/${id}`, { method: 'DELETE' });
        await loadCommissionRates();
      } catch (err) {
        alert('Fehler beim Löschen des Provisionsatzes');
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
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-green-700 font-medium">
          ✓ Erfolgreich gespeichert!
        </div>
      )}
      {saveStatus === 'error' && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 font-medium">
          ✗ Fehler beim Speichern
        </div>
      )}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          {error}
        </div>
      )}

      {/* Tabs Navigation */}
      <div className="bg-white rounded-t-lg border border-gray-200 border-b-0">
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab('general')}
            className={`px-6 py-4 font-medium text-sm transition ${
              activeTab === 'general'
                ? 'text-blue-600 border-b-2 border-blue-600 -mb-[2px]'
                : 'text-gray-700 hover:text-gray-900'
            }`}
          >
            Allgemeine Einstellungen
          </button>
          <button
            onClick={() => setActiveTab('price-increases')}
            className={`px-6 py-4 font-medium text-sm transition ${
              activeTab === 'price-increases'
                ? 'text-blue-600 border-b-2 border-blue-600 -mb-[2px]'
                : 'text-gray-700 hover:text-gray-900'
            }`}
          >
            Preiserhöhungen
          </button>
          <button
            onClick={() => setActiveTab('commission-rates')}
            className={`px-6 py-4 font-medium text-sm transition ${
              activeTab === 'commission-rates'
                ? 'text-blue-600 border-b-2 border-blue-600 -mb-[2px]'
                : 'text-gray-700 hover:text-gray-900'
            }`}
          >
            Provisionsätze
          </button>
          <button
            onClick={() => setActiveTab('exit-payouts')}
            className={`px-6 py-4 font-medium text-sm transition ${
              activeTab === 'exit-payouts'
                ? 'text-blue-600 border-b-2 border-blue-600 -mb-[2px]'
                : 'text-gray-700 hover:text-gray-900'
            }`}
          >
            Exit-Zahlungen
          </button>
        </div>
      </div>

      {/* Tab Content Container */}
      <div className="bg-white rounded-b-lg border border-t-0 border-gray-200 p-6">
        {/* Tab 1: General Settings */}
        {activeTab === 'general' && formData && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-gray-900">Allgemeine Einstellungen</h2>

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

            <div className="border-t pt-6">
              <button
                onClick={handleSaveSettings}
                disabled={saveStatus === 'saving'}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition disabled:opacity-50 font-medium"
              >
                {saveStatus === 'saving' ? 'Speichern...' : 'Speichern'}
              </button>
            </div>
          </div>
        )}

        {/* Tab 2: Price Increases */}
        {activeTab === 'price-increases' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
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
                            className="inline-flex items-center justify-center w-8 h-8 rounded hover:bg-blue-100 text-blue-600 hover:text-blue-800 transition"
                            title="Bearbeiten"
                          >
                            ✏️
                          </button>
                          <button
                            onClick={() => handleDeletePriceIncrease(increase.id)}
                            className="inline-flex items-center justify-center w-8 h-8 rounded hover:bg-red-100 text-red-600 hover:text-red-800 transition"
                            title="Löschen"
                          >
                            🗑️
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

        {/* Tab 3: Commission Rates */}
        {activeTab === 'commission-rates' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-900">Provisionsätze</h2>
              <button
                onClick={() => {
                  setSelectedCommissionRateForEdit(null);
                  setIsCommissionRateModalOpen(true);
                }}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-medium text-sm"
              >
                + Neuer Provisionsatz
              </button>
            </div>

            {commissionLoading ? (
              <div className="text-center py-8">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <p className="text-gray-600 mt-4">Laden...</p>
              </div>
            ) : !commissionRates || commissionRates.length === 0 ? (
              <p className="text-gray-500 text-center py-8">Keine Provisionsätze vorhanden</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Gültig ab</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-700 uppercase">Software Miete</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-700 uppercase">Software Pflege</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-700 uppercase">Apps</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-700 uppercase">Kauf</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-700 uppercase">Cloud</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Beschreibung</th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-700 uppercase">Aktionen</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {commissionRates.map((rate) => (
                      <tr key={rate.id} className="hover:bg-gray-50 transition">
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">{formatDate(rate.validFrom)}</td>
                        <td className="px-6 py-4 text-sm text-right text-gray-600">{(rate.rates.softwareRental || 0).toFixed(2)}%</td>
                        <td className="px-6 py-4 text-sm text-right text-gray-600">{(rate.rates.softwareCare || 0).toFixed(2)}%</td>
                        <td className="px-6 py-4 text-sm text-right text-gray-600">{(rate.rates.apps || 0).toFixed(2)}%</td>
                        <td className="px-6 py-4 text-sm text-right text-gray-600">{(rate.rates.purchase || 0).toFixed(2)}%</td>
                        <td className="px-6 py-4 text-sm text-right text-gray-600">{(rate.rates.cloud || 0).toFixed(2)}%</td>
                        <td className="px-6 py-4 text-sm text-gray-600">{rate.description || '—'}</td>
                        <td className="px-6 py-4 text-center text-sm space-x-2">
                          <button
                            onClick={() => {
                              setSelectedCommissionRateForEdit(rate);
                              setIsCommissionRateModalOpen(true);
                            }}
                            className="inline-flex items-center justify-center w-8 h-8 rounded hover:bg-blue-100 text-blue-600 hover:text-blue-800 transition"
                            title="Bearbeiten"
                          >
                            ✏️
                          </button>
                          <button
                            onClick={() => handleDeleteCommissionRate(rate.id)}
                            className="inline-flex items-center justify-center w-8 h-8 rounded hover:bg-red-100 text-red-600 hover:text-red-800 transition"
                            title="Löschen"
                          >
                            🗑️
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
        
        {/* Tab 4: Exit Payouts */}
        {activeTab === 'exit-payouts' && formData && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-gray-900">Exit-Zahlungen</h2>
            
            {/* Exit Payout Tiers - Arbeitsplätze-Staffel */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Staffel nach Arbeitsplätzen</h3>
              <p className="text-sm text-gray-600 mb-4">
                Je nach Anzahl der Arbeitsplätze werden unterschiedlich viele Monate für die Exit-Zahlung berechnet.
              </p>
              
              {/* Staffel-Tabelle */}
              <div className="space-y-2 mb-4">
                {(formData.exitPayoutTiers || []).map((tier, index) => (
                  <div key={index} className="flex items-center gap-2 bg-gray-50 p-3 rounded-lg">
                    <span className="text-sm text-gray-600 w-6">{index + 1}.</span>
                    <input
                      type="number"
                      min="1"
                      value={tier.minSeats}
                      onChange={(e) => {
                        const newTiers = [...(formData.exitPayoutTiers || [])];
                        newTiers[index] = { ...tier, minSeats: parseInt(e.target.value) || 1 };
                        setFormData({ ...formData, exitPayoutTiers: newTiers });
                      }}
                      className="w-20 px-2 py-1 border border-gray-300 rounded text-sm"
                      placeholder="Von"
                    />
                    <span className="text-sm text-gray-500">bis</span>
                    <input
                      type="number"
                      min="1"
                      value={tier.maxSeats}
                      onChange={(e) => {
                        const newTiers = [...(formData.exitPayoutTiers || [])];
                        newTiers[index] = { ...tier, maxSeats: parseInt(e.target.value) || 1 };
                        setFormData({ ...formData, exitPayoutTiers: newTiers });
                      }}
                      className="w-20 px-2 py-1 border border-gray-300 rounded text-sm"
                      placeholder="Bis"
                    />
                    <span className="text-sm text-gray-500">Arbeitsplätze →</span>
                    <input
                      type="number"
                      min="1"
                      value={tier.months}
                      onChange={(e) => {
                        const newTiers = [...(formData.exitPayoutTiers || [])];
                        newTiers[index] = { ...tier, months: parseInt(e.target.value) || 1 };
                        setFormData({ ...formData, exitPayoutTiers: newTiers });
                      }}
                      className="w-20 px-2 py-1 border border-gray-300 rounded text-sm"
                      placeholder="Monate"
                    />
                    <span className="text-sm text-gray-500">Monate</span>
                    <button
                      onClick={() => {
                        const newTiers = (formData.exitPayoutTiers || []).filter((_, i) => i !== index);
                        setFormData({ ...formData, exitPayoutTiers: newTiers });
                      }}
                      className="ml-auto px-2 py-1 text-red-600 hover:bg-red-50 rounded text-sm"
                      title="Staffel löschen"
                    >
                      🗑️
                    </button>
                  </div>
                ))}
              </div>
              
              <button
                onClick={() => {
                  const lastTier = (formData.exitPayoutTiers || []).slice(-1)[0];
                  const newTier = {
                    minSeats: lastTier ? lastTier.maxSeats + 1 : 1,
                    maxSeats: lastTier ? lastTier.maxSeats + 10 : 10,
                    months: 48
                  };
                  setFormData({ 
                    ...formData, 
                    exitPayoutTiers: [...(formData.exitPayoutTiers || []), newTier] 
                  });
                }}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-sm font-medium"
              >
                + Neue Staffel
              </button>
            </div>
            
            {/* Exit Payout by Type */}
            <div className="border-t pt-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Exit-Zahlungen pro Vertragstyp</h3>
              <p className="text-sm text-gray-600 mb-4">
                Aktiviere/Deaktiviere Exit-Zahlungen für jeden Vertragstyp und konfiguriere zusätzliche Monate.
              </p>
              
              <div className="space-y-3">
                {[
                  { key: 'softwareRental', label: 'Software Miete' },
                  { key: 'softwareCare', label: 'Software Pflege' },
                  { key: 'apps', label: 'Apps' },
                  { key: 'purchase', label: 'Kauf Bestandsvertrag' },
                  { key: 'cloud', label: 'Cloud' }
                ].map(({ key, label }) => {
                  const config = formData.exitPayoutByType?.[key as keyof typeof formData.exitPayoutByType] || { enabled: false, additionalMonths: 0 };
                  return (
                    <div key={key} className="flex items-center gap-4 bg-gray-50 p-3 rounded-lg">
                      <label className="flex items-center gap-2 flex-1">
                        <input
                          type="checkbox"
                          checked={config.enabled}
                          onChange={(e) => {
                            setFormData({
                              ...formData,
                              exitPayoutByType: {
                                ...formData.exitPayoutByType,
                                [key]: { ...config, enabled: e.target.checked }
                              }
                            });
                          }}
                          className="rounded border-gray-300"
                        />
                        <span className="text-sm font-medium text-gray-700">{label}</span>
                      </label>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-500">+ zusätzliche Monate:</span>
                        <input
                          type="number"
                          min="0"
                          value={config.additionalMonths}
                          onChange={(e) => {
                            setFormData({
                              ...formData,
                              exitPayoutByType: {
                                ...formData.exitPayoutByType,
                                [key]: { ...config, additionalMonths: parseInt(e.target.value) || 0 }
                              }
                            });
                          }}
                          disabled={!config.enabled}
                          className="w-20 px-2 py-1 border border-gray-300 rounded text-sm disabled:bg-gray-100 disabled:text-gray-400"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            
            {/* Exit Payout Months */}
            <div className="border-t pt-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Zahlungsmonate nach Vertragsende</h3>
              <p className="text-sm text-gray-600 mb-4">
                Nach Vertragsende wird noch X Monate lang Provision gezahlt
              </p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Software Miete (Monate)
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
                    Software Pflege (Monate)
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
                    Apps (Monate)
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
                    Kauf Bestandsvertrag (Monate)
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

            <div className="border-t pt-6">
              <button
                onClick={handleSaveSettings}
                disabled={saveStatus === 'saving'}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition disabled:opacity-50 font-medium"
              >
                {saveStatus === 'saving' ? 'Speichern...' : 'Speichern'}
              </button>
            </div>
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

      <CommissionRateModal
        isOpen={isCommissionRateModalOpen}
        onClose={() => {
          setIsCommissionRateModalOpen(false);
          setSelectedCommissionRateForEdit(null);
        }}
        commissionRate={selectedCommissionRateForEdit}
        onSuccess={() => {
          loadCommissionRates();
          setIsCommissionRateModalOpen(false);
          setSelectedCommissionRateForEdit(null);
        }}
      />
    </div>
  );
}

export default Settings;
