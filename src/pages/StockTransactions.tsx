import React, { useState, useEffect, useCallback } from 'react';
import {
  ArrowLeftRight,
  Download,
  Filter,
  Calendar,
  Search,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';
import { getRecentTransactions } from '../services/stockService';
import { getAllProducts } from '../services/productService';
import { exportTransactionsCsv, downloadBlob } from '../services/backupService';
import { Button } from '../components/ui/Button';
import { EmptyState, Spinner } from '../components/ui/Spinner';
import { useToast } from '../components/ui/Toast';
import { formatDateTime } from '../utils/format';
import type { StockTransaction, MovementType } from '../types/stock';
import type { Product } from '../types/product';
import { MOVEMENT_LABELS } from '../types/stock';

export const StockTransactions: React.FC = () => {
  const [transactions, setTransactions] = useState<StockTransaction[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedProduct, setSelectedProduct] = useState<string>('');
  const [selectedType, setSelectedType] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');

  const toast = useToast();

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [txs, prods] = await Promise.all([
        getRecentTransactions(200),
        getAllProducts(true),
      ]);
      setTransactions(txs);
      setProducts(prods);
    } catch (err) {
      console.error('Failed to load transactions:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const productMap = new Map(products.map((p) => [p.id, p]));

  const handleExportCsv = async () => {
    try {
      const blob = await exportTransactionsCsv();
      downloadBlob(blob, `smartvault-transactions-${new Date().toISOString().slice(0, 10)}.csv`);
      toast.success('Transactions exported.');
    } catch {
      toast.error('Failed to export CSV');
    }
  };

  const filtered = transactions.filter((tx) => {
    if (selectedProduct && tx.productId !== selectedProduct) return false;
    if (selectedType && tx.type !== selectedType) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const p = productMap.get(tx.productId);
      const matchName = p?.name.toLowerCase().includes(q) ?? false;
      const matchReason = tx.reason?.toLowerCase().includes(q) ?? false;
      const matchNote = tx.note?.toLowerCase().includes(q) ?? false;
      if (!matchName && !matchReason && !matchNote) return false;
    }
    return true;
  });

  // Calculate period metrics
  const totalIn = filtered
    .filter((tx) => tx.quantityChange > 0)
    .reduce((sum, tx) => sum + tx.quantityChange, 0);

  const totalOut = filtered
    .filter((tx) => tx.quantityChange < 0)
    .reduce((sum, tx) => sum + Math.abs(tx.quantityChange), 0);

  const netChange = totalIn - totalOut;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            Stock Transactions
            <ArrowLeftRight className="w-6 h-6 text-emerald-600" />
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Audit trail of all inventory inputs, outputs, sales, returns, and manual adjustments.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          icon={<Download className="w-4 h-4" />}
          onClick={handleExportCsv}
        >
          Export CSV
        </Button>
      </div>

      {/* Summary KPI Cards for visible items */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm">
          <span className="text-xs text-gray-400 font-medium">Total Stock In</span>
          <p className="text-xl font-bold text-emerald-600 mt-1 flex items-center gap-1">
            <ArrowUp className="w-5 h-5" /> +{totalIn}
          </p>
        </div>
        <div className="p-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm">
          <span className="text-xs text-gray-400 font-medium">Total Stock Out</span>
          <p className="text-xl font-bold text-red-500 mt-1 flex items-center gap-1">
            <ArrowDown className="w-5 h-5" /> -{totalOut}
          </p>
        </div>
        <div className="p-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm">
          <span className="text-xs text-gray-400 font-medium">Net Quantity Change</span>
          <p
            className={`text-xl font-bold mt-1 ${
              netChange >= 0 ? 'text-emerald-600' : 'text-red-500'
            }`}
          >
            {netChange >= 0 ? `+${netChange}` : netChange}
          </p>
        </div>
      </div>

      {/* Filter toolbar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search reason, note, product..."
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <select
          value={selectedProduct}
          onChange={(e) => setSelectedProduct(e.target.value)}
          className="rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-1.5 text-xs text-gray-700 dark:text-gray-200 outline-none focus:ring-2 focus:ring-emerald-500"
        >
          <option value="">All Products</option>
          {products.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>

        <select
          value={selectedType}
          onChange={(e) => setSelectedType(e.target.value)}
          className="rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-1.5 text-xs text-gray-700 dark:text-gray-200 outline-none focus:ring-2 focus:ring-emerald-500"
        >
          <option value="">All Movement Types</option>
          {Object.entries(MOVEMENT_LABELS).map(([key, label]) => (
            <option key={key} value={key}>
              {label as string}
            </option>
          ))}
        </select>
      </div>

      {/* Transactions Table */}
      {loading ? (
        <div className="p-12 text-center"><Spinner size="lg" /></div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<ArrowLeftRight className="w-12 h-12" />}
          title="No stock transactions recorded"
          description="Stock movements like sales, receiving, or adjustments will be logged here."
        />
      ) : (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden shadow-sm">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-50 dark:bg-gray-800/60 text-gray-500 font-semibold uppercase tracking-wider border-b border-gray-200 dark:border-gray-800">
              <tr>
                <th className="p-3">Date & Time</th>
                <th className="p-3">Product</th>
                <th className="p-3">Movement Type</th>
                <th className="p-3">Change</th>
                <th className="p-3">Balance</th>
                <th className="p-3 hidden sm:table-cell">Reason / Reference</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {filtered.map((tx) => {
                const product = productMap.get(tx.productId);
                return (
                  <tr key={tx.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/40">
                    <td className="p-3 text-gray-400 font-mono">
                      {formatDateTime(tx.createdAt)}
                    </td>
                    <td className="p-3 font-semibold text-gray-800 dark:text-gray-200">
                      {product ? product.name : 'Unknown Product'}
                      {product?.sku && (
                        <span className="font-mono text-gray-400 ml-1.5 font-normal">
                          ({product.sku})
                        </span>
                      )}
                    </td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded-full font-medium bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
                        {MOVEMENT_LABELS[tx.type]}
                      </span>
                    </td>
                    <td className="p-3">
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
                    </td>
                    <td className="p-3 text-gray-600 dark:text-gray-400 font-medium">
                      {tx.previousQuantity} → {tx.resultingQuantity}
                    </td>
                    <td className="p-3 text-gray-500 hidden sm:table-cell max-w-xs truncate">
                      {tx.reason || tx.note || '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
export default StockTransactions;
