import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Package,
  Plus,
  Upload,
  Download,
  Search,
  Filter,
  Edit2,
  Copy,
  Archive,
  RefreshCw,
  Trash2,
  ArrowLeftRight,
  MoreVertical,
  Check,
  AlertTriangle,
  Image as ImageIcon,
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input, Textarea } from '../components/ui/Input';
import { StockBadge } from '../components/ui/Badge';
import { Dialog, ConfirmDialog } from '../components/ui/Dialog';
import { EmptyState, Spinner } from '../components/ui/Spinner';
import { useToast } from '../components/ui/Toast';
import { useSettingsStore } from '../store/settingsStore';
import {
  getAllProducts,
  getProductsWithStatus,
  createProduct,
  updateProduct,
  deleteProduct,
  archiveProduct,
  restoreProduct,
  duplicateProduct,
  getAllCategories,
  attachPhotoToProduct,
} from '../services/productService';
import { exportProductsCsv, downloadBlob } from '../services/backupService';
import { parseCsv } from '../utils/csv';
import { formatCurrency, formatDate } from '../utils/format';
import { db } from '../db/db';
import type { Product, Category, ProductWithStatus, ProductStatus } from '../types/product';
import type { Photo } from '../types/photo';
import StockMovementForm from '../components/stock/StockMovementForm';

