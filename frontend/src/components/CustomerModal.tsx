import { useState, useEffect, useRef } from 'react';
import { Customer, CustomerCreateRequest, CustomerUpdateRequest } from '../types';
import { useCustomerStore } from '../stores/customerStore';

interface CustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer?: Customer | null;
  onSuccess?: () => void;
}

const CustomerModal: React.FC<CustomerModalProps> = ({ isOpen, onClose, customer, onSuccess }) => {
  const [formData, setFormData] = useState({
    name: '',
    name2: '',
    ort: '',
    plz: '',
    kundennummer: '',
    land: 'Deutschland',
  });
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const kundennummerInputRef = useRef<HTMLInputElement>(null);

  const createCustomer = useCustomerStore((state) => state.createCustomer);
  const updateCustomer = useCustomerStore((state) => state.updateCustomer);

  useEffect(() => {
    if (customer) {
      setFormData({
        name: customer.name || '',
        name2: customer.name2 || '',
        ort: customer.ort || '',
        plz: customer.plz || '',
        kundennummer: customer.kundennummer || '',
        land: customer.land || 'Deutschland',
      });
    } else {
      setFormData({
        name: '',
        name2: '',
        ort: '',
        plz: '',
        kundennummer: '',
        land: 'Deutschland',
      });
      // Bei neuem Kunden: Focus auf kundennummer Feld
      setTimeout(() => {
        kundennummerInputRef.current?.focus();
      }, 100);
    }
    setError(null);
  }, [customer, isOpen]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    
    // Validierung für numerische Felder
    if (name === 'plz' || name === 'kundennummer') {
      // Nur Ziffern erlauben
      if (value && !/^\d*$/.test(value)) {
        return;
      }
    }
    
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      // Die Prüfung auf Duplikate erfolgt im Backend - dort ist die Datenbank immer aktuell
      // (Die lokale Prüfung wurde entfernt, da der Store veraltete Daten haben kann)

      if (customer) {
        await updateCustomer(customer.id, formData as CustomerUpdateRequest);
      } else {
        // Bei Neukunden: name2 entfernen, wenn leer
        const { name2, ...submitData } = formData;
        const finalData = {
          ...submitData,
          ...(name2 ? { name2 } : {}),
        };
        await createCustomer(finalData as CustomerCreateRequest);
      }
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">
            {customer ? 'Kunde bearbeiten' : 'Neuer Kunde'}
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Kundennummer (nur Ziffern)
            </label>
            <input
              ref={kundennummerInputRef}
              type="text"
              name="kundennummer"
              value={formData.kundennummer}
              onChange={handleChange}
              disabled={!!customer} // Kundennummer nicht änderbar
              maxLength={20}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none disabled:bg-gray-100"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Name
            </label>
            <input
              autoFocus
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Name 2
            </label>
            <input
              type="text"
              name="name2"
              value={formData.name2}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                PLZ
              </label>
              <input
                type="text"
                name="plz"
                value={formData.plz}
                onChange={handleChange}
                maxLength={10}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                required
              />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Ort
              </label>
              <input
                type="text"
                name="ort"
                value={formData.ort}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Land
            </label>
            <input
              type="text"
              name="land"
              value={formData.land}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              required
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
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
              disabled={isLoading}
            >
              {isLoading ? 'Speichert...' : 'Speichern'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CustomerModal;
