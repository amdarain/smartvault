import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Image,
  Package,
  BarChart3,
  AlertTriangle,
  XCircle,
  DollarSign,
  Plus,
  Search,
  Upload,
  Camera,
  ArrowLeftRight,
  HardDrive,
  Clock,
} from 'lucide-react';
import { StatCard } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { ProgressBar } from '../components/ui/Spinner';
import { formatBytes, formatCurrency, timeAgo } from '../utils/format';
import { countPhotos, getPhotos } from '../services/photoService';
import {
  countProducts,
  getLowStockProducts,
  getOutOfStockProducts,
  getTotalInventoryValue,
  getAllProducts,
} from '../services/productService';
import { getRecentTransactions } from '../services/stockService';
import { getSearchHistory } from '../services/searchService';
import { useStorage } from '../hooks/useStorage';
import { useSettingsStore } from '../store/settingsStore';
import type { Photo } from '../types/photo';
import type { Product } from '../types/product';
import type { StockTransaction } from '../types/stock';
import type { SearchHistoryEntry } from '../types/search';
import { db } from '../db/db';
import PhotoUploader from '../components/photos/PhotoUploader';
import StockMovementForm from '../components/stock/StockMovementForm';
import { MOVEMENT_LABELS } from '../types/stock';

interface DashboardStats {
  photoCount: number;
  productCount: number;
  totalStock: number;
  lowStockCount: number;
  outOfStockCount: number;
  inventoryValue: number | null;
  recentPhotos: Photo[];
  recentTransactions: StockTransaction[];
  recentSearches: SearchHistoryEntry[];
  recentProducts: Product[];
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { settings } = useSettingsStore();
  const storage = useStorage();

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [showUploader, setShowUploader] = useState(false);
  const [showStockForm, setShowStockForm] = useState(false);