export const Products: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState<ProductWithStatus[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'archived'>('active');
  const [stockFilter, setStockFilter] = useState<'all' | 'in_stock' | 'low_stock' | 'out_of_stock'>('all');
  const [sortBy, setSortBy] = useState<'name' | 'quantity' | 'price' | 'updatedAt'>('updatedAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Modals
  const [showProductForm, setShowProductForm] = useState(searchParams.get('new') === '1');
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [movementProductId, setMovementProductId] = useState<string | null>(null);
  const [deletingProduct, setDeletingProduct] = useState<Product | null>(null);
  const [showCsvImport, setShowCsvImport] = useState(false);

  // Attach photo modal
  const [attachingPhotoProductId, setAttachingPhotoProductId] = useState<string | null>(null);

  const { settings } = useSettingsStore();
  const toast = useToast();

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [prods, cats] = await Promise.all([
        getProductsWithStatus(),
        getAllCategories(),
      ]);
      setProducts(prods);
      setCategories(cats);
    } catch (err) {
      console.error('Failed to load products:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Open modal if URL has ?new=1
  useEffect(() => {
    if (searchParams.get('new') === '1') {
      setShowProductForm(true);
      setEditingProduct(null);
    }
  }, [searchParams]);

  const handleExportCsv = async () => {
    try {
      const blob = await exportProductsCsv();
      downloadBlob(blob, `smartvault-products-${new Date().toISOString().slice(0, 10)}.csv`);
      toast.success('Product CSV exported.');
    } catch {
      toast.error('Failed to export CSV');
    }
  };

  const handleDuplicate = async (p: Product) => {
    try {
      const copy = await duplicateProduct(p.id);
      toast.success(`Duplicated as "${copy.name}"`);
      loadData();
    } catch (err: unknown) {
      toast.error('Failed to duplicate product');
    }
  };

  const handleArchiveToggle = async (p: Product) => {
    try {
      if (p.status === 'active') {
        await archiveProduct(p.id);
        toast.success(`Archived ${p.name}`);
      } else {
        await restoreProduct(p.id);
        toast.success(`Restored ${p.name}`);
      }
      loadData();
    } catch {
      toast.error('Failed to update status');
    }
  };

  const handleDelete = async () => {
    if (!deletingProduct) return;
    try {
      await deleteProduct(deletingProduct.id);
      toast.success('Product deleted.');
      setDeletingProduct(null);
      loadData();
    } catch {
      toast.error('Failed to delete product');
    }
  };

  // Filtered & Sorted products
  const categoryMap = new Map(categories.map((c) => [c.id, c.name]));

  const filteredProducts = products.filter((p) => {
    if (statusFilter !== 'all' && p.status !== statusFilter) return false;
    if (selectedCategory && p.categoryId !== selectedCategory) return false;
    if (stockFilter !== 'all' && p.stockStatus !== stockFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = p.name.toLowerCase().includes(q);
      const matchSku = p.sku?.toLowerCase().includes(q) ?? false;
      const matchBrand = p.brand?.toLowerCase().includes(q) ?? false;
      const matchDesc = p.description.toLowerCase().includes(q);
      if (!matchName && !matchSku && !matchBrand && !matchDesc) return false;
    }
    return true;
  }).sort((a, b) => {
    let diff = 0;
    if (sortBy === 'name') diff = a.name.localeCompare(b.name);
    else if (sortBy === 'quantity') diff = a.quantity - b.quantity;
    else if (sortBy === 'price') diff = (a.sellingPrice || 0) - (b.sellingPrice || 0);
    else diff = new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
    return sortOrder === 'asc' ? diff : -diff;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Products Catalog</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
              {filteredProducts.length} items
            </span>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Manage your items, pricing, inventory thresholds, and SKU barcodes.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            icon={<Upload className="w-4 h-4" />}
            onClick={() => setShowCsvImport(true)}
          >
            Import CSV
          </Button>
          <Button
            variant="outline"
            size="sm"
            icon={<Download className="w-4 h-4" />}
            onClick={handleExportCsv}
          >
            Export CSV
          </Button>
          <Button
            variant="primary"
            size="sm"
            icon={<Plus className="w-4 h-4" />}
            onClick={() => {
              setEditingProduct(null);
              setShowProductForm(true);
            }}
          >
            Add Product
          </Button>
        </div>
      </div>

      {/* Search and Filters toolbar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 p-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm">
        {/* Search Input */}
        <div className="lg:col-span-2 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search name, SKU, brand..."
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        {/* Category filter */}
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-1.5 text-xs text-gray-700 dark:text-gray-200 outline-none focus:ring-2 focus:ring-emerald-500"
        >
          <option value="">All Categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>

        {/* Stock Status filter */}
        <select
          value={stockFilter}
          onChange={(e) => setStockFilter(e.target.value as any)}
          className="rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-1.5 text-xs text-gray-700 dark:text-gray-200 outline-none focus:ring-2 focus:ring-emerald-500"
        >
          <option value="all">All Stock Statuses</option>
          <option value="in_stock">In Stock</option>
          <option value="low_stock">Low Stock</option>
          <option value="out_of_stock">Out of Stock</option>
        </select>

        {/* Sort */}
        <select
          value={`${sortBy}_${sortOrder}`}
          onChange={(e) => {
            const [b, o] = e.target.value.split('_');
            setSortBy(b as any);
            setSortOrder(o as any);
          }}
          className="rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-1.5 text-xs text-gray-700 dark:text-gray-200 outline-none focus:ring-2 focus:ring-emerald-500"
        >
          <option value="updatedAt_desc">Recently Updated</option>
          <option value="name_asc">Name (A-Z)</option>
          <option value="quantity_asc">Quantity (Lowest)</option>
          <option value="quantity_desc">Quantity (Highest)</option>
          <option value="price_desc">Price (Highest)</option>
        </select>
      </div>

      {/* Product Cards Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-64 bg-gray-200 dark:bg-gray-800 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : filteredProducts.length === 0 ? (
        <EmptyState
          icon={<Package className="w-12 h-12" />}
          title="No products found"
          description={
            searchQuery || selectedCategory || stockFilter !== 'all'
              ? 'Try adjusting your search criteria.'
              : 'Start building your inventory catalog by adding your first product.'
          }
          action={
            <Button
              variant="primary"
              size="sm"
              icon={<Plus className="w-4 h-4" />}
              onClick={() => {
                setEditingProduct(null);
                setShowProductForm(true);
              }}
            >
              Add First Product
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredProducts.map((product) => (
            <div
              key={product.id}
              className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between"
            >
              <div>
                {/* Photo Header or Placeholder */}
                <div className="relative aspect-video bg-gray-100 dark:bg-gray-800 border-b border-gray-100 dark:border-gray-800 flex items-center justify-center">
                  <ProductPrimaryPhoto
                    photoId={product.primaryPhotoId}
                    onAttachClick={() => setAttachingPhotoProductId(product.id)}
                  />
                  <div className="absolute top-2 left-2">
                    <StockBadge status={product.stockStatus} />
                  </div>
                  {product.sku && (
                    <div className="absolute top-2 right-2">
                      <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-black/60 text-white backdrop-blur-sm">
                        {product.sku}
                      </span>
                    </div>
                  )}
                </div>

                {/* Details */}
                <div className="p-4 space-y-2">
                  <div>
                    <h3 className="font-bold text-gray-900 dark:text-white text-base line-clamp-1">
                      {product.name}
                    </h3>
                    <p className="text-xs text-gray-400">
                      {product.categoryId ? categoryMap.get(product.categoryId) || 'Uncategorized' : 'No Category'}
                      {product.brand ? ` • ${product.brand}` : ''}
                    </p>
                  </div>

                  {product.description && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
                      {product.description}
                    </p>
                  )}

                  {/* Stock & Price info */}
                  <div className="pt-2 flex items-center justify-between text-sm">
                    <div>
                      <span className="text-xs text-gray-400 block">Stock Level</span>
                      <span className="font-bold text-gray-800 dark:text-gray-200">
                        {product.quantity} <span className="text-xs font-normal text-gray-500">{product.unit}</span>
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="text-xs text-gray-400 block">Price</span>
                      <span className="font-bold text-emerald-600">
                        {formatCurrency(product.sellingPrice, settings.currency, settings.currencySymbol)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Toolbar */}
              <div className="p-3 bg-gray-50 dark:bg-gray-800/60 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between">
                <Button
                  variant="outline"
                  size="xs"
                  icon={<ArrowLeftRight className="w-3.5 h-3.5 text-teal-600" />}
                  onClick={() => setMovementProductId(product.id)}
                >
                  Movement
                </Button>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => {
                      setEditingProduct(product);
                      setShowProductForm(true);
                    }}
                    title="Edit"
                    className="p-1.5 rounded-lg text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDuplicate(product)}
                    title="Duplicate"
                    className="p-1.5 rounded-lg text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleArchiveToggle(product)}
                    title={product.status === 'active' ? 'Archive' : 'Restore'}
                    className="p-1.5 rounded-lg text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                  >
                    <Archive className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setDeletingProduct(product)}
                    title="Delete"
                    className="p-1.5 rounded-lg text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Product Form Modal */}
      {showProductForm && (
        <ProductFormDialog
          product={editingProduct}
          categories={categories}
          onClose={() => {
            setShowProductForm(false);
            setEditingProduct(null);
            const p = new URLSearchParams(searchParams);
            p.delete('new');
            setSearchParams(p, { replace: true });
          }}
          onSave={() => {
            setShowProductForm(false);
            setEditingProduct(null);
            loadData();
          }}
        />
      )}

      {/* Stock Movement Modal */}
      {movementProductId && (
        <StockMovementForm
          productId={movementProductId}
          onClose={() => setMovementProductId(null)}
          onSuccess={loadData}
        />
      )}

      {/* CSV Import Modal */}
      {showCsvImport && (
        <ProductCsvImportDialog
          onClose={() => setShowCsvImport(false)}
          onSuccess={() => {
            setShowCsvImport(false);
            loadData();
          }}
        />
      )}

      {/* Attach Photo Modal */}
      {attachingPhotoProductId && (
        <AttachPhotoDialog
          productId={attachingPhotoProductId}
          onClose={() => setAttachingPhotoProductId(null)}
          onSuccess={() => {
            setAttachingPhotoProductId(null);
            loadData();
          }}
        />
      )}

      {/* Confirm Delete */}
      <ConfirmDialog
        open={!!deletingProduct}
        onClose={() => setDeletingProduct(null)}
        onConfirm={handleDelete}
        title="Delete Product"
        message={`Are you sure you want to delete "${deletingProduct?.name}"? Stock history will be preserved.`}
        confirmLabel="Delete Product"
      />
    </div>
  );
};

