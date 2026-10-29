import React from 'react';
import {
  HelpCircle,
  Wifi,
  WifiOff,
  Download,
  Smartphone,
  Laptop,
  CheckCircle,
  Keyboard,
  Sparkles,
  ShieldCheck,
} from 'lucide-react';
import { useNetworkStatus } from '../hooks/useNetworkStatus';
import { usePWA } from '../hooks/usePWA';
import { Button } from '../components/ui/Button';

export const Help: React.FC = () => {
  const isOnline = useNetworkStatus();
  const { isInstalled, canInstall, install } = usePWA();

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          Help & Offline Status
          <HelpCircle className="w-5 h-5 text-emerald-600" />
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
          Everything you need to know about installation, offline capabilities, shortcuts, and troubleshooting.
        </p>
      </div>

      {/* Live System & Offline Status Banner */}
      <div className="p-6 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-sm space-y-4">
        <h2 className="font-bold text-sm text-gray-900 dark:text-white uppercase tracking-wider">
          Current System Status
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 flex items-center gap-3">
            {isOnline ? (
              <Wifi className="w-5 h-5 text-emerald-500 flex-shrink-0" />
            ) : (
              <WifiOff className="w-5 h-5 text-amber-500 flex-shrink-0" />
            )}
            <div>
              <span className="text-gray-400 block font-medium">Internet Connectivity</span>
              <strong className={isOnline ? 'text-emerald-600' : 'text-amber-500'}>
                {isOnline ? 'Connected (Online)' : 'No Network (Offline)'}
              </strong>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-emerald-500 flex-shrink-0" />
            <div>
              <span className="text-gray-400 block font-medium">Offline Storage (IndexedDB)</span>
              <strong className="text-emerald-600">Active & Available</strong>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 flex items-center gap-3">
            <Smartphone className="w-5 h-5 text-emerald-500 flex-shrink-0" />
            <div>
              <span className="text-gray-400 block font-medium">App Installation Mode</span>
              <strong className={isInstalled ? 'text-emerald-600' : 'text-gray-600 dark:text-gray-300'}>
                {isInstalled ? 'Installed PWA (Standalone)' : 'Browser Tab'}
              </strong>
            </div>
          </div>
        </div>

        {canInstall && (
          <div className="pt-2">
            <Button
              variant="primary"
              size="sm"
              icon={<Download className="w-4 h-4" />}
              onClick={install}
            >
              Install SmartVault as an App
            </Button>
          </div>
        )}
      </div>

      {/* Getting Started Guide */}
      <div className="p-6 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-sm space-y-4">
        <h2 className="font-bold text-sm text-gray-900 dark:text-white uppercase tracking-wider">
          Quick Start Guide
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-100 dark:border-gray-800 space-y-2">
            <span className="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 font-bold flex items-center justify-center">
              1
            </span>
            <h3 className="font-bold text-sm text-gray-800 dark:text-gray-200">Import Your Photos</h3>
            <p className="text-gray-500 dark:text-gray-400 leading-relaxed">
              Drag and drop product images or snap with your mobile camera. Add descriptive captions and tags for offline instant search.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-100 dark:border-gray-800 space-y-2">
            <span className="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 font-bold flex items-center justify-center">
              2
            </span>
            <h3 className="font-bold text-sm text-gray-800 dark:text-gray-200">Catalog Products & Stock</h3>
            <p className="text-gray-500 dark:text-gray-400 leading-relaxed">
              Create inventory products with SKUs, units, and minimum stock alerts. Attach your photos and record receiving or sales movements.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-100 dark:border-gray-800 space-y-2">
            <span className="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 font-bold flex items-center justify-center">
              3
            </span>
            <h3 className="font-bold text-sm text-gray-800 dark:text-gray-200">Smart Search & Backup</h3>
            <p className="text-gray-500 dark:text-gray-400 leading-relaxed">
              Search by title, SKU, typo variations, or semantic AI embeddings. Periodically download a ZIP backup to protect your local data.
            </p>
          </div>
        </div>
      </div>

      {/* PWA Installation Instructions */}
      <div className="p-6 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-sm space-y-4">
        <h2 className="font-bold text-sm text-gray-900 dark:text-white uppercase tracking-wider">
          How to Install on Mobile & Desktop
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div className="space-y-1.5">
            <strong className="text-gray-800 dark:text-gray-200 block text-sm">Chrome / Edge (Desktop)</strong>
            <p className="text-gray-500">
              Look for the install icon in the right side of the address bar, or open the browser menu (⋮) and select <strong>Install SmartVault</strong>.
            </p>
          </div>

          <div className="space-y-1.5">
            <strong className="text-gray-800 dark:text-gray-200 block text-sm">Android (Chrome)</strong>
            <p className="text-gray-500">
              Tap the menu (⋮) at top right, then select <strong>Install App</strong> or <strong>Add to Home Screen</strong>.
            </p>
          </div>

          <div className="space-y-1.5">
            <strong className="text-gray-800 dark:text-gray-200 block text-sm">iOS / iPadOS (Safari)</strong>
            <p className="text-gray-500">
              Tap the <strong>Share</strong> button (box with upward arrow) at the bottom toolbar, scroll down, and select <strong>Add to Home Screen</strong>.
            </p>
          </div>
        </div>
      </div>

      {/* Offline Features Matrix */}
      <div className="p-6 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-sm space-y-4">
        <h2 className="font-bold text-sm text-gray-900 dark:text-white uppercase tracking-wider">
          Offline Capability Matrix
        </h2>

        <div className="overflow-x-auto text-xs">
          <table className="w-full text-left">
            <thead className="bg-gray-50 dark:bg-gray-800 text-gray-500 font-semibold border-b">
              <tr>
                <th className="p-2.5">Feature</th>
                <th className="p-2.5">Works Fully Offline?</th>
                <th className="p-2.5">Data Storage / Engine</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              <tr>
                <td className="p-2.5 font-medium">Browse & Manage Photos</td>
                <td className="p-2.5 text-emerald-600 font-semibold">✓ Yes</td>
                <td className="p-2.5 text-gray-400">IndexedDB Blobs</td>
              </tr>
              <tr>
                <td className="p-2.5 font-medium">Text & Typo Search</td>
                <td className="p-2.5 text-emerald-600 font-semibold">✓ Yes</td>
                <td className="p-2.5 text-gray-400">MiniSearch in-memory index</td>
              </tr>
              <tr>
                <td className="p-2.5 font-medium">AI Visual Similarity Search</td>
                <td className="p-2.5 text-emerald-600 font-semibold">✓ Yes (once model cached)</td>
                <td className="p-2.5 text-gray-400">CLIP ONNX Web Worker</td>
              </tr>
              <tr>
                <td className="p-2.5 font-medium">Product & Stock Movements</td>
                <td className="p-2.5 text-emerald-600 font-semibold">✓ Yes</td>
                <td className="p-2.5 text-gray-400">Atomic Dexie Transactions</td>
              </tr>
              <tr>
                <td className="p-2.5 font-medium">ZIP Backup & CSV Export</td>
                <td className="p-2.5 text-emerald-600 font-semibold">✓ Yes</td>
                <td className="p-2.5 text-gray-400">Client-side JSZip</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Keyboard Shortcuts */}
      <div className="p-6 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-sm space-y-4">
        <h2 className="font-bold text-sm text-gray-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
          <Keyboard className="w-4 h-4 text-emerald-600" />
          Desktop Keyboard Shortcuts
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="flex justify-between p-2 rounded bg-gray-50 dark:bg-gray-800">
            <span className="text-gray-600 dark:text-gray-300">Previous / Next Photo (Viewer)</span>
            <kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-gray-700 border font-mono">← / →</kbd>
          </div>
          <div className="flex justify-between p-2 rounded bg-gray-50 dark:bg-gray-800">
            <span className="text-gray-600 dark:text-gray-300">Close modal or viewer</span>
            <kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-gray-700 border font-mono">Esc</kbd>
          </div>
        </div>
      </div>
    </div>
  );
};
export default Help;
