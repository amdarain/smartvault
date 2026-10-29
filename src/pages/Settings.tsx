import React, { useState, useEffect } from 'react';
import {
  Palette,
  Search,
  Package,
  HardDrive,
  Shield,
  Info,
  Sparkles,
  Download,
  Trash2,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react';
import { useSettingsStore } from '../store/settingsStore';
import { useStorage } from '../hooks/useStorage';
import { useNetworkStatus } from '../hooks/useNetworkStatus';
import { aiService } from '../services/aiService';
import type { ModelProgress } from '../services/aiService';
import { clearSearchHistory } from '../services/searchService';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { ProgressBar } from '../components/ui/Spinner';
import { Dialog, ConfirmDialog } from '../components/ui/Dialog';
import { useToast } from '../components/ui/Toast';
import { formatBytes } from '../utils/format';
import { db } from '../db/db';
import type { Theme, GridDensity, ThumbnailSize, NegativeStockPolicy } from '../types/settings';

export const Settings: React.FC = () => {
  const { settings, updateSetting, updateSettings } = useSettingsStore();
  const storage = useStorage();
  const isOnline = useNetworkStatus();
  const toast = useToast();

  const [activeTab, setActiveTab] = useState<
    'appearance' | 'search' | 'inventory' | 'storage' | 'privacy' | 'application'
  >('appearance');

  // AI Model Manager state
  const [downloadProgress, setDownloadProgress] = useState<ModelProgress | null>(null);
  const [aiLoading, setAiLoading] = useState(aiService.isLoading);
  const [aiReady, setAiReady] = useState(aiService.isReady);
  const [aiError, setAiError] = useState<string | null>(null);

  // Privacy confirm states
  const [showClearHistoryConfirm, setShowClearHistoryConfirm] = useState(false);
  const [showDeleteAllModal, setShowDeleteAllModal] = useState(false);
  const [deleteConfirmationText, setDeleteConfirmationText] = useState('');

  // Service Worker state
  const [swRegistered, setSwRegistered] = useState(false);

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistration().then((reg) => {
        setSwRegistered(!!reg);
      });
    }
  }, []);

  // Listen to AI service events
  useEffect(() => {
    const unsubProgress = aiService.onProgress((p) => {
      setDownloadProgress(p);
      setAiLoading(true);
    });

    const unsubReady = aiService.onReady(() => {
      setAiReady(true);
      setAiLoading(false);
      setDownloadProgress(null);
      updateSetting('aiModelStatus', 'ready');
      toast.success('AI Model ready for offline visual search.');
    });

    const unsubError = aiService.onError((err) => {
      setAiError(err);
      setAiLoading(false);
      setDownloadProgress(null);
      updateSetting('aiModelStatus', 'error');
      toast.error(`Model loading failed: ${err}`);
    });

    return () => {
      unsubProgress();
      unsubReady();
      unsubError();
    };
  }, [updateSetting, toast]);

  const handleDownloadModel = async () => {
    setAiError(null);
    setAiLoading(true);
    updateSetting('aiModelStatus', 'downloading');
    try {
      await aiService.loadModel(settings.aiModelId);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Download failed';
      setAiError(msg);
      setAiLoading(false);
      updateSetting('aiModelStatus', 'error');
    }
  };

  const handleUnloadModel = () => {
    aiService.unload();
    setAiReady(false);
    updateSetting('aiModelStatus', 'not_downloaded');
    toast.info('AI Model unloaded from memory.');
  };

  const handleDeleteAllData = async () => {
    if (deleteConfirmationText !== 'DELETE') return;
    try {
      await Promise.all([
        db.photos.clear(),
        db.imageBlobs.clear(),
        db.thumbnails.clear(),
        db.embeddings.clear(),
        db.products.clear(),
        db.categories.clear(),
        db.stockTransactions.clear(),
        db.tags.clear(),
        db.searchHistory.clear(),
      ]);
      toast.success('All local vault data has been deleted.');
      setShowDeleteAllModal(false);
      setTimeout(() => window.location.reload(), 1000);
    } catch {
      toast.error('Failed to wipe data');
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Settings</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
          Configure interface preferences, offline AI models, and local storage limits.
        </p>
      </div>

      {/* Tabs navigation */}
      <div className="flex border-b border-gray-200 dark:border-gray-800 overflow-x-auto">
        {[
          { key: 'appearance', label: 'Appearance', icon: <Palette className="w-4 h-4" /> },
          { key: 'search', label: 'Search & AI', icon: <Search className="w-4 h-4" /> },
          { key: 'inventory', label: 'Inventory', icon: <Package className="w-4 h-4" /> },
          { key: 'storage', label: 'Storage', icon: <HardDrive className="w-4 h-4" /> },
          { key: 'privacy', label: 'Privacy & Security', icon: <Shield className="w-4 h-4" /> },
          { key: 'application', label: 'Application Info', icon: <Info className="w-4 h-4" /> },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            className={`flex items-center gap-2 py-3 px-4 text-xs font-semibold whitespace-nowrap border-b-2 transition-colors ${
              activeTab === tab.key
                ? 'border-emerald-600 text-emerald-700 dark:text-emerald-400'
                : 'border-transparent text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* TAB 1: APPEARANCE */}
      {activeTab === 'appearance' && (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 shadow-sm space-y-6">
          <div>
            <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider mb-2">
              Color Theme
            </h3>
            <div className="grid grid-cols-3 gap-3 max-w-md">
              {(['light', 'dark', 'system'] as Theme[]).map((t) => (
                <button
                  key={t}
                  onClick={() => updateSetting('theme', t)}
                  className={`p-3 rounded-xl border text-center text-xs font-semibold capitalize transition-all ${
                    settings.theme === t
                      ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 ring-2 ring-emerald-500/20'
                      : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div className="pt-4 border-t border-gray-100 dark:border-gray-800">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider mb-2">
              Grid Density
            </h3>
            <div className="grid grid-cols-3 gap-3 max-w-md">
              {(['compact', 'comfortable', 'spacious'] as GridDensity[]).map((d) => (
                <button
                  key={d}
                  onClick={() => updateSetting('gridDensity', d)}
                  className={`p-3 rounded-xl border text-center text-xs font-semibold capitalize transition-all ${
                    settings.gridDensity === d
                      ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300'
                      : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>

          <div className="pt-4 border-t border-gray-100 dark:border-gray-800">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider mb-2">
              Thumbnail Size
            </h3>
            <div className="grid grid-cols-3 gap-3 max-w-md">
              {(['small', 'medium', 'large'] as ThumbnailSize[]).map((s) => (
                <button
                  key={s}
                  onClick={() => updateSetting('thumbnailSize', s)}
                  className={`p-3 rounded-xl border text-center text-xs font-semibold capitalize transition-all ${
                    settings.thumbnailSize === s
                      ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300'
                      : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: SEARCH & AI */}
      {activeTab === 'search' && (
        <div className="space-y-6">
          {/* AI Model Manager Section */}
          <div className="p-6 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-sm space-y-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-emerald-600" />
                <h3 className="font-bold text-base text-gray-900 dark:text-white">
                  On-Device CLIP Vision AI Model
                </h3>
              </div>
              <span
                className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                  aiReady
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                    : aiLoading
                    ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                    : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
                }`}
              >
                {aiReady ? 'Active / Ready' : aiLoading ? 'Downloading...' : 'Not Cached'}
              </span>
            </div>

            <p className="text-xs text-gray-500 dark:text-gray-400">
              Model: <code className="font-mono text-emerald-600">{settings.aiModelId}</code> (~170MB). Once downloaded,
              image and text embeddings execute 100% locally on your CPU/WebGPU without sending any data over the internet.
            </p>

            {downloadProgress && (
              <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 space-y-2">
                <div className="flex justify-between text-xs font-medium text-gray-700 dark:text-gray-300">
                  <span className="truncate pr-2">{downloadProgress.status || downloadProgress.file}</span>
                  <span>{Math.round(downloadProgress.progress || 0)}%</span>
                </div>
                <ProgressBar value={downloadProgress.progress || 0} color="emerald" size="sm" />
              </div>
            )}

            {aiError && (
              <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-xl text-xs text-red-600">
                {aiError}
              </div>
            )}

            <div className="flex items-center gap-3 pt-2">
              {!aiReady ? (
                <Button
                  variant="primary"
                  size="sm"
                  loading={aiLoading}
                  icon={<Download className="w-4 h-4" />}
                  onClick={handleDownloadModel}
                >
                  Download Model For Offline AI (~170MB)
                </Button>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  className="text-red-600 hover:bg-red-50"
                  icon={<Trash2 className="w-4 h-4" />}
                  onClick={handleUnloadModel}
                >
                  Unload AI Model
                </Button>
              )}
            </div>
          </div>

          {/* Search Preferences Card */}
          <div className="p-6 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-sm space-y-4">
            <h3 className="font-bold text-sm text-gray-900 dark:text-white uppercase tracking-wider">
              Search Sensitivity & Matching
            </h3>

            <div>
              <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 block mb-1">
                Fuzzy Typo Tolerance: {settings.fuzzyTolerance}
              </label>
              <input
                type="range"
                min="0.0"
                max="0.4"
                step="0.05"
                value={settings.fuzzyTolerance}
                onChange={(e) => updateSetting('fuzzyTolerance', parseFloat(e.target.value))}
                className="w-full accent-emerald-600"
              />
              <p className="text-[11px] text-gray-400 mt-1">
                Lower = strict exact spelling. Higher = tolerates transposed letters and typos (e.g. "samsng" → "Samsung").
              </p>
            </div>

            <div className="pt-4 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between">
              <div>
                <span className="text-sm font-medium text-gray-800 dark:text-gray-200 block">
                  Save Search History
                </span>
                <span className="text-xs text-gray-400">
                  Keep recent queries for instant suggestions
                </span>
              </div>
              <input
                type="checkbox"
                checked={settings.saveSearchHistory}
                onChange={(e) => updateSetting('saveSearchHistory', e.target.checked)}
                className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4"
              />
            </div>

            <div className="pt-2">
              <Button
                variant="outline"
                size="xs"
                onClick={() => setShowClearHistoryConfirm(true)}
              >
                Clear Search History
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: INVENTORY */}
      {activeTab === 'inventory' && (
        <div className="p-6 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-sm space-y-4">
          <h3 className="font-bold text-sm text-gray-900 dark:text-white uppercase tracking-wider mb-2">
            Currency & Units
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Currency Code"
              value={settings.currency}
              onChange={(e) => updateSetting('currency', e.target.value.toUpperCase())}
              hint="e.g. USD, EUR, GBP, PKR, INR, AED"
            />
            <Input
              label="Currency Symbol"
              value={settings.currencySymbol}
              onChange={(e) => updateSetting('currencySymbol', e.target.value)}
              hint="e.g. $, €, £, Rs"
            />
            <Input
              label="Default Measurement Unit"
              value={settings.defaultUnit}
              onChange={(e) => updateSetting('defaultUnit', e.target.value)}
              hint="e.g. pcs, box, kg, meter"
            />
            <Input
              label="Default Minimum Stock Level"
              type="number"
              value={settings.defaultMinStock}
              onChange={(e) => updateSetting('defaultMinStock', parseInt(e.target.value) || 0)}
              hint="Triggers low-stock warning threshold"
            />
          </div>

          <div className="pt-4 border-t border-gray-100 dark:border-gray-800 space-y-2">
            <label className="text-sm font-medium text-gray-800 dark:text-gray-200 block">
              Negative Stock Policy
            </label>
            <select
              value={settings.negativeStockPolicy}
              onChange={(e) => updateSetting('negativeStockPolicy', e.target.value as NegativeStockPolicy)}
              className="rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="prevent">Prevent (Never allow quantity &lt; 0)</option>
              <option value="warn">Warn (Show warning but allow movement)</option>
              <option value="allow">Allow (Permit negative stock counts)</option>
            </select>
            <p className="text-xs text-gray-400">
              Controls whether stock sales or issues can reduce balance below zero.
            </p>
          </div>
        </div>
      )}

      {/* TAB 4: STORAGE */}
      {activeTab === 'storage' && (
        <div className="p-6 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-sm space-y-6">
          <div>
            <h3 className="font-bold text-sm text-gray-900 dark:text-white uppercase tracking-wider mb-2">
              Device Storage Usage
            </h3>
            {storage.usageBytes !== null ? (
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-semibold">
                  <span>Used: {formatBytes(storage.usageBytes)}</span>
                  <span>Available: {storage.quotaBytes ? formatBytes(storage.quotaBytes) : 'Unknown'}</span>
                </div>
                <ProgressBar value={storage.usagePercent || 0} color="emerald" size="md" />
              </div>
            ) : (
              <p className="text-xs text-gray-400">Storage API unsupported by this browser.</p>
            )}
          </div>

          <div className="pt-4 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between">
            <div>
              <span className="text-sm font-medium text-gray-800 dark:text-gray-200 block">
                Persistent Storage Protection
              </span>
              <span className="text-xs text-gray-400">
                {storage.isPersistent
                  ? 'Active: The browser will not purge your photos under low space pressure.'
                  : 'Storage is currently subject to browser automatic cache eviction policies.'}
              </span>
            </div>
            {!storage.isPersistent && (
              <Button
                variant="outline"
                size="xs"
                onClick={async () => {
                  const ok = await storage.requestPersistent();
                  if (ok) toast.success('Persistent storage granted.');
                  else toast.warning('Persistent storage request was denied by browser.');
                }}
              >
                Request Persistence
              </Button>
            )}
          </div>
        </div>
      )}

      {/* TAB 5: PRIVACY */}
      {activeTab === 'privacy' && (
        <div className="p-6 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-sm space-y-6">
          <div className="space-y-2">
            <h3 className="font-bold text-sm text-gray-900 dark:text-white uppercase tracking-wider">
              Local-First Architecture
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
              SmartVault is strictly offline-first. Photos, descriptions, AI embeddings, pricing,
              and stock counts are stored strictly inside your browser's IndexedDB on this device.
              No cloud accounts, third-party analytics, or telemetry servers are involved.
            </p>
          </div>

          <div className="pt-4 border-t border-gray-100 dark:border-gray-800 space-y-3">
            <h4 className="font-semibold text-xs text-red-600 uppercase tracking-wider">
              Danger Zone
            </h4>
            <p className="text-xs text-gray-400">
              Permanently wipe the local IndexedDB database and reset all application settings.
            </p>
            <Button
              variant="danger"
              size="sm"
              icon={<Trash2 className="w-4 h-4" />}
              onClick={() => {
                setDeleteConfirmationText('');
                setShowDeleteAllModal(true);
              }}
            >
              Delete All App Data
            </Button>
          </div>
        </div>
      )}

      {/* TAB 6: APPLICATION INFO */}
      {activeTab === 'application' && (
        <div className="p-6 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-sm divide-y divide-gray-100 dark:divide-gray-800 text-xs">
          <div className="py-2.5 flex justify-between">
            <span className="text-gray-500">App Name</span>
            <span className="font-bold text-gray-800 dark:text-gray-200">SmartVault PWA</span>
          </div>
          <div className="py-2.5 flex justify-between">
            <span className="text-gray-500">App Version</span>
            <span className="font-mono text-gray-800 dark:text-gray-200">1.0.0</span>
          </div>
          <div className="py-2.5 flex justify-between">
            <span className="text-gray-500">IndexedDB Schema Version</span>
            <span className="font-mono text-gray-800 dark:text-gray-200">1</span>
          </div>
          <div className="py-2.5 flex justify-between">
            <span className="text-gray-500">Service Worker</span>
            <span className={`font-semibold ${swRegistered ? 'text-emerald-600' : 'text-gray-400'}`}>
              {swRegistered ? 'Active (Offline Ready)' : 'Not Registered'}
            </span>
          </div>
          <div className="py-2.5 flex justify-between">
            <span className="text-gray-500">Network Connectivity</span>
            <span className={`font-semibold ${isOnline ? 'text-emerald-600' : 'text-amber-500'}`}>
              {isOnline ? 'Online' : 'Offline Mode'}
            </span>
          </div>
        </div>
      )}

      {/* Clear Search History Dialog */}
      <ConfirmDialog
        open={showClearHistoryConfirm}
        onClose={() => setShowClearHistoryConfirm(false)}
        onConfirm={async () => {
          await clearSearchHistory();
          setShowClearHistoryConfirm(false);
          toast.success('Search history cleared.');
        }}
        title="Clear Search History"
        message="Are you sure you want to delete all saved search terms?"
        confirmLabel="Clear History"
      />

      {/* Wipe All Data Dialog */}
      <Dialog
        open={showDeleteAllModal}
        onClose={() => setShowDeleteAllModal(false)}
        title="Delete All App Data"
        size="sm"
      >
        <div className="space-y-4">
          <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-lg text-xs text-red-600 space-y-1">
            <p className="font-bold">Irreversible Action</p>
            <p>
              This will permanently delete all photos, products, categories, stock transactions, and
              settings stored on this device.
            </p>
          </div>

          <div>
            <label className="text-xs text-gray-600 dark:text-gray-300 block mb-1">
              Type <strong className="text-red-600">DELETE</strong> to confirm:
            </label>
            <input
              type="text"
              value={deleteConfirmationText}
              onChange={(e) => setDeleteConfirmationText(e.target.value)}
              placeholder="DELETE"
              className="w-full px-3 py-1.5 text-xs rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 outline-none focus:ring-2 focus:ring-red-500"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t">
            <Button variant="ghost" size="sm" onClick={() => setShowDeleteAllModal(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              size="sm"
              disabled={deleteConfirmationText !== 'DELETE'}
              onClick={handleDeleteAllData}
            >
              Permanently Wipe Vault
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
};
export default Settings;