// Component to load thumbnail for a product primary photo
const ProductPrimaryPhoto: React.FC<{
  photoId: string | null;
  onAttachClick: () => void;
}> = ({ photoId, onAttachClick }) => {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    if (photoId) {
      db.thumbnails.get(photoId).then((rec) => {
        if (active && rec?.blob) setSrc(URL.createObjectURL(rec.blob));
      });
    } else {
      setSrc(null);
    }
    return () => {
      active = false;
      if (src) URL.revokeObjectURL(src);
    };
  }, [photoId]);

  if (src) {
    return (
      <img
        src={src}
        alt="Product"
        className="w-full h-full object-cover cursor-pointer"
        onClick={onAttachClick}
      />
    );
  }

  return (
    <button
      type="button"
      onClick={onAttachClick}
      className="flex flex-col items-center justify-center text-gray-400 hover:text-emerald-600 transition-colors"
    >
      <ImageIcon className="w-8 h-8 mb-1" />
      <span className="text-[11px] font-medium">+ Attach Photo</span>
    </button>
  );
};

// Product Create / Edit Dialog
const ProductFormDialog: React.FC<{
  product: Product | null;
  categories: Category[];
  onClose: () => void;
  onSave: () => void;
}> = ({ product, categories, onClose, onSave }) => {
  const [name, setName] = useState(product?.name || '');
  const [sku, setSku] = useState(product?.sku || '');
  const [barcode, setBarcode] = useState(product?.barcode || '');
  const [description, setDescription] = useState(product?.description || '');
  const [categoryId, setCategoryId] = useState(product?.categoryId || '');
  const [brand, setBrand] = useState(product?.brand || '');
  const [supplier, setSupplier] = useState(product?.supplier || '');
  const [costPrice, setCostPrice] = useState(product?.costPrice !== null && product?.costPrice !== undefined ? String(product.costPrice) : '');
  const [sellingPrice, setSellingPrice] = useState(product?.sellingPrice !== null && product?.sellingPrice !== undefined ? String(product.sellingPrice) : '');
  const [quantity, setQuantity] = useState(product ? String(product.quantity) : '0');
  const [minStockThreshold, setMinStockThreshold] = useState(product ? String(product.minStockThreshold) : '5');
  const [unit, setUnit] = useState(product?.unit || 'pcs');
  const [location, setLocation] = useState(product?.location || '');
  const [tags, setTags] = useState(product?.tags.join(', ') || '');
  const [status, setStatus] = useState<ProductStatus>(product?.status || 'active');
  const [loading, setLoading] = useState(false);

  const toast = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    try {
      const tagsArray = tags.split(',').map((t) => t.trim()).filter(Boolean);
      const parsedCost = costPrice ? parseFloat(costPrice) : null;
      const parsedSelling = sellingPrice ? parseFloat(sellingPrice) : null;
      const parsedQty = parseFloat(quantity) || 0;
      const parsedMin = parseFloat(minStockThreshold) || 0;

      if (product) {
        await updateProduct(product.id, {
          name: name.trim(),
          sku: sku.trim() || null,
          barcode: barcode.trim() || null,
          description: description.trim(),
          categoryId: categoryId || null,
          brand: brand.trim() || null,
          supplier: supplier.trim() || null,
          costPrice: parsedCost,
          sellingPrice: parsedSelling,
          quantity: parsedQty,
          minStockThreshold: parsedMin,
          unit: unit.trim() || 'pcs',
          location: location.trim() || null,
          tags: tagsArray,
          status,
        });
        toast.success('Product updated.');
      } else {
        await createProduct({
          name: name.trim(),
          sku: sku.trim() || null,
          barcode: barcode.trim() || null,
          description: description.trim(),
          categoryId: categoryId || null,
          brand: brand.trim() || null,
          supplier: supplier.trim() || null,
          costPrice: parsedCost,
          sellingPrice: parsedSelling,
          quantity: parsedQty,
          minStockThreshold: parsedMin,
          unit: unit.trim() || 'pcs',
          location: location.trim() || null,
          tags: tagsArray,
          status,
          primaryPhotoId: null,
          photoIds: [],
          notes: '',
        });
        toast.success('Product created.');
      }

      onSave();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Save failed';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={true} onClose={onClose} title={product ? 'Edit Product' : 'Add New Product'} size="lg">
      <form onSubmit={handleSubmit} className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="sm:col-span-2">
            <Input
              label="Product Name *"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <Input
            label="SKU (Stock Keeping Unit)"
            placeholder="e.g. ELEC-001"
            value={sku}
            onChange={(e) => setSku(e.target.value)}
          />

          <Input
            label="Barcode / UPC"
            placeholder="e.g. 890123456789"
            value={barcode}
            onChange={(e) => setBarcode(e.target.value)}
          />

          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1">
              Category
            </label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="">None (Uncategorized)</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <Input
            label="Brand / Manufacturer"
            placeholder="e.g. Sony"
            value={brand}
            onChange={(e) => setBrand(e.target.value)}
          />

          <Input
            label="Cost Price"
            type="number"
            step="0.01"
            placeholder="0.00"
            value={costPrice}
            onChange={(e) => setCostPrice(e.target.value)}
          />

          <Input
            label="Selling Price"
            type="number"
            step="0.01"
            placeholder="0.00"
            value={sellingPrice}
            onChange={(e) => setSellingPrice(e.target.value)}
          />

          <Input
            label={product ? 'Current Quantity' : 'Initial Quantity'}
            type="number"
            step="any"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
          />

          <Input
            label="Min Stock Threshold (Alerts)"
            type="number"
            step="any"
            value={minStockThreshold}
            onChange={(e) => setMinStockThreshold(e.target.value)}
          />

          <Input
            label="Unit of Measurement"
            placeholder="pcs, box, kg, etc."
            value={unit}
            onChange={(e) => setUnit(e.target.value)}
          />

          <Input
            label="Storage Location / Shelf"
            placeholder="e.g. Aisle 3, Shelf B"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
          />
        </div>

        <Textarea
          label="Description"
          placeholder="Product details, specs, package contents..."
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />

        <Input
          label="Tags (comma-separated)"
          placeholder="gadget, electronic, portable"
          value={tags}
          onChange={(e) => setTags(e.target.value)}
        />

        <div className="flex justify-end gap-2 pt-3 border-t border-gray-100 dark:border-gray-800">
          <Button type="button" variant="ghost" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" loading={loading}>
            {product ? 'Save Changes' : 'Create Product'}
          </Button>
        </div>
      </form>
    </Dialog>
  );
};

