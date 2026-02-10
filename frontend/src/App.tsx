import { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { IconSettings, IconRefresh, IconDownload } from '@tabler/icons-react';
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
  const [frontendVersion, setFrontendVersion] = useState('1.0.0');
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateMessage, setUpdateMessage] = useState<string | null>(null);
  const fetchCustomers = useCustomerStore((state) => state.fetchCustomers);
  const fetchSettings = useSettingsStore((state) => state.fetchSettings);
  const fetchPriceIncreases = useSettingsStore((state) => state.fetchPriceIncreases);

  useEffect(() => {
    // Initialize app: check health, auth, and load data
    const init = async () => {
      try {
        // 0. Log versions
        const version = import.meta.env.VITE_APP_VERSION || '1.0.0';
        setFrontendVersion(version);
        console.log('📦 Frontend version:', version);
        
        try {
          const backendVersion = await api.getBackendVersion();
          console.log('📦 Backend version:', backendVersion.version);
        } catch (err) {
          console.warn('Could not fetch backend version:', err);
        }

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
          
          // 5. Check for updates (non-blocking)
          checkForUpdates();
        }

        setIsLoading(false);
      } catch (err) {
        console.error('Initialization error:', err);
        setIsLoading(false);
      }
    };

    init();
  }, [fetchCustomers, fetchSettings, fetchPriceIncreases]);

  const checkForUpdates = async () => {
    setIsCheckingUpdate(true);
    try {
      const result = await api.checkForUpdates();
      console.log('Update check result:', result);
      setUpdateAvailable(result.update_available);
    } catch (err) {
      console.warn('Could not check for updates:', err);
    } finally {
      setIsCheckingUpdate(false);
    }
  };

  const handleUpdate = async () => {
    if (!window.confirm('Möchten Sie die Anwendung jetzt aktualisieren? Die Seite wird kurz nicht verfügbar sein.')) {
      return;
    }
    
    setIsUpdating(true);
    setUpdateMessage('Update wird gestartet...');
    
    try {
      const result = await api.triggerUpdate();
      setUpdateMessage(result.message);
      
      // Wait and reload the page
      setTimeout(() => {
        setUpdateMessage('Seite wird neu geladen...');
        setTimeout(() => {
          window.location.reload();
        }, 5000);
      }, 25000);
    } catch (err) {
      console.error('Update failed:', err);
      setUpdateMessage('Update fehlgeschlagen. Bitte manuell aktualisieren.');
      setIsUpdating(false);
    }
  };

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
                  📋 Dashboard
                </Link>
                <div className="hidden md:flex space-x-6">
                  <Link
                    to="/contracts"
                    className="text-gray-700 hover:text-blue-600 transition"
                  >
                    Alle Verträge
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
            <Route path="/contracts" element={<AllContracts />} />
            <Route path="/statistik" element={<Statistics />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </main>

        {/* Footer */}
        <footer className="bg-white border-t border-gray-200 mt-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="flex items-center justify-center gap-4">
              <p className="text-gray-500 text-sm">
                © 2025 Contract Management System - Version {frontendVersion}
              </p>
              
              {/* Update Check Button */}
              <button
                onClick={checkForUpdates}
                disabled={isCheckingUpdate}
                className="text-gray-400 hover:text-blue-600 transition"
                title="Nach Updates suchen"
              >
                <IconRefresh size={16} className={isCheckingUpdate ? 'animate-spin' : ''} />
              </button>
              
              {/* Update Available Badge */}
              {updateAvailable && !isUpdating && (
                <button
                  onClick={handleUpdate}
                  className="flex items-center gap-1 px-3 py-1 bg-green-500 text-white text-sm rounded-full hover:bg-green-600 transition"
                  title="Update verfügbar - Klicken zum Aktualisieren"
                >
                  <IconDownload size={14} />
                  <span>Update verfügbar</span>
                </button>
              )}
              
              {/* Update in progress */}
              {isUpdating && (
                <div className="flex items-center gap-2 px-3 py-1 bg-blue-500 text-white text-sm rounded-full">
                  <IconRefresh size={14} className="animate-spin" />
                  <span>{updateMessage || 'Aktualisiere...'}</span>
                </div>
              )}
            </div>
          </div>
        </footer>
      </div>
    </Router>
  );
}

export default App;
