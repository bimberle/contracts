import { useEffect, useState } from 'react';
import { useSettingsStore } from '../stores/settingsStore';
import PriceIncreaseModal from '../components/PriceIncreaseModal';

function PriceIncreases() {
  const { priceIncreases, loading, fetchPriceIncreases, deletePriceIncrease } = useSettingsStore();
  const [isPriceIncreaseModalOpen, setIsPriceIncreaseModalOpen] = useState(false);

  useEffect(() => {
    fetchPriceIncreases();
  }, [fetchPriceIncreases]);

  // Hilfsfunktion zur sicheren Datumformatierung
  const formatDate = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return 'Ungültiges Datum';
      }
      return date.toLocaleDateString('de-DE');
    } catch {
      return 'Ungültiges Datum';
    }
  };

  if (loading && priceIncreases.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <p className="text-gray-600 mt-4">Preiserhöhungen werden geladen...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Preiserhöhungen</h1>
        <p className="text-gray-600 mt-2">Verwalten Sie die Preiserhöhungen für Ihre Verträge</p>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3">
        <button
          onClick={() => setIsPriceIncreaseModalOpen(true)}
          className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition"
        >
          + Neue Preiserhöhung
        </button>
      </div>

      {/* Existing Price Increases */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-6">Bestehende Preiserhöhungen</h2>

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
                      {formatDate(pi.validFrom)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 font-semibold">
                      {pi.factor > 0 ? '+' : ''}{pi.factor}%
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">{pi.lockInMonths}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {pi.appliesToTypes.map((type) => (
                        <span key={type} className="inline-block bg-blue-100 text-blue-800 px-2 py-1 rounded mr-2 text-xs">
                          {type === 'rental' ? 'Miete' : 'Software-Pflege'}
                        </span>
                      ))}
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

      {/* Modal */}
      <PriceIncreaseModal
        isOpen={isPriceIncreaseModalOpen}
        onClose={() => setIsPriceIncreaseModalOpen(false)}
        onSuccess={() => {
          setIsPriceIncreaseModalOpen(false);
          fetchPriceIncreases();
        }}
      />
    </div>
  );
}

export default PriceIncreases;
