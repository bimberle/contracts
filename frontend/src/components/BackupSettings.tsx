import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import { BackupConfig, BackupHistoryItem } from '../types';
import ConfirmModal from './ConfirmModal';

interface BackupSettingsProps {
  onBackupRestored?: () => void;
}

export default function BackupSettings({ onBackupRestored }: BackupSettingsProps) {
  const [config, setConfig] = useState<BackupConfig | null>(null);
  const [history, setHistory] = useState<BackupHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [creatingBackup, setCreatingBackup] = useState(false);
  const [restoringBackup, setRestoringBackup] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Delete Confirm Modal State
  const [deleteConfirmModal, setDeleteConfirmModal] = useState<{
    isOpen: boolean;
    filename: string;
  }>({ isOpen: false, filename: '' });

  // Backup Created Success Modal State
  const [backupSuccessModal, setBackupSuccessModal] = useState<{
    isOpen: boolean;
    backup: BackupHistoryItem | null;
  }>({ isOpen: false, backup: null });

  // Restore Confirm Modal State
  const [restoreConfirmModal, setRestoreConfirmModal] = useState<{
    isOpen: boolean;
    backupFilename: string;
  }>({ isOpen: false, backupFilename: '' });

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
      const [configData, historyData] = await Promise.all([
        api.getBackupConfig(),
        api.getBackupHistory(),
      ]);
      setConfig(configData);
      setHistory(historyData.backups || []);
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
      // Find the backup in refreshed data to get full details
      const historyData = await api.getBackupHistory();
      const createdBackup = historyData.backups?.find((b: BackupHistoryItem) => b.filename === result.filename);
      setHistory(historyData.backups || []);
      
      if (createdBackup) {
        setBackupSuccessModal({ isOpen: true, backup: createdBackup });
      } else {
        // Fallback with basic info from result
        setBackupSuccessModal({ 
          isOpen: true, 
          backup: {
            filename: result.filename,
            databaseName: result.databaseName || 'Unbekannt',
            createdAt: new Date().toISOString(),
            fileSizeFormatted: 'Unbekannt'
          } as BackupHistoryItem
        });
      }
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
    setDeleteConfirmModal({ isOpen: true, filename });
  };

  const confirmDeleteBackup = async () => {
    const filename = deleteConfirmModal.filename;
    setDeleteConfirmModal({ isOpen: false, filename: '' });
    
    try {
      await api.deleteBackup(filename);
      await loadData();
    } catch (err: any) {
      console.error('Error deleting backup:', err);
      alert(err.response?.data?.detail || 'Fehler beim Löschen des Backups');
    }
  };

  const handleRestoreBackup = (filename: string) => {
    setRestoreConfirmModal({ isOpen: true, backupFilename: filename });
  };

  const confirmRestoreBackup = async () => {
    const filename = restoreConfirmModal.backupFilename;
    setRestoreConfirmModal({ isOpen: false, backupFilename: '' });
    
    try {
      setRestoringBackup(filename);
      await api.restoreBackup(filename);
      alert('Backup erfolgreich wiederhergestellt');
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
        <p className="mt-2 text-gray-600">Lade Backup-Konfiguration...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8 text-red-600">
        <p>{error}</p>
        <button 
          onClick={loadData}
          className="mt-4 text-blue-600 hover:underline"
        >
          Erneut versuchen
        </button>
      </div>
    );
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="space-y-8">
      {/* Backup Configuration */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Backup-Konfiguration</h3>
        
        <div className="space-y-6">
          {/* Enable/Disable */}
          <div className="flex items-center justify-between">
            <div>
              <label className="font-medium text-gray-700">Automatische Backups</label>
              <p className="text-sm text-gray-500">Backups werden automatisch nach Zeitplan erstellt</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={config?.isEnabled ?? false}
                onChange={(e) => config && setConfig({ ...config, isEnabled: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          {/* Schedule Days */}
          <div>
            <label className="block font-medium text-gray-700 mb-2">Backup-Tage</label>
            <div className="flex gap-2">
              {weekdays.map(day => (
                <button
                  key={day.key}
                  onClick={() => handleToggleDay(day.key)}
                  className={`w-10 h-10 rounded-full font-medium text-sm transition ${
                    config?.scheduleDays.includes(day.key)
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {day.label}
                </button>
              ))}
            </div>
          </div>

          {/* Schedule Time */}
          <div>
            <label className="block font-medium text-gray-700 mb-2">Backup-Zeit</label>
            <input
              type="time"
              value={config?.scheduleTime ?? '03:00'}
              onChange={(e) => config && setConfig({ ...config, scheduleTime: e.target.value })}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            />
          </div>

          {/* Max Backups */}
          <div>
            <label className="block font-medium text-gray-700 mb-2">Maximale Anzahl Backups</label>
            <input
              type="number"
              min="1"
              max="100"
              value={config?.maxBackups ?? 7}
              onChange={(e) => config && setConfig({ ...config, maxBackups: parseInt(e.target.value) || 7 })}
              className="w-24 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            />
            <p className="text-sm text-gray-500 mt-1">Ältere Backups werden automatisch gelöscht</p>
          </div>

          {/* Save Button */}
          <div className="pt-4 border-t">
            <button
              onClick={handleSaveConfig}
              disabled={saving}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
            >
              {saving ? 'Speichern...' : 'Konfiguration speichern'}
            </button>
          </div>
        </div>
      </div>

      {/* Manual Backup */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Manuelles Backup</h3>
        <p className="text-gray-600 mb-4">
          Erstellen Sie jetzt ein Backup der Datenbank.
        </p>
        <button
          onClick={handleCreateBackup}
          disabled={creatingBackup}
          className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition disabled:opacity-50 flex items-center gap-2"
        >
          {creatingBackup ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              Backup wird erstellt...
            </>
          ) : (
            'Backup jetzt erstellen'
          )}
        </button>
      </div>

      {/* Backup History */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Backup-Historie</h3>
        
        {history.length === 0 ? (
          <p className="text-gray-500 text-center py-8">Keine Backups vorhanden</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Datum</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Größe</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Kunden</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Verträge</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Version</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-600">Aktionen</th>
                </tr>
              </thead>
              <tbody>
                {history.map((backup) => (
                  <tr key={backup.id} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-4">{formatDate(backup.createdAt)}</td>
                    <td className="py-3 px-4">{backup.fileSizeFormatted || '-'}</td>
                    <td className="py-3 px-4">{backup.customerCount ?? '-'}</td>
                    <td className="py-3 px-4">{backup.contractCount ?? '-'}</td>
                    <td className="py-3 px-4">{backup.appVersion || '-'}</td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex gap-2 justify-end">
                        <button
                          onClick={() => handleDownloadBackup(backup.filename)}
                          className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                        >
                          Download
                        </button>
                        <button
                          onClick={() => handleRestoreBackup(backup.filename)}
                          disabled={restoringBackup === backup.filename}
                          className="text-green-600 hover:text-green-800 text-sm font-medium disabled:opacity-50"
                        >
                          {restoringBackup === backup.filename ? 'Wird wiederhergestellt...' : 'Wiederherstellen'}
                        </button>
                        <button
                          onClick={() => handleDeleteBackup(backup.filename)}
                          className="text-red-600 hover:text-red-800 text-sm font-medium"
                        >
                          Löschen
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

      {/* Delete Confirm Modal */}
      <ConfirmModal
        isOpen={deleteConfirmModal.isOpen}
        onClose={() => setDeleteConfirmModal({ isOpen: false, filename: '' })}
        onConfirm={confirmDeleteBackup}
        title="Backup löschen"
        message={`Möchten Sie das Backup "${deleteConfirmModal.filename}" wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.`}
        confirmText="Löschen"
        cancelText="Abbrechen"
        confirmStyle="danger"
        icon="warning"
      />

      {/* Backup Success Modal */}
      <ConfirmModal
        isOpen={backupSuccessModal.isOpen}
        onClose={() => setBackupSuccessModal({ isOpen: false, backup: null })}
        onConfirm={() => setBackupSuccessModal({ isOpen: false, backup: null })}
        title="Backup erstellt"
        message={
          backupSuccessModal.backup
            ? `Backup "${backupSuccessModal.backup.filename}" wurde erfolgreich erstellt.\n\nGröße: ${backupSuccessModal.backup.fileSizeFormatted || 'Unbekannt'}\nDatum: ${formatDate(backupSuccessModal.backup.createdAt)}`
            : ''
        }
        confirmText="OK"
        cancelText=""
        confirmStyle="primary"
        icon="info"
      />

      {/* Restore Confirm Modal */}
      <ConfirmModal
        isOpen={restoreConfirmModal.isOpen}
        onClose={() => setRestoreConfirmModal({ isOpen: false, backupFilename: '' })}
        onConfirm={confirmRestoreBackup}
        title="Backup wiederherstellen"
        message={`Möchten Sie das Backup "${restoreConfirmModal.backupFilename}" wirklich wiederherstellen?\n\nACHTUNG: Alle aktuellen Daten werden durch die Daten aus dem Backup ersetzt!`}
        confirmText="Wiederherstellen"
        cancelText="Abbrechen"
        confirmStyle="warning"
        icon="warning"
      />
    </div>
  );
}
