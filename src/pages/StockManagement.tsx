import React, { useState, useEffect, useCallback } from 'react';
import {
  BarChart3,
  AlertTriangle,
  XCircle,
  Package,
  ArrowLeftRight,
  History,
  TrendingDown,
  TrendingUp,
  Search,
} from 'lucide-react';
import {
  getProductsWithStatus,
  getLowStockProducts,
  getOutOfStockProducts,
} from '../services/productService';
import { getTransactionsForProduct } from '../services/stockService';
import { Button } from '../components/ui/Button';
import { Card, StatCard } from '../components/ui/Card';
import { StockBadge } from '../components/ui/Badge';
import { Dialog } from '../components/ui/Dialog';
import { EmptyState, Spinner } from '../components/ui/Spinner';
import { formatDateTime } from '../utils/format';
import type { ProductWithStatus } from '../types/product';
import type { StockTransaction } from '../types/stock';
import { MOVEMENT_LABELS, MOVEMENT_COLORS } from '../types/stock';
import StockMovementForm from '../components/stock/StockMovementForm';

export const StockManagement: React.FC = () => {
  const [products, setProducts] = useState<ProductWithStatus[]>([]);
  const [lowStockCount, setLowStockCount] = useState(0);
  const [outOfStockCount, setOutOfStockCount] = useState(0);
  const [loading, setLoading] = useState(true);

  // Filters
  const [filterTab, setFilterTab] = useState<'all' | 'low' | 'out'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState<'qty_asc' | 'qty_desc' | 'name'>('qty_asc');

  // Modals
  const [movementProductId, setMovementProductId] = useState<string | null>(null);
  const [historyProduct, setHistoryProduct] = useState<ProductWithStatus | null>(null);
  const [historyList, setHistoryList] = useState<StockTransaction[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [prods, low, out] = await Promise.all([
        getProductsWithStatus(),
        getLowStockProducts(),
        getOutOfStockProducts(),
      ]);
      setProducts(prods);
      setLowStockCount(low.length);
      setOutOfStockCount(out.length);
    } catch (err) {
      console.error('Failed to load stock inventory:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleOpenHistory = async (p: ProductWithStatus) => {
    setHistoryProduct(p);
    setHistoryLoading(true);
    try {
      const txs = await getTransactionsForProduct(p.id);
      setHistoryList(txs);
    } catch (err) {
      console.error('Failed to load history:', err);
    } finally {
      setHistoryLoading(false);
    }
  };

  const filtered = products
    .filter((p) => {
      if (filterTab === 'low') return p.stockStatus === 'low_stock';
      if (filterTab === 'out') return p.stockStatus === 'out_of_stock';
      return true;
    })
    .filter((p) => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        p.name.toLowerCase().includes(q) ||
        (p.sku && p.sku.toLowerCase().includes(q))
      );
    })
    .sort((a, b) => {
      if (sortOrder === 'qty_asc') return a.quantity - b.quantity;
      if (sortOrder === 'qty_desc') return b.quantity - a.quantity;
      return a.name.localeCompare(b.name);
    });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          Stock Management
          <BarChart3 className="w-6 h-6 text-emerald-600" />
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
          Monitor inventory levels, low-stock warnings, and record stock movements.
        </p>
      </div>

      {/* Warning banner if items low or out */}
      {(lowStockCount > 0 || outOfStockCount > 0) && (
        <div className="p-4 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl flex items-center justify-between text-sm">
          <div className="flex items-center gap-2 text-amber-800 dark:text-amber-200 font-medium">
            <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />
            <span>
              Attention required: {outOfStockCount} out of stock and {lowStockCount} low in stock.
            </span>
          </div>
          <button
            onClick={() => setFilterTab('low')}
            className="text-xs text-amber-800 dark:text-amber-200 underline font-semibold"
          >
            Review Items
          </button>
        </div>
      )}

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          title="Tracked Products"
          value={products.length}
          icon={<Package className="w-5 h-5" />}
          iconColor="text-blue-500"
          onClick={() => setFilterTab('all')}
        />
        <StatCard
          title="Low Stock Items"
          value={lowStockCount}
          icon={<AlertTriangle className="w-5 h-5" />}
          iconColor={lowStockCount > 0 ? 'text-amber-500' : 'text-gray-400'}
          onClick={() => setFilterTab('low')}
        />
        <StatCard
          title="Out of Stock Items"
          value={outOfStockCount}
          icon={<XCircle className="w-5 h-5" />}
          iconColor={outOfStockCount > 0 ? 'text-red-500' : 'text-gray-400'}
          onClick={() => setFilterTab('out')}
        />
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm">
        {/* Filter Tabs */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => setFilterTab('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              filterTab === 'all'
                ? 'bg-emerald-700 text-white'
                : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
          >
            All ({products.length})
          </button>
          <button
            onClick={() => setFilterTab('low')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              filterTab === 'low'
                ? 'bg-amber-600 text-white'
                : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
          >
            Low Stock ({lowStockCount})
          </button>
          <button
            onClick={() => setFilterTab('out')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              filterTab === 'out'
                ? 'bg-red-600 text-white'
                : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
          >
            Out of Stock ({outOfStockCount})
          </button>
        </div>

        {/* Search & Sort */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search product..."
              className="pl-8 pr-3 py-1 text-xs rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <select
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value as any)}
            className="rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-2.5 py-1 text-xs text-gray-700 dark:text-gray-200 outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="qty_asc">Quantity (Lowest First)</option>
            <option value="qty_desc">Quantity (Highest First)</option>
            <option value="name">Name (A-Z)</option>
          </select>
        </div>
      </div>

      {/* Product Stock Table / List */}
      {loading ? (
        <div className="p-12 text-center"><Spinner size="lg" /></div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Package className="w-12 h-12" />}
          title="No products match the filter"
          description="Everything looks stocked or no products match your search query."
        />
      ) : (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden shadow-sm">
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {filtered.map((p) => {
              const ratio = p.minStockThreshold > 0
                ? Math.min(100, Math.round((p.quantity / (p.minStockThreshold * 2)) * 100))
                : 100;

              return (
                <div
                  key={p.id}
                  className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-bold text-gray-900 dark:text-white text-sm truncate">
                        {p.name}
                      </h3>
                      {p.sku && (
                        <span className="font-mono text-[11px] px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-500">
                          {p.sku}
                        </span>
                      )}
                      <StockBadge status={p.stockStatus} />
                    </div>

                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <span>Threshold: {p.minStockThreshold} {p.unit}</span>
                      {p.location && <span>Location: {p.location}</span>}
                    </div>

                    {/* Stock level progress bar */}
                    <div className="w-48 h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden mt-2">
                      <div
                        className={`h-full rounded-full ${
                          p.quantity <= 0
                            ? 'bg-red-500'
                            : p.quantity <= p.minStockThreshold
                            ? 'bg-amber-500'
                            : 'bg-emerald-500'
                        }`}
                        style={{ width: `${ratio}%` }}
                      />
                    </div>
                  </div>

                  {/* Quantity and Actions */}
                  <div className="flex items-center justify-between md:justify-end gap-4">
                    <div className="text-right">
                      <span className="text-xs text-gray-400 block">Current Stock</span>
                      <span
                        className={`font-bold text-lg ${
                          p.quantity <= 0
                            ? 'text-red-600'
                            : p.quantity <= p.minStockThreshold
                            ? 'text-amber-600'
                            : 'text-gray-800 dark:text-gray-200'
                        }`}
                      >
                        {p.quantity} <span className="text-xs font-normal text-gray-500">{p.unit}</span>
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="primary"
                        size="xs"
                        icon={<ArrowLeftRight className="w-3.5 h-3.5" />}
                        onClick={() => setMovementProductId(p.id)}
                      >
                        Record
                      </Button>
                      <Button
                        variant="outline"
                        size="xs"
                        icon={<History className="w-3.5 h-3.5" />}
                        onClick={() => handleOpenHistory(p)}
                      >
                        History
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Stock Movement Form Modal */}
      {movementProductId && (
        <StockMovementForm
          productId={movementProductId}
          onClose={() => setMovementProductId(null)}
          onSuccess={loadData}
        />
      )}

      {/* Transaction History Dialog */}
      {historyProduct && (
        <Dialog
          open={true}
          onClose={() => setHistoryProduct(null)}
          title={`Movement History: ${historyProduct.name}`}
          size="lg"
        >
          <div className="space-y-4">
            <div className="flex justify-between items-center text-xs text-gray-500">
              <span>Current Stock: <strong className="text-gray-800 dark:text-gray-200">{historyProduct.quantity} {historyProduct.unit}</strong></span>
              <span>Total Transactions: {historyList.length}</span>
            </div>

            {historyLoading ? (
              <div className="py-8 text-center"><Spinner size="md" /></div>
            ) : historyList.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6">No recorded movements for this product.</p>
            ) : (
              <div className="max-h-80 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-800 text-xs">
                {historyList.map((tx) => (
                  <div key={tx.id} className="py-2.5 flex items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-gray-800 dark:text-gray-200">
                          {MOVEMENT_LABELS[tx.type]}
                        </span>
                        <span className="text-gray-400">{formatDateTime(tx.createdAt)}</span>
                      </div>
                      {(tx.reason || tx.note) && (
                        <p className="text-gray-500 mt-0.5">
                          {tx.reason ? `Reason: ${tx.reason}` : ''}
                          {tx.reason && tx.note ? ' • ' : ''}
                          {tx.note ? `Note: ${tx.note}` : ''}
                        </p>
                      )}
                    </div>

                    <div className="text-right flex-shrink-0">
                      <span
                        className={`font-bold text-sm ${
                          tx.quantityChange > 0
                            ? 'text-emerald-600'
                            : tx.quantityChange < 0
                            ? 'text-red-500'
                            : 'text-gray-500'
                        }`}
                      >
                        {tx.quantityChange > 0 ? `+${tx.quantityChange}` : tx.quantityChange}
                      </span>
                      <p className="text-[10px] text-gray-400">
                        {tx.previousQuantity} → {tx.resultingQuantity}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-end pt-2 border-t">
              <Button variant="ghost" size="sm" onClick={() => setHistoryProduct(null)}>
                Close
              </Button>
            </div>
          </div>
        </Dialog>
      )}
    </div>
  );
};
export default StockManagement;
