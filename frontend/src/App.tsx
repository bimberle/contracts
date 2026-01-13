import { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { useCustomerStore } from './stores/customerStore';
import { useSettingsStore } from './stores/settingsStore';
import api from './services/api';
import Dashboard from './pages/Dashboard';
import CustomerDetail from './pages/CustomerDetail';
import Settings from './pages/Settings';
import PriceIncreases from './pages/PriceIncreases';
import CommissionRates from './pages/CommissionRates';
import Forecast from './pages/Forecast';
import './App.css';

function App() {
  const [isHealthy, setIsHealthy] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const fetchCustomers = useCustomerStore((state) => state.fetchCustomers);
  const fetchSettings = useSettingsStore((state) => state.fetchSettings);
  const fetchPriceIncreases = useSettingsStore((state) => state.fetchPriceIncreases);

  useEffect(() => {
    // Check API health and load initial data
    const initializeApp = async () => {
      try {
        const healthy = await api.healthCheck();
        setIsHealthy(healthy);

        if (healthy) {
          // Load initial data
          await Promise.all([
            fetchCustomers(),
            fetchSettings(),
            fetchPriceIncreases(),
          ]);
        }
      } catch (error) {
        console.error('Initialization error:', error);
        setIsHealthy(false);
      } finally {
        setIsLoading(false);
      }
    };

    initializeApp();
  }, [fetchCustomers, fetchSettings, fetchPriceIncreases]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-600">Lade Anwendung...</p>
          <p className="text-gray-400 text-sm mt-2">API URL: {import.meta.env.VITE_API_URL || 'http://localhost:8000'}</p>
        </div>
      </div>
    );
  }

  if (!isHealthy) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-md p-8 text-center max-w-md">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Verbindungsfehler</h1>
          <p className="text-gray-600 mb-4">
            Die API ist nicht erreichbar. Bitte überprüfen Sie, ob der Backend-Server läuft.
          </p>
          <p className="text-sm text-gray-500 mb-4">API URL: {import.meta.env.VITE_API_URL || 'http://localhost:8000'}</p>
          <button
            onClick={() => window.location.reload()}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
          >
            Nochmal versuchen
          </button>
        </div>
      </div>
    );
  }

  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        {/* Navigation */}
        <nav className="bg-white shadow-sm border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center space-x-8">
                <Link to="/" className="text-xl font-bold text-blue-600">
                  📋 Contracts
                </Link>
                <div className="hidden md:flex space-x-6">
                  <Link
                    to="/"
                    className="text-gray-700 hover:text-blue-600 transition"
                  >
                    Dashboard
                  </Link>
                  <Link
                    to="/forecast"
                    className="text-gray-700 hover:text-blue-600 transition"
                  >
                    Forecast
                  </Link>
                  <Link
                    to="/price-increases"
                    className="text-gray-700 hover:text-blue-600 transition"
                  >
                    Preiserhöhungen
                  </Link>
                  <Link
                    to="/commission-rates"
                    className="text-gray-700 hover:text-blue-600 transition"
                  >
                    Provisionsätze
                  </Link>
                  <Link
                    to="/settings"
                    className="text-gray-700 hover:text-blue-600 transition"
                  >
                    Einstellungen
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </nav>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/customers/:customerId" element={<CustomerDetail />} />
            <Route path="/forecast" element={<Forecast />} />
            <Route path="/price-increases" element={<PriceIncreases />} />
            <Route path="/commission-rates" element={<CommissionRates />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </main>

        {/* Footer */}
        <footer className="bg-white border-t border-gray-200 mt-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <p className="text-center text-gray-500 text-sm">
              © 2025 Contract Management System - Version 1.0.0
            </p>
          </div>
        </footer>
      </div>
    </Router>
  );
}

export default App;
