import React, { useState } from 'react';
import {
  Upload,
  Download,
  Shield,
  FileArchive,
  AlertTriangle,
  CheckCircle,
  FileSpreadsheet,
  RefreshCw,
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { ProgressBar } from '../components/ui/Spinner';
import { useToast } from '../components/ui/Toast';
import {
  createFullBackup,
  previewBackup,
  restoreFromBackup,
  exportProductsCsv,
  exportTransactionsCsv,
  downloadBlob,
} from '../services/backupService';
import type { RestorePreview } from '../services/backupService';
import { formatDate } from '../utils/format';

export const ImportBackup: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'backup' | 'restore'>('backup');

  // Backup states
  const [backupProgress, setBackupProgress] = useState<{ pct: number; msg: string } | null>(null);
  const [isBackingUp, setIsBackingUp] = useState(false);

  // Restore states
  const [restoreFile, setRestoreFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<RestorePreview | null>(null);
  const [restoreMode, setRestoreMode] = useState<'merge' | 'replace'>('merge');
  const [confirmReplace, setConfirmReplace] = useState(false);
  const [restoreProgress, setRestoreProgress] = useState<{ pct: number; msg: string } | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);
  const [restoreResult, setRestoreResult] = useState<{ restored: number; skipped: number; errors: string[] } | null>(null);

  const toast = useToast();

  const handleCreateBackup = async () => {
    setIsBackingUp(true);
    setBackupProgress({ pct: 0, msg: 'Starting full backup...' });
    try {
      const blob = await createFullBackup((pct, msg) => {
        setBackupProgress({ pct, msg });
      });

      const dateStr = new Date().toISOString().slice(0, 10);
      downloadBlob(blob, `smartvault-backup-${dateStr}.zip`);
      toast.success('Backup archive created and downloaded.');
    } catch (err: unknown) {
      toast.error('Failed to create backup archive');
    } finally {
      setIsBackingUp(false);
      setBackupProgress(null);
    }
  };

  const handleExportProducts = async () => {
    try {
      const blob = await exportProductsCsv();
      downloadBlob(blob, `smartvault-products-${new Date().toISOString().slice(0, 10)}.csv`);
      toast.success('Products exported to CSV.');
    } catch {
      toast.error('Export failed');
    }
  };

  const handleExportTransactions = async () => {
    try {
      const blob = await exportTransactionsCsv();
      downloadBlob(blob, `smartvault-transactions-${new Date().toISOString().slice(0, 10)}.csv`);
      toast.success('Transactions exported to CSV.');
    } catch {
      toast.error('Export failed');
    }
  };

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setRestoreFile(file);
    setRestoreResult(null);

    try {
      const p = await previewBackup(file);
      setPreview(p);
    } catch {
      toast.error('Failed to inspect backup file');
    }
  };

  const handleRunRestore = async () => {
    if (!restoreFile) return;
    if (restoreMode === 'replace' && !confirmReplace) {
      toast.error('Please confirm you want to replace all existing data.');
      return;
    }

    setIsRestoring(true);
    setRestoreProgress({ pct: 0, msg: 'Preparing database...' });

    try {
      const res = await restoreFromBackup(restoreFile, restoreMode, (pct, msg) => {
        setRestoreProgress({ pct, msg });
      });
      setRestoreResult(res);
      toast.success(`Restore finished: ${res.restored} records restored.`);
    } catch (err: unknown) {
      toast.error('Restore failed');
    } finally {
      setIsRestoring(false);
      setRestoreProgress(null);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          Backup, Export & Disaster Recovery
          <Shield className="w-5 h-5 text-emerald-600" />
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
          Your data is 100% on your device. Create portable ZIP archives or restore anytime.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 dark:border-gray-800">
        <button
          onClick={() => setActiveTab('backup')}
          className={`pb-3 px-4 text-sm font-semibold border-b-2 transition-colors ${
            activeTab === 'backup'
              ? 'border-emerald-600 text-emerald-700 dark:text-emerald-400'
              : 'border-transparent text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'
          }`}
        >
          Create Backup & Exports
        </button>
        <button
          onClick={() => setActiveTab('restore')}
          className={`pb-3 px-4 text-sm font-semibold border-b-2 transition-colors ${
            activeTab === 'restore'
              ? 'border-emerald-600 text-emerald-700 dark:text-emerald-400'
              : 'border-transparent text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'
          }`}
        >
          Restore Archive
        </button>
      </div>

      {activeTab === 'backup' ? (
        <div className="space-y-6">
          {/* Full Backup Card */}
          <div className="p-6 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-sm space-y-4">
            <div className="flex items-start gap-3">
              <div className="p-3 bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 rounded-xl">
                <FileArchive className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900 dark:text-white">
                  Full SmartVault ZIP Archive
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 max-w-xl">
                  Bundles all original photos, thumbnails, products, categories, stock transactions,
                  search index, and user settings into a self-contained portable ZIP.
                </p>
              </div>
            </div>

            {backupProgress && (
              <div className="space-y-1.5 p-4 bg-gray-50 dark:bg-gray-800 rounded-xl border">
                <div className="flex justify-between text-xs font-semibold text-gray-700 dark:text-gray-300">
                  <span>{backupProgress.msg}</span>
                  <span>{backupProgress.pct}%</span>
                </div>
                <ProgressBar value={backupProgress.pct} color="emerald" size="sm" />
              </div>
            )}

            <Button
              variant="primary"
              size="md"
              loading={isBackingUp}
              icon={<Download className="w-4 h-4" />}
              onClick={handleCreateBackup}
            >
              Generate Full Backup (.zip)
            </Button>
          </div>

          {/* Partial Exports */}
          <div className="p-6 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-sm space-y-4">
            <h3 className="font-bold text-sm text-gray-800 dark:text-gray-200 uppercase tracking-wider">
              Spreadsheet (CSV) Exports
            </h3>
            <p className="text-xs text-gray-500">
              Export tabular records for accounting, audits, or Excel/Sheets analysis. Note: CSV exports do not include photo image files.
            </p>

            <div className="flex flex-wrap gap-3">
              <Button
                variant="outline"
                size="sm"
                icon={<FileSpreadsheet className="w-4 h-4 text-emerald-600" />}
                onClick={handleExportProducts}
              >
                Export Products CSV
              </Button>
              <Button
                variant="outline"
                size="sm"
                icon={<FileSpreadsheet className="w-4 h-4 text-teal-600" />}
                onClick={handleExportTransactions}
              >
                Export Stock Movements CSV
              </Button>
            </div>
          </div>
        </div>
      ) : (
        /* Restore Tab */
        <div className="space-y-6">
          <div className="p-6 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-sm space-y-4">
            <div className="flex items-start gap-3">
              <div className="p-3 bg-blue-100 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 rounded-xl">
                <Upload className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900 dark:text-white">
                  Restore from Backup ZIP
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  Select a valid `.zip` created with SmartVault. Archives are validated before importing.
                </p>
              </div>
            </div>

            <input
              type="file"
              accept=".zip"
              onChange={handleFileSelected}
              className="block w-full text-xs text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100"
            />

            {/* Preview Results */}
            {preview && (
              <div className="p-4 bg-gray-50 dark:bg-gray-800/80 rounded-xl border border-gray-200 dark:border-gray-700 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-xs text-gray-700 dark:text-gray-300">
                    Backup Manifest
                  </span>
                  <span className="text-xs text-gray-400">
                    Created: {formatDate(new Date(preview.manifest.createdAt))}
                  </span>
                </div>

                {/* Counts */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  <div className="p-2 rounded bg-white dark:bg-gray-900 border">
                    <span className="text-gray-400">Photos:</span>{' '}
                    <strong>{preview.manifest.counts?.photos ?? 0}</strong>
                  </div>
                  <div className="p-2 rounded bg-white dark:bg-gray-900 border">
                    <span className="text-gray-400">Products:</span>{' '}
                    <strong>{preview.manifest.counts?.products ?? 0}</strong>
                  </div>
                  <div className="p-2 rounded bg-white dark:bg-gray-900 border">
                    <span className="text-gray-400">Categories:</span>{' '}
                    <strong>{preview.manifest.counts?.categories ?? 0}</strong>
                  </div>
                  <div className="p-2 rounded bg-white dark:bg-gray-900 border">
                    <span className="text-gray-400">Transactions:</span>{' '}
                    <strong>{preview.manifest.counts?.stockTransactions ?? 0}</strong>
                  </div>
                </div>

                {preview.errors.length > 0 && (
                  <div className="p-2.5 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded text-xs text-red-600">
                    {preview.errors.join(', ')}
                  </div>
                )}

                {/* Mode Selector */}
                <div className="pt-2 border-t border-gray-200 dark:border-gray-700 space-y-2">
                  <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 block">
                    Restore Mode:
                  </label>
                  <div className="flex items-center gap-4 text-xs">
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="radio"
                        name="mode"
                        checked={restoreMode === 'merge'}
                        onChange={() => setRestoreMode('merge')}
                        className="text-emerald-600 focus:ring-emerald-500"
                      />
                      <span>Merge (Keep current data, add archive records)</span>
                    </label>

                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="radio"
                        name="mode"
                        checked={restoreMode === 'replace'}
                        onChange={() => setRestoreMode('replace')}
                        className="text-red-600 focus:ring-red-500"
                      />
                      <span className="text-red-600 font-semibold">
                        Replace (Wipe existing data first)
                      </span>
                    </label>
                  </div>

                  {restoreMode === 'replace' && (
                    <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-lg space-y-2">
                      <p className="text-xs text-red-700 dark:text-red-300 font-medium">
                        Warning: Destructive operation. All current photos, products, and movements will be erased.
                      </p>
                      <label className="flex items-center gap-2 text-xs font-bold text-red-700 dark:text-red-200 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={confirmReplace}
                          onChange={(e) => setConfirmReplace(e.target.checked)}
                          className="rounded text-red-600"
                        />
                        I understand this permanently deletes my current database
                      </label>
                    </div>
                  )}
                </div>

                {restoreProgress && (
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs font-semibold">
                      <span>{restoreProgress.msg}</span>
                      <span>{restoreProgress.pct}%</span>
                    </div>
                    <ProgressBar value={restoreProgress.pct} color="emerald" size="sm" />
                  </div>
                )}

                <div className="flex justify-end pt-2">
                  <Button
                    variant={restoreMode === 'replace' ? 'danger' : 'primary'}
                    size="sm"
                    loading={isRestoring}
                    disabled={!preview.valid || (restoreMode === 'replace' && !confirmReplace)}
                    onClick={handleRunRestore}
                  >
                    Start Restore
                  </Button>
                </div>
              </div>
            )}

            {restoreResult && (
              <div className="p-4 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs space-y-1">
                <p className="font-bold text-emerald-800 dark:text-emerald-200 flex items-center gap-1.5">
                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                  Restore Successful!
                </p>
                <p className="text-emerald-700 dark:text-emerald-300">
                  Restored {restoreResult.restored} records ({restoreResult.skipped} skipped).
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
export default ImportBackup;