  const loadStats = useCallback(async () => {
    try {
      const [
        photoCount,
        productCount,
        lowStock,
        outOfStock,
        inventoryValue,
        recentPhotos,
        recentTransactions,
        recentSearches,
        allProducts,
      ] = await Promise.all([
        countPhotos(),
        countProducts(),
        getLowStockProducts(),
        getOutOfStockProducts(),
        getTotalInventoryValue(),
        getPhotos({}, 'createdAt', 'desc', 6),
        getRecentTransactions(8),
        getSearchHistory(5),
        getAllProducts(),
      ]);

      const totalStock = allProducts.reduce((sum, p) => sum + p.quantity, 0);

      // Most recently updated products
      const recentProducts = [...allProducts]
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
        .slice(0, 5);

      setStats({
        photoCount,
        productCount,
        totalStock,
        lowStockCount: lowStock.length,
        outOfStockCount: outOfStock.length,
        inventoryValue: inventoryValue > 0 ? inventoryValue : null,
        recentPhotos,
        recentTransactions,
        recentSearches,
        recentProducts,
      });
    } catch (err) {
      console.error('Dashboard load error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  if (loading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-48" />
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-28 bg-gray-200 dark:bg-gray-700 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  const s = stats!;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Welcome back — here's what's happening in your vault.
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            icon={<Camera className="w-4 h-4" />}
            onClick={() => setShowUploader(true)}
          >
            Add Photo
          </Button>
          <Button
            variant="primary"
            size="sm"
            icon={<Plus className="w-4 h-4" />}
            onClick={() => navigate('/products?new=1')}
          >
            Add Product
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatCard
          title="Total Photos"
          value={s.photoCount.toLocaleString()}
          icon={<Image className="w-5 h-5" />}
          iconColor="text-blue-500"
          onClick={() => navigate('/photos')}
        />
        <StatCard
          title="Total Products"
          value={s.productCount.toLocaleString()}
          icon={<Package className="w-5 h-5" />}
          iconColor="text-emerald-600"
          onClick={() => navigate('/products')}
        />
        <StatCard
          title="Total Stock"
          value={s.totalStock.toLocaleString()}
          subtitle="units across all products"
          icon={<BarChart3 className="w-5 h-5" />}
          iconColor="text-purple-500"
          onClick={() => navigate('/stock')}
        />
        <StatCard
          title="Low Stock"
          value={s.lowStockCount}
          icon={<AlertTriangle className="w-5 h-5" />}
          iconColor={s.lowStockCount > 0 ? 'text-amber-500' : 'text-gray-400'}
          onClick={() => navigate('/stock?filter=low')}
        />
        <StatCard
          title="Out of Stock"
          value={s.outOfStockCount}
          icon={<XCircle className="w-5 h-5" />}
          iconColor={s.outOfStockCount > 0 ? 'text-red-500' : 'text-gray-400'}
          onClick={() => navigate('/stock?filter=out')}
        />
        <StatCard
          title="Inventory Value"
          value={
            s.inventoryValue !== null
              ? formatCurrency(s.inventoryValue, settings.currency, settings.currencySymbol)
              : '—'
          }
          subtitle={s.inventoryValue === null ? 'Add cost prices' : 'estimated'}
          icon={<DollarSign className="w-5 h-5" />}
          iconColor="text-emerald-600"
          onClick={() => navigate('/reports')}
        />
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
          Quick Actions
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            {
              icon: <Camera className="w-5 h-5" />,
              label: 'Add Photo',
              onClick: () => setShowUploader(true),
              color: 'text-blue-600 bg-blue-50 dark:bg-blue-900/20',
            },
            {
              icon: <Package className="w-5 h-5" />,
              label: 'Add Product',
              onClick: () => navigate('/products?new=1'),
              color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20',
            },
            {
              icon: <Search className="w-5 h-5" />,
              label: 'Search Photos',
              onClick: () => navigate('/search'),
              color: 'text-purple-600 bg-purple-50 dark:bg-purple-900/20',
            },
            {
              icon: <Upload className="w-5 h-5" />,
              label: 'Bulk Import',
              onClick: () => navigate('/backup'),
              color: 'text-orange-600 bg-orange-50 dark:bg-orange-900/20',
            },
            {
              icon: <ArrowLeftRight className="w-5 h-5" />,
              label: 'Record Stock',
              onClick: () => setShowStockForm(true),
              color: 'text-teal-600 bg-teal-50 dark:bg-teal-900/20',
            },
            {
              icon: <HardDrive className="w-5 h-5" />,
              label: 'Backup',
              onClick: () => navigate('/backup'),
              color: 'text-gray-600 bg-gray-50 dark:bg-gray-800',
            },
          ].map((action) => (
            <button
              key={action.label}
              onClick={action.onClick}
              className="flex flex-col items-center gap-2 p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:shadow-md transition-shadow"
            >
              <span className={`p-2.5 rounded-xl ${action.color}`}>{action.icon}</span>
              <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                {action.label}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Two-column layout: Recent Photos + Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Photos */}
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Recently Added Photos
            </h2>
            <button
              onClick={() => navigate('/photos')}
              className="text-xs text-emerald-600 hover:text-emerald-700 font-medium"
            >
              View all
            </button>
          </div>
          {s.recentPhotos.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-8 text-center">
              <Image className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-500">No photos yet. Add your first photo!</p>
              <Button
                variant="primary"
                size="sm"
                className="mt-3"
                onClick={() => setShowUploader(true)}
              >
                Add Photo
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {s.recentPhotos.map((photo) => (
                <RecentPhotoThumb key={photo.id} photo={photo} onClick={() => navigate(`/photos?view=${photo.id}`)} />
              ))}
            </div>
          )}
        </div>

        {/* Activity sidebar */}
        <div className="space-y-6">
          {/* Recent Transactions */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Recent Transactions
              </h2>
              <button
                onClick={() => navigate('/transactions')}
                className="text-xs text-emerald-600 hover:text-emerald-700 font-medium"
              >
                View all
              </button>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 divide-y divide-gray-100 dark:divide-gray-700 overflow-hidden">
              {s.recentTransactions.length === 0 ? (
                <p className="p-4 text-sm text-gray-400 text-center">No transactions yet.</p>
              ) : (
                s.recentTransactions.slice(0, 5).map((tx) => (
                  <div key={tx.id} className="flex items-center justify-between px-4 py-2.5 text-sm">
                    <div>
                      <p className="font-medium text-gray-800 dark:text-gray-200">
                        {MOVEMENT_LABELS[tx.type]}
                      </p>
                      <p className="text-xs text-gray-400">{timeAgo(tx.createdAt)}</p>
                    </div>
                    <span
                      className={`font-semibold ${tx.quantityChange >= 0 ? 'text-emerald-600' : 'text-red-500'}`}
                    >
                      {tx.quantityChange >= 0 ? '+' : ''}
                      {tx.quantityChange}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Recent Searches */}
          {s.recentSearches.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Recent Searches
                </h2>
              </div>
              <div className="flex flex-wrap gap-2">
                {s.recentSearches.map((h) => (
                  <button
                    key={h.id}
                    onClick={() => navigate(`/search?q=${encodeURIComponent(h.query)}`)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-full text-xs text-gray-600 dark:text-gray-300 hover:border-emerald-400 transition-colors"
                  >
                    <Clock className="w-3 h-3" />
                    {h.query}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Storage Usage */}
          <div>
            <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
              Storage
            </h2>
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 space-y-3">
              {storage.usageBytes !== null ? (
                <>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Used</span>
                    <span className="font-medium text-gray-800 dark:text-gray-200">
                      {formatBytes(storage.usageBytes)}
                    </span>
                  </div>
                  {storage.quotaBytes && (
                    <ProgressBar
                      value={storage.usagePercent ?? 0}
                      color={
                        (storage.usagePercent ?? 0) > 80
                          ? 'red'
                          : (storage.usagePercent ?? 0) > 60
                          ? 'amber'
                          : 'emerald'
                      }
                      showLabel
                    />
                  )}
                  {storage.quotaBytes && (
                    <p className="text-xs text-gray-400">
                      of {formatBytes(storage.quotaBytes)} available
                    </p>
                  )}
                  <div className="flex items-center gap-1.5 text-xs text-gray-400">
                    <HardDrive className="w-3.5 h-3.5" />
                    {storage.isPersistent ? 'Persistent storage granted' : 'Storage may be cleared by browser'}
                  </div>
                </>
              ) : (
                <p className="text-sm text-gray-400">Storage info unavailable in this browser.</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      {showUploader && (
        <PhotoUploader
          onClose={() => {
            setShowUploader(false);
            loadStats();
          }}
        />
      )}
      {showStockForm && (
        <StockMovementForm
          onClose={() => {
            setShowStockForm(false);
            loadStats();
          }}
        />
      )}
    </div>
  );
}

function RecentPhotoThumb({ photo, onClick }: { photo: Photo; onClick: () => void }) {
  const [thumbUrl, setThumbUrl] = useState<string | null>(null);

  useEffect(() => {
    db.thumbnails.get(photo.id).then((rec) => {
      if (rec) setThumbUrl(URL.createObjectURL(rec.blob));
    });
    return () => {
      if (thumbUrl) URL.revokeObjectURL(thumbUrl);
    };
  }, [photo.id]);

  return (
    <button
      onClick={onClick}
      className="aspect-square rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-700 hover:opacity-90 transition-opacity"
    >
      {thumbUrl ? (
        <img src={thumbUrl} alt={photo.title} className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full flex items-center justify-center text-gray-300">
          <Image className="w-6 h-6" />
        </div>
      )}
    </button>
  );
}
