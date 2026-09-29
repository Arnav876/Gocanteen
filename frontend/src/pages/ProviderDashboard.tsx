import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { api, parseApiError } from '../lib/api';
import type { FoodItem, Category } from '../types';
import type { CreateFoodPayload, UpdateFoodPayload } from '../lib/api';
import { FoodItemModal } from '../components/provider/FoodItemModal';

export const ProviderDashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // State
  const [activeTab, setActiveTab] = useState<'menu' | 'overview'>('menu');
  const [foodItems, setFoodItems] = useState<FoodItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [dietaryFilter, setDietaryFilter] = useState<'all' | 'veg' | 'non-veg'>('all');

  // Modal & Edit state
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingItem, setEditingItem] = useState<FoodItem | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Delete Confirmation state
  const [itemToDelete, setItemToDelete] = useState<FoodItem | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  // Feedback Banner
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Load provider's menu and categories
  const fetchMenuAndCategories = async () => {
    setIsLoading(true);
    try {
      const [menuData, catData] = await Promise.all([
        api.foods.getMyMenu(),
        api.categories.getAll(),
      ]);
      setFoodItems(menuData);
      setCategories(catData);
    } catch (err) {
      const msg = parseApiError(err);
      setFeedback({ type: 'error', message: msg });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMenuAndCategories();
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  // Open modal for Create
  const handleOpenCreateModal = () => {
    setEditingItem(null);
    setIsModalOpen(true);
  };

  // Open modal for Edit
  const handleOpenEditModal = (item: FoodItem) => {
    setEditingItem(item);
    setIsModalOpen(true);
  };

  // Handle Form Submit (Create or Edit)
  const handleFormSubmit = async (data: CreateFoodPayload | UpdateFoodPayload) => {
    setIsSubmitting(true);
    try {
      if (editingItem) {
        await api.foods.update(editingItem.id, data);
        setFeedback({ type: 'success', message: `"${data.name || editingItem.name}" updated successfully.` });
      } else {
        await api.foods.create(data as CreateFoodPayload);
        setFeedback({ type: 'success', message: `"${data.name}" added to your stall menu.` });
      }
      await fetchMenuAndCategories();
      setIsModalOpen(false);
    } catch (err) {
      throw new Error(parseApiError(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  // 1-Click Toggle Availability (AVAILABLE <-> UNAVAILABLE)
  const handleToggleAvailability = async (item: FoodItem) => {
    try {
      const updated = await api.foods.toggleAvailability(item.id);
      setFoodItems((prev) =>
        prev.map((f) => (f.id === item.id ? { ...f, availability: updated.availability } : f))
      );
      setFeedback({
        type: 'success',
        message: `"${item.name}" is now marked as ${
          updated.availability === 'AVAILABLE' ? 'Available' : 'Out of Stock (86)'
        }.`,
      });
    } catch (err) {
      setFeedback({ type: 'error', message: parseApiError(err) });
    }
  };

  // Delete Food Item
  const handleConfirmDelete = async () => {
    if (!itemToDelete) return;
    setIsDeleting(true);
    try {
      await api.foods.delete(itemToDelete.id);
      setFoodItems((prev) => prev.filter((f) => f.id !== itemToDelete.id));
      setFeedback({ type: 'success', message: `"${itemToDelete.name}" deleted from your menu.` });
      setItemToDelete(null);
    } catch (err) {
      setFeedback({ type: 'error', message: parseApiError(err) });
    } finally {
      setIsDeleting(false);
    }
  };

  // Filter food items
  const filteredItems = foodItems.filter((item) => {
    const matchesSearch =
      searchQuery === '' ||
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesCategory = selectedCategory === 'all' || item.categoryId === selectedCategory;

    const matchesDiet =
      dietaryFilter === 'all' ||
      (dietaryFilter === 'veg' && item.isVeg) ||
      (dietaryFilter === 'non-veg' && !item.isVeg);

    return matchesSearch && matchesCategory && matchesDiet;
  });

  // Calculate statistics
  const totalItemsCount = foodItems.length;
  const availableItemsCount = foodItems.filter((i) => i.availability === 'AVAILABLE').length;
  const outOfStockCount = foodItems.filter((i) => i.availability === 'UNAVAILABLE').length;

  return (
    <div className="min-h-screen bg-background text-on-surface antialiased font-sans pb-24">
      {/* Top App Bar */}
      <header className="sticky top-0 z-40 bg-surface-container-lowest/95 backdrop-blur-md border-b border-outline-variant/30 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-primary-container text-on-primary-container flex items-center justify-center shadow-sm">
              <span className="material-symbols-outlined text-2xl" data-icon="storefront">
                storefront
              </span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-headline-md font-bold text-primary tracking-tight">CampusBites</span>
                <span className="px-2 py-0.5 rounded-full bg-secondary-fixed text-on-secondary-fixed text-label-sm font-bold">
                  Provider Terminal
                </span>
              </div>
              <p className="text-body-sm text-on-surface-variant font-medium">
                {user?.provider?.name || user?.fullName} • {user?.provider?.counterNumber || 'Counter 01'}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-outline-variant/60 hover:bg-surface-container text-label-sm font-semibold text-on-surface transition"
            >
              <span className="material-symbols-outlined text-base">logout</span>
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 pt-6 space-y-6">
        {/* Feedback Alert Toast */}
        {feedback && (
          <div
            className={`p-4 rounded-xl flex items-center justify-between shadow-sm transition animate-in fade-in ${
              feedback.type === 'success'
                ? 'bg-tertiary-container/80 text-on-tertiary-container border border-tertiary/40'
                : 'bg-error-container text-on-error-container border border-error/40'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <span className="material-symbols-outlined text-xl">
                {feedback.type === 'success' ? 'check_circle' : 'error'}
              </span>
              <span className="text-label-md font-medium">{feedback.message}</span>
            </div>
            <button
              onClick={() => setFeedback(null)}
              className="p-1 hover:opacity-75 rounded-full"
            >
              <span className="material-symbols-outlined text-base">close</span>
            </button>
          </div>
        )}

        {/* Stall Header Stats Bento Grid */}
        <section className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-surface-container-lowest p-4 rounded-2xl border border-outline-variant/30 card-shadow flex items-center justify-between">
            <div>
              <span className="text-label-sm font-semibold text-on-surface-variant block">Total Dishes</span>
              <span className="text-headline-md font-extrabold text-on-surface">{totalItemsCount}</span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-primary-fixed flex items-center justify-center text-on-primary-fixed">
              <span className="material-symbols-outlined text-xl">restaurant_menu</span>
            </div>
          </div>

          <div className="bg-surface-container-lowest p-4 rounded-2xl border border-outline-variant/30 card-shadow flex items-center justify-between">
            <div>
              <span className="text-label-sm font-semibold text-on-surface-variant block">Available Live</span>
              <span className="text-headline-md font-extrabold text-tertiary">{availableItemsCount}</span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-tertiary-container flex items-center justify-center text-on-tertiary-container">
              <span className="material-symbols-outlined text-xl">check_circle</span>
            </div>
          </div>

          <div className="bg-surface-container-lowest p-4 rounded-2xl border border-outline-variant/30 card-shadow flex items-center justify-between">
            <div>
              <span className="text-label-sm font-semibold text-on-surface-variant block">86'd (Out of Stock)</span>
              <span className="text-headline-md font-extrabold text-secondary">{outOfStockCount}</span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-secondary-fixed flex items-center justify-center text-on-secondary-fixed">
              <span className="material-symbols-outlined text-xl">block</span>
            </div>
          </div>

          <div className="bg-surface-container-lowest p-4 rounded-2xl border border-outline-variant/30 card-shadow flex items-center justify-between">
            <div>
              <span className="text-label-sm font-semibold text-on-surface-variant block">Counter Status</span>
              <span className="text-headline-md font-extrabold text-primary">
                {user?.provider?.counterNumber || 'Counter 01'}
              </span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-primary-container flex items-center justify-center text-on-primary-container">
              <span className="material-symbols-outlined text-xl">countertops</span>
            </div>
          </div>
        </section>

        {/* Tab Navigation */}
        <div className="flex items-center justify-between border-b border-outline-variant/30 pb-3 gap-4 flex-wrap">
          <div className="flex space-x-2">
            <button
              onClick={() => setActiveTab('menu')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-label-lg font-bold transition-all shadow-sm ${
                activeTab === 'menu'
                  ? 'bg-primary text-on-primary'
                  : 'bg-surface-container-lowest text-on-surface hover:bg-surface-container border border-outline-variant/30'
              }`}
            >
              <span className="material-symbols-outlined text-lg">menu_book</span>
              <span>Menu & 86 Management</span>
              <span className="ml-1 px-2 py-0.2 rounded-full bg-surface-container text-on-surface text-label-sm font-bold">
                {totalItemsCount}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('overview')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-label-lg font-bold transition-all shadow-sm ${
                activeTab === 'overview'
                  ? 'bg-primary text-on-primary'
                  : 'bg-surface-container-lowest text-on-surface hover:bg-surface-container border border-outline-variant/30'
              }`}
            >
              <span className="material-symbols-outlined text-lg">soup_kitchen</span>
              <span>Stall Overview</span>
            </button>
          </div>

          {activeTab === 'menu' && (
            <button
              onClick={handleOpenCreateModal}
              className="px-5 py-2.5 rounded-xl bg-primary text-on-primary font-bold text-label-lg shadow-md hover:bg-primary-container active:scale-95 transition-transform flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-xl">add</span>
              <span>Add Food Item</span>
            </button>
          )}
        </div>

        {/* Tab 1: Menu Management */}
        {activeTab === 'menu' && (
          <section className="space-y-5">
            {/* Filters Bar */}
            <div className="bg-surface-container-lowest p-4 rounded-2xl border border-outline-variant/30 card-shadow flex flex-col md:flex-row md:items-center justify-between gap-4">
              {/* Search Bar */}
              <div className="relative flex-1 max-w-md">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-outline">
                  <span className="material-symbols-outlined text-lg">search</span>
                </span>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search dish by name or description..."
                  className="w-full pl-10 pr-3.5 py-2 rounded-xl border border-outline-variant/60 bg-surface-bright text-on-surface font-body-md text-body-md placeholder:text-outline/60 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition"
                />
              </div>

              {/* Dietary Filter Buttons */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
                <button
                  onClick={() => setDietaryFilter('all')}
                  className={`px-3 py-1.5 rounded-lg text-label-sm font-bold transition ${
                    dietaryFilter === 'all'
                      ? 'bg-surface-container-highest text-on-surface'
                      : 'text-on-surface-variant hover:bg-surface-container'
                  }`}
                >
                  All Types
                </button>
                <button
                  onClick={() => setDietaryFilter('veg')}
                  className={`px-3 py-1.5 rounded-lg text-label-sm font-bold flex items-center gap-1 transition ${
                    dietaryFilter === 'veg'
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                      : 'text-on-surface-variant hover:bg-surface-container'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
                  Veg Only
                </button>
                <button
                  onClick={() => setDietaryFilter('non-veg')}
                  className={`px-3 py-1.5 rounded-lg text-label-sm font-bold flex items-center gap-1 transition ${
                    dietaryFilter === 'non-veg'
                      ? 'bg-rose-100 text-rose-800 border border-rose-300'
                      : 'text-on-surface-variant hover:bg-surface-container'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-rose-600"></span>
                  Non-Veg
                </button>
              </div>
            </div>

            {/* Category Pills Bar */}
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
              <button
                onClick={() => setSelectedCategory('all')}
                className={`px-3.5 py-1.5 rounded-full text-label-sm font-bold whitespace-nowrap transition ${
                  selectedCategory === 'all'
                    ? 'bg-primary text-on-primary shadow-sm'
                    : 'bg-surface-container-lowest border border-outline-variant/40 text-on-surface hover:border-primary'
                }`}
              >
                All Categories ({foodItems.length})
              </button>
              {categories.map((cat) => {
                const count = foodItems.filter((i) => i.categoryId === cat.id).length;
                return (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`px-3.5 py-1.5 rounded-full text-label-sm font-bold whitespace-nowrap transition flex items-center gap-1.5 ${
                      selectedCategory === cat.id
                        ? 'bg-primary text-on-primary shadow-sm'
                        : 'bg-surface-container-lowest border border-outline-variant/40 text-on-surface hover:border-primary'
                    }`}
                  >
                    <span>{cat.name}</span>
                    <span className="px-1.5 py-0.2 rounded-full bg-surface-container text-on-surface text-[10px]">
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Food Items Grid */}
            {isLoading ? (
              <div className="p-12 text-center bg-surface-container-lowest rounded-2xl border border-outline-variant/30">
                <span className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent inline-block mb-3"></span>
                <p className="text-body-md font-medium text-on-surface-variant">Loading your stall menu catalog...</p>
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="p-12 text-center bg-surface-container-lowest rounded-2xl border border-outline-variant/30 space-y-3">
                <div className="w-16 h-16 rounded-2xl bg-surface-container mx-auto flex items-center justify-center text-outline">
                  <span className="material-symbols-outlined text-3xl">restaurant</span>
                </div>
                <h3 className="text-headline-sm font-bold text-on-surface">No Food Items Found</h3>
                <p className="text-body-sm text-on-surface-variant max-w-md mx-auto">
                  {searchQuery || selectedCategory !== 'all' || dietaryFilter !== 'all'
                    ? 'No dishes match your active search or category filters. Try clearing filters.'
                    : 'Your menu catalog is currently empty. Click the button below to add your first signature dish!'}
                </p>
                <button
                  onClick={handleOpenCreateModal}
                  className="px-5 py-2.5 rounded-xl bg-primary text-on-primary font-bold text-label-md shadow-md inline-flex items-center gap-2 hover:bg-primary-container transition"
                >
                  <span className="material-symbols-outlined">add</span>
                  <span>Add First Food Item</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {filteredItems.map((item) => {
                  const isAvailable = item.availability === 'AVAILABLE';
                  const categoryName = item.category?.name || 'Snacks & Quick Bites';

                  return (
                    <div
                      key={item.id}
                      className={`bg-surface-container-lowest rounded-2xl border overflow-hidden transition-all duration-200 flex flex-col justify-between ${
                        isAvailable
                          ? 'border-outline-variant/40 card-shadow hover:shadow-md'
                          : 'border-outline-variant/30 opacity-75 bg-surface-container-low/20'
                      }`}
                    >
                      {/* Top Media & Tags Header */}
                      <div className="relative">
                        {item.imageUrl ? (
                          <div className="w-full h-44 bg-surface-container overflow-hidden">
                            <img
                              src={item.imageUrl}
                              alt={item.name}
                              className={`w-full h-full object-cover transition-transform duration-300 hover:scale-105 ${
                                !isAvailable ? 'grayscale contrast-75' : ''
                              }`}
                              onError={(e) => {
                                (e.target as HTMLElement).style.display = 'none';
                              }}
                            />
                          </div>
                        ) : (
                          <div className="w-full h-32 bg-surface-container flex items-center justify-center text-outline">
                            <span className="material-symbols-outlined text-4xl">lunch_dining</span>
                          </div>
                        )}

                        {/* Top Badges */}
                        <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 flex-wrap">
                          <span className="px-2.5 py-1 rounded-full bg-surface-container-lowest/90 backdrop-blur-sm border border-outline-variant/30 text-label-sm font-bold text-on-surface shadow-sm">
                            {categoryName}
                          </span>
                          {item.isVeg ? (
                            <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-label-sm font-bold border border-emerald-300 flex items-center gap-1 shadow-sm">
                              <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
                              Veg
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-md bg-rose-100 text-rose-800 text-label-sm font-bold border border-rose-300 flex items-center gap-1 shadow-sm">
                              <span className="w-2 h-2 rounded-full bg-rose-600"></span>
                              Non-Veg
                            </span>
                          )}
                        </div>

                        {/* 86 Out of Stock Overlay Ribbon */}
                        {!isAvailable && (
                          <div className="absolute top-2.5 right-2.5 px-2.5 py-1 rounded-full bg-error text-on-error font-bold text-label-sm shadow-md flex items-center gap-1">
                            <span className="material-symbols-outlined text-sm">block</span>
                            <span>86 / Out of Stock</span>
                          </div>
                        )}
                      </div>

                      {/* Card Content Body */}
                      <div className="p-4 space-y-2.5 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="text-headline-sm font-bold text-on-surface leading-snug">{item.name}</h4>
                          <span className="text-headline-sm font-extrabold text-primary whitespace-nowrap">
                            ₹{Number(item.price).toFixed(0)}
                          </span>
                        </div>

                        {item.description && (
                          <p className="text-body-sm text-on-surface-variant line-clamp-2">{item.description}</p>
                        )}

                        {/* Dietary Pills & Prep Time */}
                        <div className="flex items-center gap-2 text-label-sm text-outline flex-wrap pt-1">
                          <span className="flex items-center gap-1 bg-surface-container px-2 py-0.5 rounded">
                            <span className="material-symbols-outlined text-xs">timer</span>
                            <span>
                              {item.prepTimeMin}-{item.prepTimeMax} mins
                            </span>
                          </span>

                          {item.isVegan && (
                            <span className="px-1.5 py-0.5 rounded bg-surface-container text-on-surface-variant text-[11px] font-semibold">
                              Vegan
                            </span>
                          )}
                          {item.isHalal && (
                            <span className="px-1.5 py-0.5 rounded bg-surface-container text-on-surface-variant text-[11px] font-semibold">
                              Halal
                            </span>
                          )}
                          {item.isGlutenFree && (
                            <span className="px-1.5 py-0.5 rounded bg-surface-container text-on-surface-variant text-[11px] font-semibold">
                              Gluten-Free
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Card Actions Footer */}
                      <div className="p-3 bg-surface-container-low/50 border-t border-outline-variant/30 flex items-center justify-between gap-2">
                        {/* 1-Click Availability Toggle */}
                        <button
                          type="button"
                          onClick={() => handleToggleAvailability(item)}
                          className={`flex-1 py-1.5 px-2.5 rounded-lg text-label-sm font-bold flex items-center justify-center gap-1.5 transition ${
                            isAvailable
                              ? 'bg-surface-container hover:bg-error-container hover:text-error text-on-surface'
                              : 'bg-tertiary text-on-tertiary hover:bg-tertiary-container'
                          }`}
                        >
                          <span className="material-symbols-outlined text-base">
                            {isAvailable ? 'toggle_on' : 'toggle_off'}
                          </span>
                          <span>{isAvailable ? '86 (Mark Out of Stock)' : 'Re-Stock Available'}</span>
                        </button>

                        <div className="flex items-center gap-1">
                          {/* Edit Button */}
                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(item)}
                            title="Edit dish"
                            className="p-1.5 rounded-lg border border-outline-variant/40 hover:bg-surface-container text-on-surface transition"
                          >
                            <span className="material-symbols-outlined text-base">edit</span>
                          </button>

                          {/* Delete Button */}
                          <button
                            type="button"
                            onClick={() => setItemToDelete(item)}
                            title="Delete dish"
                            className="p-1.5 rounded-lg border border-outline-variant/40 hover:bg-error-container hover:text-error text-on-surface-variant transition"
                          >
                            <span className="material-symbols-outlined text-base">delete</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {/* Tab 2: Stall Overview */}
        {activeTab === 'overview' && (
          <section className="bg-surface-container-lowest rounded-2xl p-6 border border-outline-variant/30 space-y-6">
            <div>
              <h2 className="text-headline-sm font-bold text-on-surface">Stall Operations & Terminal Config</h2>
              <p className="text-body-md text-on-surface-variant">
                Live counter terminal status authenticated via university provider portal.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-surface-container border border-outline-variant/30 space-y-2">
                <span className="text-label-sm font-bold text-primary uppercase tracking-wide">Provider Account</span>
                <p className="text-body-sm text-on-surface font-medium">Stall Name: {user?.provider?.name}</p>
                <p className="text-body-sm text-on-surface font-medium">Manager: {user?.fullName}</p>
                <p className="text-body-sm text-on-surface font-medium">Email: {user?.email}</p>
                <p className="text-body-sm text-on-surface font-medium">
                  Approval Status:{' '}
                  <span className="text-emerald-700 font-bold">{user?.provider?.status || 'APPROVED'}</span>
                </p>
              </div>

              <div className="p-4 rounded-xl bg-surface-container border border-outline-variant/30 space-y-2">
                <span className="text-label-sm font-bold text-primary uppercase tracking-wide">Counter Assignment</span>
                <p className="text-body-sm text-on-surface font-medium">
                  Counter ID: {user?.provider?.counterNumber || 'Counter 01'}
                </p>
                <p className="text-body-sm text-on-surface font-medium">
                  Assigned Location: {user?.provider?.location?.name || 'Main Canteen Concourse'}
                </p>
                <p className="text-body-sm text-on-surface font-medium">
                  Stall Status: <span className="text-emerald-700 font-bold">Open & Accepting Orders</span>
                </p>
              </div>
            </div>
          </section>
        )}
      </main>

      {/* Add / Edit Food Modal */}
      <FoodItemModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleFormSubmit}
        initialData={editingItem}
        categories={categories}
        isSubmitting={isSubmitting}
      />

      {/* Delete Confirmation Modal */}
      {itemToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-on-background/50 backdrop-blur-sm">
          <div className="bg-surface-container-lowest rounded-2xl w-full max-w-md border border-outline-variant/40 shadow-xl p-6 space-y-4 animate-in fade-in">
            <div className="w-12 h-12 rounded-xl bg-error-container text-on-error-container flex items-center justify-center mx-auto">
              <span className="material-symbols-outlined text-2xl">delete_forever</span>
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-headline-sm font-bold text-on-surface">Delete Food Item?</h3>
              <p className="text-body-sm text-on-surface-variant">
                Are you sure you want to remove <strong className="text-on-surface">"{itemToDelete.name}"</strong> from your
                canteen menu? This cannot be undone.
              </p>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setItemToDelete(null)}
                disabled={isDeleting}
                className="flex-1 py-2.5 px-4 rounded-xl border border-outline-variant/60 hover:bg-surface-container text-label-md font-semibold text-on-surface transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="flex-1 py-2.5 px-4 rounded-xl bg-error text-on-error hover:opacity-90 active:scale-95 text-label-md font-bold transition shadow-sm flex items-center justify-center gap-1.5"
              >
                {isDeleting ? (
                  <>
                    <span className="animate-spin rounded-full h-4 w-4 border-2 border-on-error border-t-transparent"></span>
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-base">delete</span>
                    <span>Delete Item</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
