import { useState, useEffect } from 'react';
import type { Category, FoodItem } from '../../types';
import type { CreateFoodPayload, UpdateFoodPayload } from '../../lib/api';

interface FoodItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateFoodPayload | UpdateFoodPayload) => Promise<void>;
  initialData?: FoodItem | null;
  categories: Category[];
  isSubmitting: boolean;
}

export const FoodItemModal: React.FC<FoodItemModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  categories,
  isSubmitting,
}) => {
  const [name, setName] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [categoryId, setCategoryId] = useState<string>('');
  const [price, setPrice] = useState<string>('');
  const [imageUrl, setImageUrl] = useState<string>('');
  const [isVeg, setIsVeg] = useState<boolean>(true);
  const [isVegan, setIsVegan] = useState<boolean>(false);
  const [isHalal, setIsHalal] = useState<boolean>(false);
  const [isGlutenFree, setIsGlutenFree] = useState<boolean>(false);
  const [minPrepMinutes, setMinPrepMinutes] = useState<number>(10);
  const [maxPrepMinutes, setMaxPrepMinutes] = useState<number>(15);
  const [availability, setAvailability] = useState<'AVAILABLE' | 'UNAVAILABLE'>('AVAILABLE');
  const [validationError, setValidationError] = useState<string | null>(null);

  // Initialize form when opened or initialData changes
  useEffect(() => {
    if (initialData) {
      setName(initialData.name || '');
      setDescription(initialData.description || '');
      setCategoryId(initialData.categoryId || (categories[0]?.id ?? ''));
      setPrice(String(initialData.price || ''));
      setImageUrl(initialData.imageUrl || '');
      setIsVeg(initialData.isVeg ?? true);
      setIsVegan(initialData.isVegan ?? false);
      setIsHalal(initialData.isHalal ?? false);
      setIsGlutenFree(initialData.isGlutenFree ?? false);
      setMinPrepMinutes(initialData.prepTimeMin ?? 10);
      setMaxPrepMinutes(initialData.prepTimeMax ?? 15);
      setAvailability(initialData.availability || 'AVAILABLE');
    } else {
      setName('');
      setDescription('');
      setCategoryId(categories[0]?.id ?? '');
      setPrice('');
      setImageUrl('');
      setIsVeg(true);
      setIsVegan(false);
      setIsHalal(false);
      setIsGlutenFree(false);
      setMinPrepMinutes(10);
      setMaxPrepMinutes(15);
      setAvailability('AVAILABLE');
    }
    setValidationError(null);
  }, [initialData, categories, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    if (!name.trim() || name.trim().length < 2) {
      setValidationError('Please enter a valid item name (minimum 2 characters).');
      return;
    }

    if (!categoryId) {
      setValidationError('Please select a food category.');
      return;
    }

    const numPrice = parseFloat(price);
    if (isNaN(numPrice) || numPrice <= 0) {
      setValidationError('Please enter a valid price greater than ₹0.');
      return;
    }

    if (minPrepMinutes > maxPrepMinutes) {
      setValidationError('Minimum prep time cannot be greater than maximum prep time.');
      return;
    }

    const payload = {
      name: name.trim(),
      description: description.trim() || null,
      categoryId,
      price: numPrice,
      imageUrl: imageUrl.trim() || null,
      isVeg,
      isVegan,
      isHalal,
      isGlutenFree,
      minPrepMinutes,
      maxPrepMinutes,
      availability,
    };

    try {
      await onSubmit(payload as any);
      onClose();
    } catch (err: any) {
      setValidationError(err.message || 'Failed to save food item.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-on-background/50 backdrop-blur-sm overflow-y-auto">
      <div className="bg-surface-container-lowest rounded-2xl w-full max-w-xl border border-outline-variant/40 shadow-xl overflow-hidden my-8">
        {/* Header */}
        <div className="p-5 bg-surface-container-low/60 border-b border-outline-variant/30 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-primary-fixed text-on-primary-fixed flex items-center justify-center font-bold">
              <span className="material-symbols-outlined text-xl">
                {initialData ? 'edit_note' : 'add_circle'}
              </span>
            </div>
            <div>
              <h2 className="text-headline-sm font-bold text-on-surface">
                {initialData ? 'Edit Food Item' : 'Add New Food Item'}
              </h2>
              <p className="text-body-sm text-on-surface-variant">
                {initialData ? 'Update item details, pricing & dietary tags' : 'List a new dish on your canteen stall menu'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-surface-container text-on-surface-variant hover:text-on-surface transition"
          >
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
          {validationError && (
            <div className="p-3 bg-error-container/70 border border-error/30 rounded-xl flex items-start gap-2 text-on-error-container">
              <span className="material-symbols-outlined text-error text-lg shrink-0 mt-0.5">error</span>
              <p className="text-body-sm text-error font-medium">{validationError}</p>
            </div>
          )}

          {/* Item Name */}
          <div>
            <label className="block text-label-md font-bold text-on-surface mb-1.5" htmlFor="food-name">
              Item Name <span className="text-error">*</span>
            </label>
            <input
              id="food-name"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Crispy Paneer Kathi Wrap"
              className="w-full px-3.5 py-2.5 rounded-xl border border-outline-variant/60 bg-surface-bright text-on-surface font-body-md placeholder:text-outline/60 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition"
            />
          </div>

          {/* Category & Price Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-label-md font-bold text-on-surface mb-1.5" htmlFor="food-category">
                Category <span className="text-error">*</span>
              </label>
              <select
                id="food-category"
                required
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-outline-variant/60 bg-surface-bright text-on-surface font-body-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition"
              >
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-label-md font-bold text-on-surface mb-1.5" htmlFor="food-price">
                Price (₹) <span className="text-error">*</span>
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-on-surface-variant font-bold">
                  ₹
                </span>
                <input
                  id="food-price"
                  type="number"
                  step="1"
                  min="1"
                  required
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="99"
                  className="w-full pl-8 pr-3.5 py-2.5 rounded-xl border border-outline-variant/60 bg-surface-bright text-on-surface font-body-md placeholder:text-outline/60 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition"
                />
              </div>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-label-md font-bold text-on-surface mb-1.5" htmlFor="food-desc">
              Description / Ingredients
            </label>
            <textarea
              id="food-desc"
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Spiced grilled paneer rolled in flaky whole wheat paratha with mint chutney and crunchy onions."
              className="w-full px-3.5 py-2 rounded-xl border border-outline-variant/60 bg-surface-bright text-on-surface font-body-md placeholder:text-outline/60 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition resize-none"
            />
          </div>

          {/* Image URL & Preview */}
          <div>
            <label className="block text-label-md font-bold text-on-surface mb-1.5" htmlFor="food-image">
              Image URL (Optional)
            </label>
            <div className="flex gap-2">
              <input
                id="food-image"
                type="url"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://images.unsplash.com/photo-..."
                className="flex-1 px-3.5 py-2.5 rounded-xl border border-outline-variant/60 bg-surface-bright text-on-surface font-body-md placeholder:text-outline/60 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition"
              />
              {imageUrl && (
                <div className="w-11 h-11 rounded-lg overflow-hidden border border-outline-variant/40 shrink-0 bg-surface-container">
                  <img
                    src={imageUrl}
                    alt="Preview"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Prep Time Range */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-label-md font-bold text-on-surface mb-1.5" htmlFor="min-prep">
                Min Prep Time (Mins)
              </label>
              <input
                id="min-prep"
                type="number"
                min="1"
                max="60"
                value={minPrepMinutes}
                onChange={(e) => setMinPrepMinutes(parseInt(e.target.value, 10) || 5)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-outline-variant/60 bg-surface-bright text-on-surface font-body-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition"
              />
            </div>
            <div>
              <label className="block text-label-md font-bold text-on-surface mb-1.5" htmlFor="max-prep">
                Max Prep Time (Mins)
              </label>
              <input
                id="max-prep"
                type="number"
                min="1"
                max="120"
                value={maxPrepMinutes}
                onChange={(e) => setMaxPrepMinutes(parseInt(e.target.value, 10) || 15)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-outline-variant/60 bg-surface-bright text-on-surface font-body-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition"
              />
            </div>
          </div>

          {/* Dietary Tags */}
          <div>
            <label className="block text-label-md font-bold text-on-surface mb-2">Dietary Badges</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <label className="flex items-center gap-2 p-2.5 rounded-xl border border-outline-variant/40 bg-surface-container-low/40 cursor-pointer hover:bg-surface-container transition">
                <input
                  type="checkbox"
                  checked={isVeg}
                  onChange={(e) => setIsVeg(e.target.checked)}
                  className="rounded text-primary focus:ring-primary h-4 w-4"
                />
                <span className="text-body-sm font-semibold text-on-surface flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-600"></span>
                  Veg
                </span>
              </label>

              <label className="flex items-center gap-2 p-2.5 rounded-xl border border-outline-variant/40 bg-surface-container-low/40 cursor-pointer hover:bg-surface-container transition">
                <input
                  type="checkbox"
                  checked={isVegan}
                  onChange={(e) => setIsVegan(e.target.checked)}
                  className="rounded text-primary focus:ring-primary h-4 w-4"
                />
                <span className="text-body-sm font-semibold text-on-surface">Vegan</span>
              </label>

              <label className="flex items-center gap-2 p-2.5 rounded-xl border border-outline-variant/40 bg-surface-container-low/40 cursor-pointer hover:bg-surface-container transition">
                <input
                  type="checkbox"
                  checked={isHalal}
                  onChange={(e) => setIsHalal(e.target.checked)}
                  className="rounded text-primary focus:ring-primary h-4 w-4"
                />
                <span className="text-body-sm font-semibold text-on-surface">Halal</span>
              </label>

              <label className="flex items-center gap-2 p-2.5 rounded-xl border border-outline-variant/40 bg-surface-container-low/40 cursor-pointer hover:bg-surface-container transition">
                <input
                  type="checkbox"
                  checked={isGlutenFree}
                  onChange={(e) => setIsGlutenFree(e.target.checked)}
                  className="rounded text-primary focus:ring-primary h-4 w-4"
                />
                <span className="text-body-sm font-semibold text-on-surface">Gluten-Free</span>
              </label>
            </div>
          </div>

          {/* Availability Radio */}
          <div>
            <label className="block text-label-md font-bold text-on-surface mb-2">Initial Availability Status</label>
            <div className="flex gap-3">
              <label
                onClick={() => setAvailability('AVAILABLE')}
                className={`flex-1 p-3 rounded-xl border flex items-center justify-center gap-2 cursor-pointer transition ${
                  availability === 'AVAILABLE'
                    ? 'border-tertiary bg-tertiary-container text-on-tertiary-container font-bold'
                    : 'border-outline-variant/40 bg-surface-container-low text-on-surface-variant'
                }`}
              >
                <span className="material-symbols-outlined text-lg">check_circle</span>
                <span className="text-label-md">Available for Orders</span>
              </label>

              <label
                onClick={() => setAvailability('UNAVAILABLE')}
                className={`flex-1 p-3 rounded-xl border flex items-center justify-center gap-2 cursor-pointer transition ${
                  availability === 'UNAVAILABLE'
                    ? 'border-error bg-error-container text-on-error-container font-bold'
                    : 'border-outline-variant/40 bg-surface-container-low text-on-surface-variant'
                }`}
              >
                <span className="material-symbols-outlined text-lg">block</span>
                <span className="text-label-md">86 (Out of Stock)</span>
              </label>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-outline-variant/20 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2.5 rounded-xl border border-outline-variant/60 hover:bg-surface-container text-label-md font-semibold text-on-surface transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 rounded-xl bg-primary text-on-primary text-label-md font-bold hover:bg-primary-container active:scale-95 transition shadow-sm flex items-center gap-2 disabled:opacity-75 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <span className="animate-spin rounded-full h-4 w-4 border-2 border-on-primary border-t-transparent"></span>
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-lg">save</span>
                  <span>{initialData ? 'Update Dish' : 'Publish Dish to Menu'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
