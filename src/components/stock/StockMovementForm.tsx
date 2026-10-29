import React, { useState, useEffect } from 'react';
import { Dialog } from '../ui/Dialog';
import { Button } from '../ui/Button';
import { Input, Textarea } from '../ui/Input';
import { getAllProducts, getProduct } from '../../services/productService';
import { recordMovement } from '../../services/stockService';
import { useSettingsStore } from '../../store/settingsStore';
import { useToast } from '../ui/Toast';
import type { Product } from '../../types/product';
import type { MovementType } from '../../types/stock';
import { MOVEMENT_LABELS } from '../../types/stock';
import { ArrowDown, ArrowUp, RefreshCw, AlertTriangle, Package } from 'lucide-react';

interface StockMovementFormProps {
  onClose: () => void;
  productId?: string;
  onSuccess?: () => void;
}

const MOVEMENT_TYPES: { type: MovementType; label: string; icon: React.ReactNode; defaultDirection: 'in' | 'out' | 'set' }[] = [
  { type: 'received', label: 'Stock Received (In)', icon: <ArrowUp className="w-4 h-4 text-emerald-500" />, defaultDirection: 'in' },
  { type: 'sale', label: 'Sale / Issued (Out)', icon: <ArrowDown className="w-4 h-4 text-orange-500" />, defaultDirection: 'out' },
  { type: 'return', label: 'Customer Return (In)', icon: <ArrowUp className="w-4 h-4 text-teal-500" />, defaultDirection: 'in' },
  { type: 'damaged', label: 'Damaged / Lost (Out)', icon: <AlertTriangle className="w-4 h-4 text-red-500" />, defaultDirection: 'out' },
  { type: 'adjustment', label: 'Stock Adjustment (In/Out)', icon: <RefreshCw className="w-4 h-4 text-blue-500" />, defaultDirection: 'in' },
  { type: 'correction', label: 'Manual Correction (Set)', icon: <RefreshCw className="w-4 h-4 text-purple-500" />, defaultDirection: 'set' },
  { type: 'opening', label: 'Opening Stock', icon: <Package className="w-4 h-4 text-blue-500" />, defaultDirection: 'set' },
];

