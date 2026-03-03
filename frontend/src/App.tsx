import { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { IconSettings, IconLogout } from '@tabler/icons-react';
import { useCustomerStore } from './stores/customerStore';
import { useSettingsStore } from './stores/settingsStore';
import api from './services/api';
import Dashboard from './pages/Dashboard';
import CustomerDetail from './pages/CustomerDetail';
import Settings from './pages/Settings';
import Statistics from './pages/Statistics';
import AllContracts from './pages/AllContracts';
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
        const isHealthy = await api.healthCheck();
        if (!isHealthy) {
          throw new Error('API is not healthy');
        }

        // 2. Check if authentication is required
        const authStatus = await api.checkAuth();

        // 3. Handle authentication
        const savedToken = localStorage.getItem('auth_token');
        const authRequired = authStatus.auth_required;

        if (authRequired && !savedToken) {
          setIsAuthenticated(false);
        } else {
          // Either auth not required, or user has a token
          if (savedToken) {
            api.setAuthToken(savedToken);
          }
          setIsAuthenticated(true);
        }

        // 4. Load initial data (only if authenticated)
        if (!authRequired || savedToken) {
          await Promise.all([
            fetchCustomers(),
            fetchSettings(),
            fetchPriceIncreases(),
          ]);
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
      <div className="h-screen flex flex-col bg-gray-50 overflow-hidden">
        {/* Navigation */}
        <nav className="bg-white shadow-sm border-b border-gray-200 flex-shrink-0">
          <div className="max-w-7xl mx-auto px-2 sm:px-3 lg:px-4">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center space-x-8">
                <Link to="/" className="text-gray-700 hover:text-blue-600 transition">
                  Kunden
                </Link>
                <div className="hidden md:flex space-x-6">
                  <Link
                    to="/contracts"
                    className="text-gray-700 hover:text-blue-600 transition"
                  >
                    Verträge
                  </Link>
                  <Link
                    to="/statistik"
                    className="text-gray-700 hover:text-blue-600 transition"
                  >
                    Statistik
                  </Link>
                </div>
              </div>
              {/* Settings Icon & Logout - Right Side */}
              <div className="flex items-center space-x-4">
                <Link
                  to="/settings"
                  className="text-gray-700 hover:text-blue-600 transition"
                  title="Einstellungen"
                >
                  <IconSettings size={24} stroke={2} />
                </Link>
                <button
                  onClick={handleLogout}
                  className="p-1.5 text-gray-700 hover:text-red-600 transition"
                  title="Abmelden"
                >
                  <IconLogout size={24} stroke={2} />
                </button>
              </div>
            </div>
          </div>
        </nav>

        {/* Main Content */}
        <main className="flex-1 overflow-hidden max-w-7xl w-full mx-auto py-4 px-1 sm:px-2 lg:px-3">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/customers/:customerId" element={<CustomerDetail />} />
            <Route path="/contracts" element={<AllContracts />} />
            <Route path="/statistik" element={<Statistics />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
