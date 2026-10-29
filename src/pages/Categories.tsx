import React, { useState, useEffect, useCallback } from 'react';
import { Tag as TagIcon, Plus, Edit2, Trash2, Folder } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input, Textarea } from '../components/ui/Input';
import { Dialog, ConfirmDialog } from '../components/ui/Dialog';
import { EmptyState, Spinner } from '../components/ui/Spinner';
import { useToast } from '../components/ui/Toast';
import {
  getAllCategories,
  createCategory,
  updateCategory,
  deleteCategory,
} from '../services/productService';
import { db } from '../db/db';
import type { Category } from '../types/product';

const PRESET_COLORS = [
  '#059669', // Emerald
  '#2563eb', // Blue
  '#7c3aed', // Purple
  '#d97706', // Amber
  '#dc2626', // Red
  '#0d9488', // Teal
  '#db2777', // Pink
  '#4b5563', // Gray
];

export const Categories: React.FC = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [productCounts, setProductCounts] = useState<Map<string, number>>(new Map());
  const [photoCounts, setPhotoCounts] = useState<Map<string, number>>(new Map());
  const [loading, setLoading] = useState(true);

  // Modals
  const [showModal, setShowModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [deletingCategory, setDeletingCategory] = useState<Category | null>(null);

  // Form fields
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState(PRESET_COLORS[0]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const toast = useToast();

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const cats = await getAllCategories();
      setCategories(cats);

      // Compute item counts per category
      const products = await db.products.where('status').equals('active').toArray();
      const photos = await db.photos.where('isDeleted').equals(0).toArray();

      const prodMap = new Map<string, number>();
      const photoMap = new Map<string, number>();

      products.forEach((p) => {
        if (p.categoryId) prodMap.set(p.categoryId, (prodMap.get(p.categoryId) || 0) + 1);
      });

      photos.forEach((p) => {
        if (p.categoryId) photoMap.set(p.categoryId, (photoMap.get(p.categoryId) || 0) + 1);
      });

      setProductCounts(prodMap);
      setPhotoCounts(photoMap);
    } catch (err) {
      console.error('Failed to load categories:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleOpenCreate = () => {
    setEditingCategory(null);
    setName('');
    setDescription('');
    setColor(PRESET_COLORS[0]);
    setShowModal(true);
  };

  const handleOpenEdit = (c: Category) => {
    setEditingCategory(c);
    setName(c.name);
    setDescription(c.description || '');
    setColor(c.color || PRESET_COLORS[0]);
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSubmitting(true);
    try {
      if (editingCategory) {
        await updateCategory(editingCategory.id, {
          name: name.trim(),
          description: description.trim(),
          color,
        });
        toast.success('Category updated.');
      } else {
        await createCategory({
          name: name.trim(),
          description: description.trim(),
          color,
          parentId: null,
          icon: null,
        });
        toast.success('Category created.');
      }
      setShowModal(false);
      loadData();
    } catch {
      toast.error('Failed to save category');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingCategory) return;
    try {
      await deleteCategory(deletingCategory.id);
      toast.success('Category deleted.');
      setDeletingCategory(null);
      loadData();
    } catch {
      toast.error('Failed to delete category');
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            Categories
            <TagIcon className="w-5 h-5 text-emerald-600" />
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Organize products and photos into taxonomies for fast filtering.
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          icon={<Plus className="w-4 h-4" />}
          onClick={handleOpenCreate}
        >
          Add Category
        </Button>
      </div>

      {/* Categories Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-32 bg-gray-200 dark:bg-gray-800 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : categories.length === 0 ? (
        <EmptyState
          icon={<Folder className="w-12 h-12" />}
          title="No categories defined"
          description="Create categories like Electronics, Apparel, or Hardware to categorize your inventory."
          action={
            <Button variant="primary" size="sm" icon={<Plus className="w-4 h-4" />} onClick={handleOpenCreate}>
              Create Category
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {categories.map((c) => {
            const pCount = productCounts.get(c.id) || 0;
            const photoCount = photoCounts.get(c.id) || 0;

            return (
              <div
                key={c.id}
                className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-3.5 h-3.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: c.color || '#059669' }}
                      />
                      <h3 className="font-bold text-base text-gray-900 dark:text-white truncate">
                        {c.name}
                      </h3>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleOpenEdit(c)}
                        className="p-1 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 rounded"
                        title="Edit"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setDeletingCategory(c)}
                        className="p-1 text-gray-400 hover:text-red-600 rounded"
                        title="Delete"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {c.description && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 mt-1">
                      {c.description}
                    </p>
                  )}
                </div>

                <div className="pt-3 mt-3 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between text-xs text-gray-500">
                  <span>{pCount} {pCount === 1 ? 'product' : 'products'}</span>
                  <span>{photoCount} {photoCount === 1 ? 'photo' : 'photos'}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create / Edit Dialog */}
      <Dialog
        open={showModal}
        onClose={() => setShowModal(false)}
        title={editingCategory ? 'Edit Category' : 'Create Category'}
        size="sm"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Category Name *"
            required
            placeholder="e.g. Cables & Adapters"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />

          <Textarea
            label="Description (Optional)"
            placeholder="Category notes or scope..."
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />

          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1.5">
              Accent Color
            </label>
            <div className="flex items-center gap-2">
              {PRESET_COLORS.map((swatch) => (
                <button
                  type="button"
                  key={swatch}
                  onClick={() => setColor(swatch)}
                  className={`w-7 h-7 rounded-full transition-transform ${
                    color === swatch ? 'ring-2 ring-offset-2 ring-emerald-500 scale-110' : ''
                  }`}
                  style={{ backgroundColor: swatch }}
                />
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-gray-100 dark:border-gray-800">
            <Button type="button" variant="ghost" onClick={() => setShowModal(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" loading={isSubmitting}>
              {editingCategory ? 'Save Changes' : 'Create'}
            </Button>
          </div>
        </form>
      </Dialog>

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={!!deletingCategory}
        onClose={() => setDeletingCategory(null)}
        onConfirm={handleDelete}
        title="Delete Category"
        message={`Are you sure you want to delete "${deletingCategory?.name}"? Assigned products and photos will become uncategorized.`}
        confirmLabel="Delete"
      />
    </div>
  );
};
export default Categories;
