import { useState, useEffect } from 'react';
import api from '../services/api';
import { DatabaseInfo } from '../types';

const APP_VERSION = import.meta.env.VITE_APP_VERSION || 'dev';

export default function DatabaseFooter() {
  const [activeDatabase, setActiveDatabase] = useState<DatabaseInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadActiveDatabase = async () => {
      try {
        const db = await api.getActiveDatabase();
        setActiveDatabase(db);
      } catch (err) {
        console.error('Error loading active database:', err);
      } finally {
        setLoading(false);
      }
    };

    loadActiveDatabase();
  }, []);

  if (loading || !activeDatabase) {
    return null;
  }

  return (
    <div 
      className="fixed bottom-0 left-0 right-0 h-8 flex items-center justify-between px-4 text-sm font-medium text-white z-40"
      style={{ backgroundColor: activeDatabase.color }}
    >
      <span className="text-white/70 text-xs">v{APP_VERSION}</span>
      <span className="flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-white/50"></span>
        Aktive Datenbank: <strong>{activeDatabase.name}</strong>
        {activeDatabase.isDemo && (
          <span className="ml-2 px-2 py-0.5 bg-white/20 rounded text-xs">
            DEMO
          </span>
        )}
      </span>
      <span className="w-16"></span>{/* Spacer für Zentrierung */}
    </div>
  );
}
