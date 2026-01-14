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
import LoginPage from './pages/LoginPage';
import './App.css';

function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const fetchCustomers = useCustomerStore((state) => state.fetchCustomers);
  const fetchSettings = useSettingsStore((state) => state.fetchSettings);
  const fetchPriceIncreases = useSettingsStore((state) => state.fetchPriceIncreases);

  useEffect(() => {
    // Initialize app: check health, auth, and load data
    const init = async () => {
      try {
        // 1. Check API health
        console.log('Checking API health...');
        const isHealthy = await api.healthCheck();
        if (!isHealthy) {
          throw new Error('API is not healthy');
        }
        console.log('API is healthy');

        // 2. Check if authentication is required
        console.log('Checking auth requirement...');
        const authStatus = await api.checkAuth();
        console.log('Auth status:', authStatus);

        // 3. Handle authentication
        const savedToken = localStorage.getItem('auth_token');
        const authRequired = authStatus.auth_required;

        if (authRequired && !savedToken) {
          console.log('Auth required but no token - showing login');
          setIsAuthenticated(false);
        } else {
          // Either auth not required, or user has a token
          if (savedToken) {
            console.log('Using saved token');
            api.setAuthToken(savedToken);
          } else if (!authRequired) {
            console.log('Auth not required - proceeding without token');
          }
          setIsAuthenticated(true);
        }

        // 4. Load initial data (only if authenticated)
        if (!authRequired || savedToken) {
          console.log('Loading initial data...');
          await Promise.all([
            fetchCustomers(),
            fetchSettings(),
            fetchPriceIncreases(),
          ]);
          console.log('Initial data loaded');
        }

        setIsLoading(false);
      } catch (err) {
        console.error('Initialization error:', err);
        setIsLoading(false);
      }
    };

    init();
  }, [fetchCustomers, fetchSettings, fetchPriceIncreases]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-600">Lade Anwendung...</p>
          <p className="text-gray-400 text-sm mt-2">API URL: http://localhost:8000</p>
        </div>
      </div>
    );
  }

  // Show login page if not authenticated
  if (!isAuthenticated) {
    return (
      <LoginPage
        onLoginSuccess={(token) => {
          localStorage.setItem('auth_token', token);
          api.setAuthToken(token);
          setIsAuthenticated(true);
        }}
      />
    );
  }

  const handleLogout = () => {
    localStorage.removeItem('auth_token');
    api.setAuthToken(null);
    setIsAuthenticated(false);
  };

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
                </div>
              </div>
              {/* Settings Icon & Logout - Right Side */}
              <div className="flex items-center space-x-4">
                <Link
                  to="/settings"
                  className="text-gray-700 hover:text-blue-600 transition text-xl"
                  title="Einstellungen"
                >
                  ⚙️
                </Link>
                <button
                  onClick={handleLogout}
                  className="text-gray-700 hover:text-red-600 transition text-lg"
                  title="Abmelden"
                >
                  ⏻
                </button>
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
