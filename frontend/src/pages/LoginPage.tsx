import { useState, useEffect } from 'react';
import api from '../services/api';

interface LoginPageProps {
  onLoginSuccess: (token: string) => void;
}

function LoginPage({ onLoginSuccess }: LoginPageProps) {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [authRequired, setAuthRequired] = useState(false);

  // Check if authentication is required on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const authStatus = await api.checkAuth();
        setAuthRequired(authStatus.auth_required);
      } catch (err) {
        console.error('Error checking auth:', err);
        // Assume auth is required if we can't check
        setAuthRequired(true);
      }
    };
    checkAuth();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await api.login(password);
      onLoginSuccess(response.token);
    } catch (err: any) {
      const errorMessage = err.response?.data?.detail || 'Login failed';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // If auth is not required, show nothing (parent will render main app)
  if (!authRequired) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-2xl p-8 w-full max-w-md">
        <h1 className="text-3xl font-bold text-gray-900 mb-2 text-center">
          Contract Management
        </h1>
        <p className="text-gray-600 text-center mb-8">
          Sichere Verwaltung von Verträgen und Provisionen
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
              Passwort
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Passwort eingeben"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              disabled={loading}
              autoFocus
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !password}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-2 px-4 rounded-lg transition duration-200"
          >
            {loading ? 'Wird überprüft...' : 'Anmelden'}
          </button>
        </form>

        <p className="text-gray-600 text-xs text-center mt-8">
          Geschützte Anwendung. Nur mit Passwort zugänglich.
        </p>
      </div>
    </div>
  );
}

export default LoginPage;
