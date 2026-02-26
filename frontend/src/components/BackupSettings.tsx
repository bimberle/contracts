import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import { BackupConfig, BackupHistoryItem, DatabaseInfo } from '../types';

interface BackupSettingsProps {
  onBackupRestored?: () => void;
}

export default function BackupSettings({ onBackupRestored }: BackupSettingsProps) {
  const [config, setConfig] = useState<BackupConfig | null>(null);
  const [history, setHistory] = useState<BackupHistoryItem[]>([]);
  const [databases, setDatabases] = useState<DatabaseInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [creatingBackup, setCreatingBackup] = useState(false);
  const [restoringBackup, setRestoringBackup] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [databaseFilter, setDatabaseFilter] = useState<string>('all');

  // Restore Modal State
  const [isRestoreModalOpen, setIsRestoreModalOpen] = useState(false);
  const [selectedBackupForRestore, setSelectedBackupForRestore] = useState<string | null>(null);
  const [restoreTargetDbId, setRestoreTargetDbId] = useState<string>('');

  const weekdays = [
    { key: 'monday', label: 'Mo' },
    { key: 'tuesday', label: 'Di' },
    { key: 'wednesday', label: 'Mi' },
    { key: 'thursday', label: 'Do' },
    { key: 'friday', label: 'Fr' },
    { key: 'saturday', label: 'Sa' },
    { key: 'sunday', label: 'So' },
  ];

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [configData, historyData, dbData] = await Promise.all([
        api.getBackupConfig(),
        api.getBackupHistory(),
        api.getDatabases()
      ]);
      setConfig(configData);
      setHistory(historyData.backups || []);
      setDatabases(dbData.databases);
      setError(null);
    } catch (err) {
      console.error('Error loading backup data:', err);
      setError('Fehler beim Laden der Backup-Konfiguration');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleToggleDay = (day: string) => {
    if (!config) return;
    
    const newDays = config.scheduleDays.includes(day)
      ? config.scheduleDays.filter(d => d !== day)
      : [...config.scheduleDays, day];
    
    setConfig({ ...config, scheduleDays: newDays });
  };

  const handleSaveConfig = async () => {
    if (!config) return;
    
    try {
      setSaving(true);
      await api.updateBackupConfig(config);
      setError(null);
      alert('Backup-Konfiguration gespeichert');
    } catch (err: any) {
      console.error('Error saving backup config:', err);
      setError(err.response?.data?.detail || 'Fehler beim Speichern');
    } finally {
      setSaving(false);
    }
  };

  const handleCreateBackup = async () => {
    try {
      setCreatingBackup(true);
      const result = await api.createBackup();
      alert(`Backup erstellt: ${result.filename}`);
      await loadData();
    } catch (err: any) {
      console.error('Error creating backup:', err);
      alert(err.response?.data?.detail || 'Fehler beim Erstellen des Backups');
    } finally {
      setCreatingBackup(false);
    }
  };

  const handleDownloadBackup = (filename: string) => {
    const url = api.getBackupDownloadUrl(filename);
    window.open(url, '_blank');
  };

  const handleDeleteBackup = async (filename: string) => {
    if (!confirm(`Backup "${filename}" wirklich löschen?`)) {
      return;
    }

    try {
      await api.deleteBackup(filename);
      await loadData();
    } catch (err: any) {
      console.error('Error deleting backup:', err);
      alert(err.response?.data?.detail || 'Fehler beim Löschen des Backups');
    }
  };

  const openRestoreModal = (filename: string) => {
    setSelectedBackupForRestore(filename);
    setRestoreTargetDbId('');
    setIsRestoreModalOpen(true);
  };

  const handleRestoreBackup = async () => {
    if (!selectedBackupForRestore || !restoreTargetDbId) {
      alert('Bitte wählen Sie eine Ziel-Datenbank');
      return;
    }

    const targetDb = databases.find(db => db.id === restoreTargetDbId);
    if (!targetDb) return;

    if (!confirm(`ACHTUNG: Alle Daten in "${targetDb.name}" werden überschrieben!\n\nMöchten Sie wirklich fortfahren?`)) {
      return;
    }

    try {
      setRestoringBackup(selectedBackupForRestore);
      setIsRestoreModalOpen(false);
      
      await api.restoreBackup(selectedBackupForRestore, restoreTargetDbId);
      alert(`Backup erfolgreich in "${targetDb.name}" wiederhergestellt`);
      onBackupRestored?.();
    } catch (err: any) {
      console.error('Error restoring backup:', err);
      alert(err.response?.data?.detail || 'Fehler beim Wiederherstellen des Backups');
    } finally {
      setRestoringBackup(null);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <p className="text-gray-600 mt-2">Lade Backup-Konfiguration...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-lg">{error}</div>
      )}

      {/* Backup-Konfiguration */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Backup-Zeitplan</h3>

        {config && (
          <div className="space-y-4">
            {/* Enable/Disable */}
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="backupEnabled"
                checked={config.isEnabled}
                onChange={(e) => setConfig({ ...config, isEnabled: e.target.checked })}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <label htmlFor="backupEnabled" className="text-sm font-medium text-gray-700">
                Automatische Backups aktivieren
              </label>
            </div>

            {/* Wochentage */}
            <div className={config.isEnabled ? '' : 'opacity-50 pointer-events-none'}>
              <label className="block text-sm font-medium text-gray-700 mb-2">Backup-Tage</label>
              <div className="flex flex-wrap gap-2">
                {weekdays.map((day) => (
                  <button
                    key={day.key}
                    onClick={() => handleToggleDay(day.key)}
                    className={`px-4 py-2 rounded-lg border-2 font-medium text-sm transition ${
                      config.scheduleDays.includes(day.key)
                        ? 'bg-blue-600 border-blue-600 text-white'
                        : 'bg-white border-gray-300 text-gray-700 hover:border-blue-300'
                    }`}
                  >
                    {day.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Uhrzeit */}
            <div className={config.isEnabled ? '' : 'opacity-50 pointer-events-none'}>
              <label className="block text-sm font-medium text-gray-700 mb-2">Backup-Uhrzeit</label>
              <input
                type="time"
                value={config.scheduleTime}
                onChange={(e) => setConfig({ ...config, scheduleTime: e.target.value })}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Max Backups */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Maximale Anzahl Backups (ältere werden automatisch gelöscht)
              </label>
              <input
                type="number"
                min="1"
                max="100"
                value={config.maxBackups}
                onChange={(e) => setConfig({ ...config, maxBackups: parseInt(e.target.value) || 10 })}
                className="w-24 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Backup-Verzeichnis */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Backup-Verzeichnis</label>
              <div className="px-3 py-2 bg-gray-100 border border-gray-200 rounded-lg text-gray-600 font-mono text-sm">
                {config.backupDirectory}
              </div>
            </div>

            {/* Save Button */}
            <div className="pt-2">
              <button
                onClick={handleSaveConfig}
                disabled={saving}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
              >
                {saving ? 'Speichern...' : 'Konfiguration speichern'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Manuelles Backup */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-lg font-semibold text-gray-800">Manuelles Backup</h3>
            <p className="text-sm text-gray-600 mt-1">
              Erstellt sofort ein Backup der aktiven Datenbank
            </p>
          </div>
          <button
            onClick={handleCreateBackup}
            disabled={creatingBackup}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50 flex items-center gap-2"
          >
            {creatingBackup ? (
              <>
                <span className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white"></span>
                Erstelle...
              </>
            ) : (
              <>Backup jetzt erstellen</>
            )}
          </button>
        </div>
      </div>

      {/* Backup-Historie */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="flex justify-between items-center p-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-800">Backup-Historie</h3>
          <div className="flex items-center gap-4">
            <select
              value={databaseFilter}
              onChange={(e) => setDatabaseFilter(e.target.value)}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Alle Datenbanken</option>
              {databases.map((db) => (
                <option key={db.id} value={db.dbName}>{db.name}</option>
              ))}
            </select>
            <span className="text-sm text-gray-500">
              {databaseFilter === 'all' 
                ? `${history.length} Backups` 
                : `${history.filter(b => b.databaseName === databaseFilter).length} von ${history.length} Backups`
              }
            </span>
          </div>
        </div>

        {history.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            Noch keine Backups vorhanden
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Dateiname</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Datenbank</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Datum</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-700">Kunden</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-700">Verträge</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Version</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Größe</th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700">Aktionen</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {history
                  .filter(backup => databaseFilter === 'all' || backup.databaseName === databaseFilter)
                  .map((backup) => (
                  <tr key={backup.filename} className="hover:bg-gray-50 transition">
                    <td className="px-6 py-4 font-mono text-sm">{backup.filename}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{backup.databaseName}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {backup.createdAt ? new Date(backup.createdAt).toLocaleString('de-DE') : '-'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 text-right">
                      {backup.customerCount != null ? backup.customerCount : '-'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 text-right">
                      {backup.contractCount != null ? backup.contractCount : '-'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 font-mono">
                      {backup.appVersion ? `v${backup.appVersion}` : '-'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{backup.fileSizeFormatted}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleDownloadBackup(backup.filename)}
                          className="px-3 py-1 bg-blue-100 text-blue-700 rounded text-sm hover:bg-blue-200 transition"
                          title="Herunterladen"
                        >
                          ⬇️ Download
                        </button>
                        <button
                          onClick={() => openRestoreModal(backup.filename)}
                          disabled={restoringBackup === backup.filename}
                          className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded text-sm hover:bg-yellow-200 transition disabled:opacity-50"
                          title="Wiederherstellen"
                        >
                          {restoringBackup === backup.filename ? '⏳...' : '🔄 Restore'}
                        </button>
                        <button
                          onClick={() => handleDeleteBackup(backup.filename)}
                          className="px-3 py-1 bg-red-100 text-red-700 rounded text-sm hover:bg-red-200 transition"
                          title="Löschen"
                        >
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Info Box */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <h4 className="font-medium text-yellow-900 mb-2">⚠️ Wichtig</h4>
        <ul className="text-sm text-yellow-800 space-y-1">
          <li>• Backups werden im Container unter <code className="bg-yellow-100 px-1 rounded">{config?.backupDirectory}</code> gespeichert</li>
          <li>• Bei einem Container-Neustart werden Backups gelöscht, wenn das Verzeichnis nicht als Volume gemountet ist</li>
          <li>• Laden Sie wichtige Backups herunter und speichern Sie sie extern</li>
          <li>• Das Wiederherstellen überschreibt ALLE Daten der Ziel-Datenbank</li>
        </ul>
      </div>

      {/* Restore Modal */}
      {isRestoreModalOpen && selectedBackupForRestore && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Backup wiederherstellen</h3>
            
            <p className="text-sm text-gray-600 mb-4">
              Backup: <span className="font-mono">{selectedBackupForRestore}</span>
            </p>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Ziel-Datenbank auswählen:
              </label>
              <select
                value={restoreTargetDbId}
                onChange={(e) => setRestoreTargetDbId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">-- Bitte wählen --</option>
                {databases.map((db) => (
                  <option key={db.id} value={db.id}>
                    {db.name} ({db.dbName})
                  </option>
                ))}
              </select>
            </div>

            <div className="bg-red-50 border border-red-200 rounded p-3 mb-4">
              <p className="text-sm text-red-800">
                ⚠️ <strong>Warnung:</strong> Alle bestehenden Daten in der Ziel-Datenbank werden unwiderruflich überschrieben!
              </p>
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setIsRestoreModalOpen(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition"
              >
                Abbrechen
              </button>
              <button
                onClick={handleRestoreBackup}
                disabled={!restoreTargetDbId}
                className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition disabled:opacity-50"
              >
                Wiederherstellen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