// Attach Photo Dialog
const AttachPhotoDialog: React.FC<{
  productId: string;
  onClose: () => void;
  onSuccess: () => void;
}> = ({ productId, onClose, onSuccess }) => {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  useEffect(() => {
    db.photos.where('isDeleted').equals(0).reverse().sortBy('createdAt').then((res) => {
      setPhotos(res);
      setLoading(false);
    });
  }, []);

  const handleSelect = async (photoId: string) => {
    try {
      await attachPhotoToProduct(productId, photoId, true);
      toast.success('Attached primary photo');
      onSuccess();
    } catch {
      toast.error('Failed to attach photo');
    }
  };

  return (
    <Dialog open={true} onClose={onClose} title="Attach Photo to Product" size="md">
      <div className="space-y-3">
        <p className="text-xs text-gray-500">
          Select an image from your library to set as the primary product photo:
        </p>

        {loading ? (
          <div className="py-8 text-center"><Spinner size="md" /></div>
        ) : photos.length === 0 ? (
          <p className="text-sm text-gray-400 py-6 text-center">No photos available.</p>
        ) : (
          <div className="grid grid-cols-3 gap-2 max-h-72 overflow-y-auto pr-1">
            {photos.map((p) => (
              <button
                key={p.id}
                onClick={() => handleSelect(p.id)}
                className="aspect-square rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800 border hover:border-emerald-500 transition-colors"
              >
                <ProductPrimaryPhoto photoId={p.id} onAttachClick={() => handleSelect(p.id)} />
              </button>
            ))}
          </div>
        )}

        <div className="flex justify-end pt-2">
          <Button variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </div>
    </Dialog>
  );
};

