import React, { useState, useEffect, useCallback } from 'react';
import {
  FileBarChart,
  DollarSign,
  Package,
  ArrowUp,
  ArrowDown,
  Download,
  AlertCircle,
  PieChart,
} from 'lucide-react';
import {
  getAllProducts,
  getAllCategories,
  getTotalInventoryValue,
} from '../services/productService';
import { getRecentTransactions } from '../services/stockService';
import { exportProductsCsv, downloadBlob } from '../services/backupService';
import { useSettingsStore } from '../store/settingsStore';
import { Button } from '../components/ui/Button';
import { Spinner } from '../components/ui/Spinner';
import { formatCurrency } from '../utils/format';
import type { Product, Category } from '../types/product';
import type { StockTransaction } from '../types/stock';
import { MOVEMENT_LABELS } from '../types/stock';

export const Reports: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [transactions, setTransactions] = useState<StockTransaction[]>([]);
  const [totalValue, setTotalValue] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  const { settings } = useSettingsStore();

  const loadReportData = useCallback(async () => {
    setLoading(true);
    try {
      const [prods, cats, val, txs] = await Promise.all([
        getAllProducts(false),
        getAllCategories(),
        getTotalInventoryValue(),
        getRecentTransactions(100),
      ]);
      setProducts(prods);
      setCategories(cats);
      setTotalValue(val);
      setTransactions(txs);
    } catch (err) {
      console.error('Failed to load reports:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadReportData();
  }, [loadReportData]);

  // Aggregate category breakdown
  const categoryMap = new Map(categories.map((c) => [c.id, c.name]));
  const categoryValues = new Map<string, number>();

  let missingCostCount = 0;
  let totalPotentialRevenue = 0;

  products.forEach((p) => {
    const cost = p.costPrice || 0;
    const selling = p.sellingPrice || 0;
    const catName = p.categoryId ? categoryMap.get(p.categoryId) || 'Uncategorized' : 'Uncategorized';

    if (p.costPrice === null || p.costPrice === undefined) {
      missingCostCount++;
    }

    const val = cost * p.quantity;
    categoryValues.set(catName, (categoryValues.get(catName) || 0) + val);
    totalPotentialRevenue += selling * p.quantity;
  });

  // Recent 30 days movement metrics
  const now = Date.now();
  const thirtyDaysAgo = now - 30 * 86400000;
  const recentTxs = transactions.filter((t) => new Date(t.createdAt).getTime() >= thirtyDaysAgo);

  const receivedQty = recentTxs
    .filter((t) => t.type === 'received' || t.type === 'opening')
    .reduce((sum, t) => sum + Math.max(0, t.quantityChange), 0);

  const soldQty = recentTxs
    .filter((t) => t.type === 'sale')
    .reduce((sum, t) => sum + Math.abs(t.quantityChange), 0);

  const damagedQty = recentTxs
    .filter((t) => t.type === 'damaged')
    .reduce((sum, t) => sum + Math.abs(t.quantityChange), 0);

  const handleExport = async () => {
    const blob = await exportProductsCsv();
    downloadBlob(blob, `inventory-valuation-report-${new Date().toISOString().slice(0, 10)}.csv`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            Inventory & Valuation Reports
            <FileBarChart className="w-6 h-6 text-emerald-600" />
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Real-time financial valuation, category distributions, and 30-day stock velocity.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          icon={<Download className="w-4 h-4" />}
          onClick={handleExport}
        >
          Export Report CSV
        </Button>
      </div>

      {loading ? (
        <div className="p-16 text-center"><Spinner size="lg" /></div>
      ) : (
        <div className="space-y-6">
          {/* Top Valuation Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider block">
                Total Asset Cost
              </span>
              <p className="text-2xl font-bold text-emerald-600 mt-1">
                {formatCurrency(totalValue, settings.currency, settings.currencySymbol)}
              </p>
              <p className="text-xs text-gray-400 mt-1">Based on recorded purchase costs</p>
            </div>

            <div className="p-5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider block">
                Retail Selling Potential
              </span>
              <p className="text-2xl font-bold text-gray-800 dark:text-gray-100 mt-1">
                {formatCurrency(totalPotentialRevenue, settings.currency, settings.currencySymbol)}
              </p>
              <p className="text-xs text-gray-400 mt-1">If all current inventory is sold</p>
            </div>

            <div className="p-5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider block">
                Projected Gross Margin
              </span>
              <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-400 mt-1">
                {totalPotentialRevenue > 0
                  ? `${Math.round(((totalPotentialRevenue - totalValue) / totalPotentialRevenue) * 100)}%`
                  : '—'}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                Potential profit: {formatCurrency(Math.max(0, totalPotentialRevenue - totalValue), settings.currency, settings.currencySymbol)}
              </p>
            </div>

            <div className="p-5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider block">
                Missing Cost Data
              </span>
              <p
                className={`text-2xl font-bold mt-1 ${
                  missingCostCount > 0 ? 'text-amber-500' : 'text-emerald-600'
                }`}
              >
                {missingCostCount} {missingCostCount === 1 ? 'item' : 'items'}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                {missingCostCount > 0 ? 'Set cost price for accurate valuation' : 'All products have cost price'}
              </p>
            </div>
          </div>

          {/* Category Valuation Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="p-5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm space-y-4">
              <h3 className="font-bold text-base text-gray-800 dark:text-gray-200 flex items-center gap-2">
                <PieChart className="w-4 h-4 text-emerald-600" />
                Valuation by Category
              </h3>

              <div className="space-y-3">
                {Array.from(categoryValues.entries()).map(([cat, val]) => {
                  const pct = totalValue > 0 ? Math.round((val / totalValue) * 100) : 0;
                  return (
                    <div key={cat} className="space-y-1">
                      <div className="flex justify-between text-xs font-medium">
                        <span className="text-gray-700 dark:text-gray-300">{cat}</span>
                        <span className="text-gray-500">
                          {formatCurrency(val, settings.currency, settings.currencySymbol)} ({pct}%)
                        </span>
                      </div>
                      <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-emerald-600 rounded-full"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 30-Day Activity Breakdown */}
            <div className="p-5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm space-y-4">
              <h3 className="font-bold text-base text-gray-800 dark:text-gray-200 flex items-center gap-2">
                <Package className="w-4 h-4 text-emerald-600" />
                30-Day Stock Velocity
              </h3>

              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 rounded-lg">
                  <span className="text-xs text-gray-400">Received</span>
                  <p className="text-lg font-bold text-emerald-600 mt-0.5">+{receivedQty}</p>
                </div>
                <div className="p-3 bg-orange-50 dark:bg-orange-950/30 rounded-lg">
                  <span className="text-xs text-gray-400">Sold / Out</span>
                  <p className="text-lg font-bold text-orange-600 mt-0.5">-{soldQty}</p>
                </div>
                <div className="p-3 bg-red-50 dark:bg-red-950/30 rounded-lg">
                  <span className="text-xs text-gray-400">Damaged / Lost</span>
                  <p className="text-lg font-bold text-red-600 mt-0.5">-{damagedQty}</p>
                </div>
              </div>

              <div className="text-xs text-gray-500 space-y-2 pt-2 border-t border-gray-100 dark:border-gray-800">
                <div className="flex justify-between">
                  <span>Total logged movements in last 30d</span>
                  <span className="font-semibold text-gray-800 dark:text-gray-200">{recentTxs.length}</span>
                </div>
                <div className="flex justify-between">
                  <span>Net inventory flow</span>
                  <span className="font-semibold text-emerald-600">
                    {receivedQty - soldQty - damagedQty >= 0 ? '+' : ''}{receivedQty - soldQty - damagedQty} units
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Itemized Valuation Table */}
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden shadow-sm">
            <div className="p-4 border-b border-gray-100 dark:border-gray-800">
              <h3 className="font-bold text-sm text-gray-800 dark:text-gray-200">
                Itemized Inventory Value Breakdown
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-50 dark:bg-gray-800/60 text-gray-500 font-semibold uppercase tracking-wider border-b">
                  <tr>
                    <th className="p-3">Product</th>
                    <th className="p-3">In Stock</th>
                    <th className="p-3">Unit Cost</th>
                    <th className="p-3">Unit Retail</th>
                    <th className="p-3">Total Cost Value</th>
                    <th className="p-3">Total Retail Value</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {products.map((p) => {
                    const costVal = (p.costPrice || 0) * p.quantity;
                    const retailVal = (p.sellingPrice || 0) * p.quantity;
                    return (
                      <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/40">
                        <td className="p-3 font-semibold text-gray-800 dark:text-gray-200">
                          {p.name}
                          {p.sku && <span className="font-mono text-gray-400 ml-1 font-normal">({p.sku})</span>}
                        </td>
                        <td className="p-3">
                          {p.quantity} {p.unit}
                        </td>
                        <td className="p-3 font-mono">
                          {formatCurrency(p.costPrice, settings.currency, settings.currencySymbol)}
                        </td>
                        <td className="p-3 font-mono">
                          {formatCurrency(p.sellingPrice, settings.currency, settings.currencySymbol)}
                        </td>
                        <td className="p-3 font-bold text-emerald-600 font-mono">
                          {formatCurrency(costVal, settings.currency, settings.currencySymbol)}
                        </td>
                        <td className="p-3 font-semibold text-gray-700 dark:text-gray-300 font-mono">
                          {formatCurrency(retailVal, settings.currency, settings.currencySymbol)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default Reports;
