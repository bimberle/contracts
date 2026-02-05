import { useEffect, useState } from 'react';
import { useSettingsStore } from '../stores/settingsStore';
import { formatDate } from '../utils/formatting';
import PriceIncreaseModal from '../components/PriceIncreaseModal';
import { PriceIncrease } from '../types';

// Hilfsfunktion zum Lesen von amountIncreases (unterstützt snake_case und camelCase)
const getAmountIncrease = (pi: PriceIncrease, key: 'softwareRental' | 'softwareCare' | 'apps' | 'purchase' | 'cloud'): number => {
  const amounts = pi.amountIncreases as unknown as Record<string, number>;
  if (!amounts) return 0;
  
  const snakeMap: Record<string, string> = {
    softwareRental: 'software_rental',
    softwareCare: 'software_care',
    apps: 'apps',
    purchase: 'purchase',
    cloud: 'cloud',
  };
  
  return amounts[key] ?? amounts[snakeMap[key]] ?? 0;
};

// Formatiert den Prozentsatz - zeigt "—" bei 0
const formatPercent = (value: number): string => {
  if (value === 0) return '—';
  return `+${value}%`;
};

function PriceIncreases() {
  const { priceIncreases, loading, fetchPriceIncreases, deletePriceIncrease } = useSettingsStore();
  const [isPriceIncreaseModalOpen, setIsPriceIncreaseModalOpen] = useState(false);
  const [sortBy, setSortBy] = useState<'validFrom' | 'softwareRental' | 'softwareCare' | 'apps' | 'purchase' | 'cloud' | 'lockInMonths' | 'description'>('validFrom');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    fetchPriceIncreases();
  }, [fetchPriceIncreases]);

  // Sortierte Preiserhöhungen
  const sortedPriceIncreases = [...priceIncreases].sort((a, b) => {
    let comparison = 0;
    switch (sortBy) {
      case 'validFrom':
        comparison = new Date(a.validFrom).getTime() - new Date(b.validFrom).getTime();
        break;
      case 'softwareRental':
        comparison = getAmountIncrease(a, 'softwareRental') - getAmountIncrease(b, 'softwareRental');
        break;
      case 'softwareCare':
        comparison = getAmountIncrease(a, 'softwareCare') - getAmountIncrease(b, 'softwareCare');
        break;
      case 'apps':
        comparison = getAmountIncrease(a, 'apps') - getAmountIncrease(b, 'apps');
        break;
      case 'purchase':
        comparison = getAmountIncrease(a, 'purchase') - getAmountIncrease(b, 'purchase');
        break;
      case 'cloud':
        comparison = getAmountIncrease(a, 'cloud') - getAmountIncrease(b, 'cloud');
        break;
      case 'lockInMonths':
        comparison = a.lockInMonths - b.lockInMonths;
        break;
      case 'description':
        comparison = (a.description || '').localeCompare(b.description || '');
        break;
      default:
        comparison = 0;
    }
    return sortDirection === 'asc' ? comparison : -comparison;
  });

  // Sortier-Handler für Spaltenköpfe
  const handleSort = (column: typeof sortBy) => {
    if (sortBy === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortDirection('asc');
    }
  };

  // Sortierbare Spaltenüberschrift Komponente
  const SortHeader = ({ column, children }: { column: typeof sortBy; children: React.ReactNode }) => (
    <th
      onClick={() => handleSort(column)}
      className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase cursor-pointer hover:bg-gray-100 select-none"
    >
      <div className="flex items-center gap-1">
        {children}
        {sortBy === column && (
          <span className="text-blue-600">{sortDirection === 'asc' ? '▲' : '▼'}</span>
        )}
      </div>
    </th>
  );

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
                  <SortHeader column="validFrom">Gültig ab</SortHeader>
                  <SortHeader column="softwareRental">Software Miete (%)</SortHeader>
                  <SortHeader column="softwareCare">Software Pflege (%)</SortHeader>
                  <SortHeader column="apps">Apps (%)</SortHeader>
                  <SortHeader column="purchase">Kauf (%)</SortHeader>
                  <SortHeader column="cloud">Cloud (%)</SortHeader>
                  <SortHeader column="lockInMonths">Bestandsschutz (Monate)</SortHeader>
                  <SortHeader column="description">Beschreibung</SortHeader>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                    Aktionen
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {sortedPriceIncreases.map((pi) => (
                  <tr key={pi.id}>
                    <td className="px-6 py-4 text-sm text-gray-900 font-medium">
                      {formatDate(pi.validFrom)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {formatPercent(getAmountIncrease(pi, 'softwareRental'))}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {formatPercent(getAmountIncrease(pi, 'softwareCare'))}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {formatPercent(getAmountIncrease(pi, 'apps'))}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {formatPercent(getAmountIncrease(pi, 'purchase'))}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {formatPercent(getAmountIncrease(pi, 'cloud'))}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">{pi.lockInMonths}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{pi.description || '—'}</td>
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
