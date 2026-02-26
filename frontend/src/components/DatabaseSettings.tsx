import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import { DatabaseInfo } from '../types';

interface DatabaseSettingsProps {
  onDatabaseChange?: () => void;
}

export default function DatabaseSettings({ onDatabaseChange }: DatabaseSettingsProps) {
  const [databases, setDatabases] = useState<DatabaseInfo[]>([]);
  const [activeDatabase, setActiveDatabase] = useState<DatabaseInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Modal States
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedDb, setSelectedDb] = useState<DatabaseInfo | null>(null);
  
  // Form States
  const [newDbName, setNewDbName] = useState('');
  const [newDbColor, setNewDbColor] = useState('#3B82F6');
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState('');

  const loadDatabases = useCallback(async () => {
    try {
      setLoading(true);
      const data = await api.getDatabases();
      setDatabases(data.databases);
      setActiveDatabase(data.activeDatabase);
      setError(null);
    } catch (err) {
      console.error('Error loading databases:', err);
      setError('Fehler beim Laden der Datenbanken');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDatabases();
  }, [loadDatabases]);

  const handleSwitchDatabase = async (db: DatabaseInfo) => {
    if (db.isActive) return;
    
    if (!confirm(`Zur Datenbank "${db.name}" wechseln?\n\nDie Anwendung muss danach neu gestartet werden.`)) {
      return;
    }
    
    try {
      const result = await api.switchDatabase(db.id);
      if (result.requiresRestart) {
        alert('Datenbank gewechselt. Bitte laden Sie die Seite neu (F5) oder starten Sie die Anwendung neu.');
      }
      await loadDatabases();
      onDatabaseChange?.();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Fehler beim Wechseln der Datenbank');
    }
  };

  const handleCreateDatabase = async () => {
    if (!newDbName.trim()) {
      alert('Bitte geben Sie einen Namen ein');
      return;
    }
    
    try {
      await api.createDatabase(newDbName.trim(), newDbColor);
      setIsCreateModalOpen(false);
      setNewDbName('');
      setNewDbColor('#3B82F6');
      await loadDatabases();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Fehler beim Erstellen der Datenbank');
    }
  };

  const handleEditDatabase = async () => {
    if (!selectedDb) return;
    
    try {
      await api.updateDatabase(selectedDb.id, {
        name: editName || undefined,
        color: editColor || undefined
      });
      setIsEditModalOpen(false);
      setSelectedDb(null);
      await loadDatabases();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Fehler beim Aktualisieren der Datenbank');
    }
  };

  const handleDeleteDatabase = async (db: DatabaseInfo) => {
    if (db.isDemo) {
      alert('Die Demo-Datenbank kann nicht gelöscht werden.');
      return;
    }
    if (db.isActive) {
      alert('Die aktive Datenbank kann nicht gelöscht werden.');
      return;
    }
    
    if (!confirm(`Datenbank "${db.name}" wirklich löschen?\n\nAlle Daten werden unwiderruflich gelöscht!`)) {
      return;
    }
    
    try {
      await api.deleteDatabase(db.id);
      await loadDatabases();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Fehler beim Löschen der Datenbank');
    }
  };

  const openEditModal = (db: DatabaseInfo) => {
    setSelectedDb(db);
    setEditName(db.name);
    setEditColor(db.color);
    setIsEditModalOpen(true);
  };

  const handleCreateDemoData = async () => {
    if (!confirm('Demo-Daten in der aktuellen Datenbank erstellen?\n\nDies fügt Testdaten hinzu.')) {
      return;
    }
    
    try {
      const result = await api.createDemoData();
      alert(`${result.message}\n\n${result.customers} Kunden und ${result.contracts} Verträge erstellt.`);
      onDatabaseChange?.();
    } catch (err: any) {
      alert(err.message || 'Fehler beim Erstellen der Demo-Daten');
    }
  };

  const handleClearData = async () => {
    if (!confirm('ACHTUNG: ALLE Daten in der aktuellen Datenbank werden gelöscht!\n\nDiese Aktion kann nicht rückgängig gemacht werden.\n\nFortfahren?')) {
      return;
    }
    
    if (!confirm('Sind Sie wirklich sicher? Alle Kunden und Verträge werden unwiderruflich gelöscht!')) {
      return;
    }
    
    try {
      const result = await api.clearDemoData();
      alert(`${result.message}\n\n${result.customers_deleted} Kunden und ${result.contracts_deleted} Verträge gelöscht.`);
      onDatabaseChange?.();
    } catch (err: any) {
      alert(err.message || 'Fehler beim Löschen der Daten');
    }
  };

  const predefinedColors = [
    { name: 'Grün', value: '#10B981' },
    { name: 'Blau', value: '#3B82F6' },
    { name: 'Orange', value: '#F59E0B' },
    { name: 'Rot', value: '#EF4444' },
    { name: 'Lila', value: '#8B5CF6' },
    { name: 'Pink', value: '#EC4899' },
    { name: 'Cyan', value: '#06B6D4' },
    { name: 'Grau', value: '#6B7280' },
  ];

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <p className="text-gray-600 mt-2">Lade Datenbanken...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-lg">{error}</div>
      )}

      {/* Aktive Datenbank Info */}
      {activeDatabase && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <h3 className="text-sm font-medium text-gray-700 mb-2">Aktive Datenbank</h3>
          <div className="flex items-center gap-3">
            <span 
              className="inline-block w-4 h-4 rounded-full"
              style={{ backgroundColor: activeDatabase.color }}
            ></span>
            <span className="font-bold text-lg" style={{ color: activeDatabase.color }}>
              {activeDatabase.name}
            </span>
            <span className="text-gray-500 text-sm">({activeDatabase.dbName})</span>
          </div>
        </div>
      )}

      {/* Datenbank-Liste */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="flex justify-between items-center p-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-800">Datenbanken</h3>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-medium"
          >
            + Neue Datenbank
          </button>
        </div>
        
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Farbe</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Name</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">DB-Name</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Status</th>
              <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700">Aktionen</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {databases.map((db) => (
              <tr key={db.id} className={`hover:bg-gray-50 transition ${db.isActive ? 'bg-green-50' : ''}`}>
                <td className="px-6 py-4">
                  <span 
                    className="inline-block w-6 h-6 rounded-full border-2 border-white shadow"
                    style={{ backgroundColor: db.color }}
                  ></span>
                </td>
                <td className="px-6 py-4 font-medium" style={{ color: db.color }}>
                  {db.name}
                  {db.isDemo && <span className="ml-2 text-xs text-gray-500">(Demo)</span>}
                </td>
                <td className="px-6 py-4 text-sm text-gray-600">{db.dbName}</td>
                <td className="px-6 py-4">
                  {db.isActive ? (
                    <span className="px-3 py-1 bg-green-100 text-green-800 text-xs rounded-full font-medium">
                      Aktiv
                    </span>
                  ) : (
                    <button
                      onClick={() => handleSwitchDatabase(db)}
                      className="px-3 py-1 bg-gray-100 text-gray-600 text-xs rounded-full font-medium hover:bg-blue-100 hover:text-blue-700 transition"
                    >
                      Aktivieren
                    </button>
                  )}
                </td>
                <td className="px-6 py-4 text-center">
                  <div className="flex items-center justify-center gap-2">
                    <button
                      onClick={() => openEditModal(db)}
                      className="p-2 hover:bg-gray-100 rounded text-gray-600 hover:text-blue-600 transition"
                      title="Bearbeiten"
                    >
                      ✏️
                    </button>
                    {!db.isDemo && !db.isActive && (
                      <button
                        onClick={() => handleDeleteDatabase(db)}
                        className="p-2 hover:bg-red-100 rounded text-gray-600 hover:text-red-600 transition"
                        title="Löschen"
                      >
                        🗑️
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Demo-Daten Management */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Demo-Daten verwalten</h3>
        <p className="text-sm text-gray-600 mb-4">
          Erstellen Sie Testdaten in der aktuellen Datenbank oder löschen Sie alle Daten.
        </p>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={handleCreateDemoData}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-sm font-medium"
          >
            🧪 Demo-Daten erstellen
          </button>
          <button
            onClick={handleClearData}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition text-sm font-medium"
          >
            ⚠️ Alle Daten löschen
          </button>
        </div>
      </div>

      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-medium text-blue-900 mb-2">ℹ️ Hinweis</h4>
        <p className="text-sm text-blue-800">
          Nach dem Wechsel der Datenbank muss die Anwendung neu geladen werden (F5), 
          damit die Änderungen wirksam werden. Die Demo-Datenbank enthält Testdaten 
          zur Überprüfung aller Berechnungen.
        </p>
      </div>

      {/* Create Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Neue Datenbank erstellen</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input
                  type="text"
                  value={newDbName}
                  onChange={(e) => setNewDbName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="z.B. TEST, BACKUP_2024"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Farbe</label>
                <div className="flex flex-wrap gap-2">
                  {predefinedColors.map((color) => (
                    <button
                      key={color.value}
                      onClick={() => setNewDbColor(color.value)}
                      className={`w-8 h-8 rounded-full border-2 ${newDbColor === color.value ? 'border-gray-800 scale-110' : 'border-white'} shadow hover:scale-105 transition`}
                      style={{ backgroundColor: color.value }}
                      title={color.name}
                    ></button>
                  ))}
                </div>
              </div>
            </div>
            
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition"
              >
                Abbrechen
              </button>
              <button
                onClick={handleCreateDatabase}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
              >
                Erstellen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {isEditModalOpen && selectedDb && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Datenbank bearbeiten</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Farbe</label>
                <div className="flex flex-wrap gap-2">
                  {predefinedColors.map((color) => (
                    <button
                      key={color.value}
                      onClick={() => setEditColor(color.value)}
                      className={`w-8 h-8 rounded-full border-2 ${editColor === color.value ? 'border-gray-800 scale-110' : 'border-white'} shadow hover:scale-105 transition`}
                      style={{ backgroundColor: color.value }}
                      title={color.name}
                    ></button>
                  ))}
                </div>
              </div>
            </div>
            
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition"
              >
                Abbrechen
              </button>
              <button
                onClick={handleEditDatabase}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
              >
                Speichern
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