// CSV Import Dialog
const ProductCsvImportDialog: React.FC<{
  onClose: () => void;
  onSuccess: () => void;
}> = ({ onClose, onSuccess }) => {
  const [file, setFile] = useState<File | null>(null);
  const [parsedRows, setParsedRows] = useState<any[]>([]);
  const [conflicts, setConflicts] = useState<{ row: any; existing: Product }[]>([]);
  const [loading, setLoading] = useState(false);
  const toast = useToast();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    try {
      const rows = await parseCsv(f);
      setParsedRows(rows);

      // Detect SKU conflicts
      const existing = await getAllProducts(true);
      const skuMap = new Map(existing.filter((p) => p.sku).map((p) => [p.sku!.toLowerCase(), p]));

      const conflictList: { row: any; existing: Product }[] = [];
      rows.forEach((r) => {
        if (r.sku && skuMap.has(r.sku.toLowerCase())) {
          conflictList.push({ row: r, existing: skuMap.get(r.sku.toLowerCase())! });
        }
      });
      setConflicts(conflictList);
    } catch (err: unknown) {
      toast.error('Failed to parse CSV file');
    }
  };

  const handleImport = async () => {
    if (parsedRows.length === 0) return;
    setLoading(true);
    let count = 0;

    for (const r of parsedRows) {
      try {
        await createProduct({
          name: r.name || 'Unnamed Product',
          sku: r.sku || null,
          barcode: r.barcode || null,
          description: r.description || '',
          brand: r.brand || null,
          supplier: r.supplier || null,
          costPrice: r.cost_price ? parseFloat(r.cost_price) : null,
          sellingPrice: r.selling_price ? parseFloat(r.selling_price) : null,
          quantity: r.quantity ? parseFloat(r.quantity) : 0,
          minStockThreshold: r.min_stock_threshold ? parseFloat(r.min_stock_threshold) : 5,
          unit: r.unit || 'pcs',
          location: r.location || null,
          tags: r.tags ? r.tags.split(',').map((t: string) => t.trim()) : [],
          status: 'active',
          categoryId: null,
          primaryPhotoId: null,
          photoIds: [],
          notes: '',
        });
        count++;
      } catch {
        // Skip duplicate SKU conflicts if encountered
      }
    }

    setLoading(false);
    toast.success(`Imported ${count} products.`);
    onSuccess();
  };

  return (
    <Dialog open={true} onClose={onClose} title="Import Products from CSV" size="lg">
      <div className="space-y-4">
        {!file ? (
          <div className="p-8 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-xl text-center">
            <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Select a CSV file with columns: name, sku, barcode, selling_price, quantity, unit...
            </p>
            <input
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="mt-4 text-xs"
            />
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-xs text-gray-500">
              Found {parsedRows.length} rows in <span className="font-semibold">{file.name}</span>
            </p>

            {conflicts.length > 0 && (
              <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg text-xs text-amber-800 dark:text-amber-300">
                <AlertTriangle className="w-4 h-4 inline mr-1 text-amber-600" />
                {conflicts.length} SKU conflicts detected with existing products. Conflicting rows will be skipped safely.
              </div>
            )}

            {/* Preview table */}
            <div className="max-h-48 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-50 dark:bg-gray-800 border-b">
                  <tr>
                    <th className="p-2">Name</th>
                    <th className="p-2">SKU</th>
                    <th className="p-2">Price</th>
                    <th className="p-2">Qty</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {parsedRows.slice(0, 5).map((r, i) => (
                    <tr key={i}>
                      <td className="p-2 font-medium">{r.name}</td>
                      <td className="p-2 font-mono">{r.sku || '—'}</td>
                      <td className="p-2">{r.selling_price || '—'}</td>
                      <td className="p-2">{r.quantity || '0'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button variant="ghost" size="sm" onClick={() => setFile(null)}>
                Choose Another
              </Button>
              <Button
                variant="primary"
                size="sm"
                loading={loading}
                onClick={handleImport}
              >
                Proceed Import ({parsedRows.length})
              </Button>
            </div>
          </div>
        )}
      </div>
    </Dialog>
  );
};

export default Products;