export const StockMovementForm: React.FC<StockMovementFormProps> = ({
  onClose,
  productId: initialProductId,
  onSuccess,
}) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<string>(initialProductId || '');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [movementType, setMovementType] = useState<MovementType>('received');
  const [quantity, setQuantity] = useState<string>('1');
  const [reason, setReason] = useState<string>('');
  const [note, setNote] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const { settings } = useSettingsStore();
  const toast = useToast();

  useEffect(() => {
    getAllProducts(false).then((prods) => {
      setProducts(prods);
      if (!selectedProductId && prods.length > 0) {
        setSelectedProductId(prods[0].id);
      }
    });
  }, [selectedProductId]);

  useEffect(() => {
    if (selectedProductId) {
      getProduct(selectedProductId).then((p) => setSelectedProduct(p || null));
    } else {
      setSelectedProduct(null);
    }
  }, [selectedProductId]);

  // Compute resulting quantity preview
  const currentQty = selectedProduct ? selectedProduct.quantity : 0;
  const inputNum = parseFloat(quantity) || 0;

  let quantityChange = 0;
  let resultingQty = currentQty;

  const currentTypeConfig = MOVEMENT_TYPES.find((m) => m.type === movementType);

  if (currentTypeConfig?.defaultDirection === 'in') {
    quantityChange = Math.abs(inputNum);
    resultingQty = currentQty + quantityChange;
  } else if (currentTypeConfig?.defaultDirection === 'out') {
    quantityChange = -Math.abs(inputNum);
    resultingQty = currentQty + quantityChange;
  } else if (currentTypeConfig?.defaultDirection === 'set') {
    resultingQty = inputNum;
    quantityChange = resultingQty - currentQty;
  }

  const isNegative = resultingQty < 0;
  const preventSubmit =
    !selectedProductId ||
    inputNum <= 0 ||
    (isNegative && settings.negativeStockPolicy === 'prevent');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductId || inputNum <= 0) return;

    if (isNegative && settings.negativeStockPolicy === 'prevent') {
      toast.error('Resulting stock cannot be negative under current policy.');
      return;
    }

    setLoading(true);
    try {
      await recordMovement(
        {
          productId: selectedProductId,
          type: movementType,
          quantityChange,
          reason: reason.trim() || undefined,
          note: note.trim() || undefined,
        },
        settings.negativeStockPolicy !== 'prevent'
      );

      toast.success(
        `Recorded ${MOVEMENT_LABELS[movementType]}: ${quantityChange > 0 ? '+' : ''}${quantityChange} ${selectedProduct?.unit || 'units'}`
      );
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to record movement';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={true} onClose={onClose} title="Record Stock Movement" size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Product Picker */}
        <div>
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1">
            Product
          </label>
          <select
            value={selectedProductId}
            onChange={(e) => setSelectedProductId(e.target.value)}
            disabled={!!initialProductId}
            className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 outline-none focus:ring-2 focus:ring-emerald-500"
          >
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} {p.sku ? `(${p.sku})` : ''} — Current: {p.quantity} {p.unit}
              </option>
            ))}
          </select>
        </div>

        {/* Movement Type */}
        <div>
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1">
            Movement Type
          </label>
          <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
            {MOVEMENT_TYPES.map((t) => (
              <button
                type="button"
                key={t.type}
                onClick={() => setMovementType(t.type)}
                className={`flex items-center gap-2 p-2 rounded-lg border text-left text-xs transition-colors ${
                  movementType === t.type
                    ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-900 dark:text-emerald-200 font-semibold'
                    : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'
                }`}
              >
                {t.icon}
                <span className="truncate">{t.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Quantity Field */}
        <div>
          <Input
            label={
              currentTypeConfig?.defaultDirection === 'set'
                ? `New Total Quantity (${selectedProduct?.unit || 'units'})`
                : `Quantity (${selectedProduct?.unit || 'units'})`
            }
            type="number"
            min="0.01"
            step="any"
            required
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
          />
        </div>

        {/* Quantity Result Preview Card */}
        {selectedProduct && (
          <div className="p-3 bg-gray-50 dark:bg-gray-800/80 rounded-xl border border-gray-200 dark:border-gray-700 flex items-center justify-between text-sm">
            <div>
              <span className="text-xs text-gray-400 block">Current Stock</span>
              <span className="font-bold text-gray-700 dark:text-gray-300">
                {currentQty} {selectedProduct.unit}
              </span>
            </div>
            <div className="text-gray-400">→</div>
            <div>
              <span className="text-xs text-gray-400 block">Change</span>
              <span
                className={`font-bold ${
                  quantityChange > 0
                    ? 'text-emerald-600'
                    : quantityChange < 0
                    ? 'text-red-500'
                    : 'text-gray-500'
                }`}
              >
                {quantityChange > 0 ? `+${quantityChange}` : quantityChange}
              </span>
            </div>
            <div className="text-gray-400">→</div>
            <div>
              <span className="text-xs text-gray-400 block">New Stock</span>
              <span
                className={`font-bold ${
                  isNegative ? 'text-red-600' : 'text-emerald-600'
                }`}
              >
                {resultingQty} {selectedProduct.unit}
              </span>
            </div>
          </div>
        )}

        {isNegative && (
          <p className="text-xs text-red-500">
            Warning: This movement results in negative stock ({resultingQty}).
            {settings.negativeStockPolicy === 'prevent'
              ? ' Blocked by inventory settings.'
              : ' Policy allows override.'}
          </p>
        )}

        {/* Reason & Notes */}
        <Input
          label="Reason / Reference (Optional)"
          placeholder="e.g. PO #1042 or Damaged in transit"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />

        <Textarea
          label="Internal Note (Optional)"
          placeholder="Additional movement details..."
          rows={2}
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />

        {/* Buttons */}
        <div className="flex justify-end gap-2 pt-2 border-t border-gray-100 dark:border-gray-800">
          <Button type="button" variant="ghost" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            loading={loading}
            disabled={preventSubmit}
          >
            Confirm Movement
          </Button>
        </div>
      </form>
    </Dialog>
  );
};
export default StockMovementForm;
