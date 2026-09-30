import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useNavigate } from 'react-router-dom';
import { api, parseApiError } from '../lib/api';
import type { FoodItem, Category, Order } from '../types';
import { CheckoutModal } from '../components/customer/CheckoutModal';
import { OrderConfirmationModal } from '../components/customer/OrderConfirmationModal';
import { CustomerOrdersView } from '../components/customer/CustomerOrdersView';

export const CustomerDashboard: React.FC = () => {
  const { user, selectedLocation, logout } = useAuth();
  const { items: cartItems, totalItems, subtotal, addToCart, updateQuantity, clearCart } = useCart();
  const navigate = useNavigate();

  // Navigation Tabs: 'menu' | 'orders' | 'profile'
  const [activeTab, setActiveTab] = useState<'menu' | 'orders' | 'profile'>('menu');

  // Data states
  const [foodItems, setFoodItems] = useState<FoodItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [dietaryFilters, setDietaryFilters] = useState<{
    vegOnly: boolean;
    halalOnly: boolean;
    glutenFreeOnly: boolean;
    quickPrepOnly: boolean;
  }>({
    vegOnly: false,
    halalOnly: false,
    glutenFreeOnly: false,
    quickPrepOnly: false,
  });

  // Modals
  const [isCheckoutOpen, setIsCheckoutOpen] = useState<boolean>(false);
  const [completedOrder, setCompletedOrder] = useState<Order | null>(null);
  const [isConfirmationOpen, setIsConfirmationOpen] = useState<boolean>(false);

  // Multi-stall conflict prompt modal
  const [pendingItemToAdd, setPendingItemToAdd] = useState<{ item: FoodItem; qty: number } | null>(null);

  // Fetch foods & categories
  const fetchData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [foodsData, categoriesData] = await Promise.all([
        api.foods.getAll(),
        api.categories.getAll(),
      ]);
      setFoodItems(foodsData);
      setCategories(categoriesData);
    } catch (err) {
      setError(parseApiError(err));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  // Add to cart with single-stall validation
  const handleAddItem = (food: FoodItem, quantity = 1) => {
    if (food.availability === 'UNAVAILABLE') return;

    const result = addToCart(food, quantity);
    if (result.requiresClearConfirm) {
      setPendingItemToAdd({ item: food, qty: quantity });
    }
  };

  // Clear cart and add new stall item
  const handleConfirmSwitchStall = () => {
    if (pendingItemToAdd) {
      clearCart();
      addToCart(pendingItemToAdd.item, pendingItemToAdd.qty);
      setPendingItemToAdd(null);
    }
  };

  const handleOrderSuccess = (newOrder: Order) => {
    setIsCheckoutOpen(false);
    setCompletedOrder(newOrder);
    setIsConfirmationOpen(true);
  };

  // Filter food items
  const filteredFoods = foodItems.filter((food) => {
    const matchesSearch =
      searchQuery === '' ||
      food.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (food.description && food.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (food.provider?.name && food.provider.name.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesCategory = selectedCategory === 'all' || food.categoryId === selectedCategory;

    const matchesVeg = !dietaryFilters.vegOnly || food.isVeg;
    const matchesHalal = !dietaryFilters.halalOnly || food.isHalal;
    const matchesGlutenFree = !dietaryFilters.glutenFreeOnly || food.isGlutenFree;
    const matchesQuickPrep = !dietaryFilters.quickPrepOnly || food.prepTimeMax <= 15;

    return (
      matchesSearch &&
      matchesCategory &&
      matchesVeg &&
      matchesHalal &&
      matchesGlutenFree &&
      matchesQuickPrep
    );
  });

  return (
    <div className="min-h-screen bg-background text-on-surface antialiased font-sans pb-32">
      {/* Top App Bar (Approved Stitch Header) */}
      <header className="sticky top-0 z-40 bg-surface-container-lowest/95 backdrop-blur-md border-b border-outline-variant/30 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-10 h-10 rounded-xl bg-primary-container text-on-primary-container flex items-center justify-center shadow-sm">
              <span className="material-symbols-outlined text-2xl" data-icon="restaurant">
                restaurant
              </span>
            </div>
            <div>
              <span className="text-headline-md font-bold text-primary tracking-tight">CampusBites</span>
              <span className="ml-2 px-2 py-0.5 rounded-full bg-secondary-fixed text-on-secondary-fixed text-label-sm font-bold">
                Student App
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <div className="hidden sm:flex items-center space-x-1.5 bg-surface-container px-3 py-1.5 rounded-full border border-outline-variant/30">
              <span className="material-symbols-outlined text-primary text-base" data-icon="location_on" data-weight="fill">
                location_on
              </span>
              <span className="text-label-sm font-bold text-on-surface">
                {selectedLocation?.name || 'Central Dining Concourse'}
              </span>
            </div>

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
      <main className="max-w-6xl mx-auto px-4 pt-4 space-y-6">
        {/* Navigation Tabs Bar */}
        <div className="flex items-center justify-between border-b border-outline-variant/30 pb-1">
          <div className="flex space-x-2">
            <button
              onClick={() => setActiveTab('menu')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-label-lg font-bold transition-all shadow-sm ${
                activeTab === 'menu'
                  ? 'bg-primary text-on-primary'
                  : 'bg-surface-container-lowest text-on-surface hover:bg-surface-container border border-outline-variant/30'
              }`}
            >
              <span className="material-symbols-outlined text-lg">restaurant_menu</span>
              <span>Menu & Stalls</span>
            </button>

            <button
              onClick={() => setActiveTab('orders')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-label-lg font-bold transition-all shadow-sm ${
                activeTab === 'orders'
                  ? 'bg-primary text-on-primary'
                  : 'bg-surface-container-lowest text-on-surface hover:bg-surface-container border border-outline-variant/30'
              }`}
            >
              <span className="material-symbols-outlined text-lg">receipt_long</span>
              <span>My Orders</span>
            </button>

            <button
              onClick={() => setActiveTab('profile')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-label-lg font-bold transition-all shadow-sm ${
                activeTab === 'profile'
                  ? 'bg-primary text-on-primary'
                  : 'bg-surface-container-lowest text-on-surface hover:bg-surface-container border border-outline-variant/30'
              }`}
            >
              <span className="material-symbols-outlined text-lg">account_circle</span>
              <span>Meal Card & Profile</span>
            </button>
          </div>
        </div>

        {/* TAB 1: MENU & ORDERING */}
        {activeTab === 'menu' && (
          <div className="space-y-5">
            {/* Live Campus Rush Banner */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between bg-primary-fixed/60 border border-outline-variant/40 rounded-2xl p-4 gap-3">
              <div className="flex items-center space-x-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-on-primary shadow-sm animate-pulse">
                  <span className="material-symbols-outlined text-xl">bolt</span>
                </div>
                <div>
                  <div className="text-label-md font-bold text-on-primary-fixed flex items-center gap-2">
                    <span>Campus Canteens Live</span>
                    <span className="h-2 w-2 rounded-full bg-primary animate-ping"></span>
                  </div>
                  <p className="text-body-sm text-on-surface-variant font-medium">
                    Average kitchen prep time: <strong className="text-primary font-bold">8-12 mins</strong> across active stalls
                  </p>
                </div>
              </div>

              <div className="inline-flex items-center gap-2">
                <span className="px-3 py-1 rounded-full bg-surface-container-lowest text-primary text-label-sm font-extrabold shadow-xs">
                  {foodItems.length} Dishes Available
                </span>
              </div>
            </div>

            {/* Search Input & Dietary Badges */}
            <div className="space-y-3">
              <div className="relative flex items-center">
                <span className="material-symbols-outlined absolute left-4 text-outline text-xl">search</span>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search dishes, stalls, bowls, snacks, shakes..."
                  className="w-full h-12 pl-12 pr-10 bg-surface-container-lowest border border-outline-variant/60 rounded-2xl text-body-md text-on-surface placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all shadow-xs"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3.5 p-1 rounded-full text-outline hover:text-on-surface"
                  >
                    <span className="material-symbols-outlined text-base">close</span>
                  </button>
                )}
              </div>

              {/* Quick Dietary & Prep Filter Badges */}
              <div className="flex items-center space-x-2 overflow-x-auto no-scrollbar py-0.5">
                <button
                  type="button"
                  onClick={() =>
                    setDietaryFilters((prev) => ({ ...prev, vegOnly: !prev.vegOnly }))
                  }
                  className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-full text-label-sm font-bold whitespace-nowrap transition active:scale-95 ${
                    dietaryFilters.vegOnly
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'bg-surface-container-lowest text-on-surface-variant border border-outline-variant/50 hover:bg-surface-container'
                  }`}
                >
                  <span className="material-symbols-outlined text-sm" data-weight="fill">
                    eco
                  </span>
                  <span>Veg Only</span>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setDietaryFilters((prev) => ({ ...prev, halalOnly: !prev.halalOnly }))
                  }
                  className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-full text-label-sm font-bold whitespace-nowrap transition active:scale-95 ${
                    dietaryFilters.halalOnly
                      ? 'bg-primary text-on-primary shadow-sm'
                      : 'bg-surface-container-lowest text-on-surface-variant border border-outline-variant/50 hover:bg-surface-container'
                  }`}
                >
                  <span className="material-symbols-outlined text-sm">verified</span>
                  <span>Halal Certified</span>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setDietaryFilters((prev) => ({
                      ...prev,
                      glutenFreeOnly: !prev.glutenFreeOnly,
                    }))
                  }
                  className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-full text-label-sm font-bold whitespace-nowrap transition active:scale-95 ${
                    dietaryFilters.glutenFreeOnly
                      ? 'bg-secondary text-on-secondary shadow-sm'
                      : 'bg-surface-container-lowest text-on-surface-variant border border-outline-variant/50 hover:bg-surface-container'
                  }`}
                >
                  <span className="material-symbols-outlined text-sm">grain</span>
                  <span>Gluten-Free</span>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setDietaryFilters((prev) => ({
                      ...prev,
                      quickPrepOnly: !prev.quickPrepOnly,
                    }))
                  }
                  className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-full text-label-sm font-bold whitespace-nowrap transition active:scale-95 ${
                    dietaryFilters.quickPrepOnly
                      ? 'bg-primary-container text-on-primary-container shadow-sm'
                      : 'bg-surface-container-lowest text-on-surface-variant border border-outline-variant/50 hover:bg-surface-container'
                  }`}
                >
                  <span className="material-symbols-outlined text-sm">timer</span>
                  <span>&lt; 15 min Prep</span>
                </button>
              </div>
            </div>

            {/* Category Chips Carousel */}
            <div className="flex items-center space-x-2 overflow-x-auto no-scrollbar pb-1">
              <button
                onClick={() => setSelectedCategory('all')}
                className={`px-4 py-2 rounded-full text-label-md font-bold whitespace-nowrap transition shadow-xs ${
                  selectedCategory === 'all'
                    ? 'bg-inverse-surface text-inverse-on-surface'
                    : 'bg-surface-container-lowest text-on-surface border border-outline-variant/50 hover:bg-surface-container'
                }`}
              >
                All Menu ({foodItems.length})
              </button>
              {categories.map((cat) => {
                const count = foodItems.filter((f) => f.categoryId === cat.id).length;
                return (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`px-4 py-2 rounded-full text-label-md font-bold whitespace-nowrap transition shadow-xs ${
                      selectedCategory === cat.id
                        ? 'bg-inverse-surface text-inverse-on-surface'
                        : 'bg-surface-container-lowest text-on-surface border border-outline-variant/50 hover:bg-surface-container'
                    }`}
                  >
                    <span>{cat.name}</span>
                    <span className="ml-1.5 opacity-70 text-xs">({count})</span>
                  </button>
                );
              })}
            </div>

            {/* Section Heading */}
            <div className="flex justify-between items-baseline pt-2">
              <h2 className="text-headline-sm font-bold text-on-surface">Available Canteen Specials</h2>
              <span className="text-label-sm font-bold text-primary">
                {filteredFoods.length} Item{filteredFoods.length !== 1 ? 's' : ''} Listed
              </span>
            </div>

            {/* Error state */}
            {error && (
              <div className="p-4 rounded-xl bg-error-container text-on-error-container border border-error/40 flex items-center gap-2">
                <span className="material-symbols-outlined">error</span>
                <span>{error}</span>
              </div>
            )}

            {/* Food Grid / Feed */}
            {isLoading ? (
              <div className="p-16 text-center bg-surface-container-lowest rounded-3xl border border-outline-variant/30">
                <span className="animate-spin rounded-full h-10 w-10 border-3 border-primary border-t-transparent inline-block mb-3"></span>
                <p className="text-body-md font-medium text-on-surface-variant">
                  Loading fresh dishes from campus canteens...
                </p>
              </div>
            ) : filteredFoods.length === 0 ? (
              <div className="p-16 text-center bg-surface-container-lowest rounded-3xl border border-outline-variant/30 space-y-3">
                <div className="w-16 h-16 rounded-2xl bg-surface-container mx-auto flex items-center justify-center text-outline">
                  <span className="material-symbols-outlined text-3xl">restaurant</span>
                </div>
                <h3 className="text-headline-sm font-bold text-on-surface">No Food Items Found</h3>
                <p className="text-body-sm text-on-surface-variant max-w-md mx-auto">
                  No dishes matched your active filters or search keyword. Try selecting "All Menu" or clearing dietary filters.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredFoods.map((food) => {
                  const isAvailable = food.availability === 'AVAILABLE';
                  const stallName = food.provider?.name || 'Campus Stall';
                  const counterNumber = food.provider?.counterNumber || 'Counter 01';
                  const inCartItem = cartItems.find((i) => i.foodItem.id === food.id);
                  const inCartQty = inCartItem?.quantity || 0;

                  return (
                    <article
                      key={food.id}
                      className={`bg-surface-container-lowest rounded-3xl overflow-hidden card-shadow border transition-all duration-200 flex flex-col justify-between ${
                        isAvailable
                          ? 'border-outline-variant/30 hover:border-outline-variant/70'
                          : 'border-outline-variant/20 opacity-70 bg-surface-container-low/30'
                      }`}
                    >
                      {/* Food Image & Dietary Badges */}
                      <div className="relative w-full h-48 bg-surface-container overflow-hidden">
                        {food.imageUrl ? (
                          <img
                            src={food.imageUrl}
                            alt={food.name}
                            className={`w-full h-full object-cover transition-transform duration-300 hover:scale-105 ${
                              !isAvailable ? 'grayscale contrast-75' : ''
                            }`}
                            onError={(e) => {
                              (e.target as HTMLElement).style.display = 'none';
                            }}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-outline bg-surface-container-high/40">
                            <span className="material-symbols-outlined text-5xl">lunch_dining</span>
                          </div>
                        )}

                        {/* Top Overlay Badges */}
                        <div className="absolute top-3 left-3 flex gap-1.5 flex-wrap">
                          {food.isVeg ? (
                            <span className="px-2.5 py-0.5 rounded-full bg-surface-container-lowest/90 backdrop-blur-md text-emerald-800 text-label-sm font-bold flex items-center gap-1 shadow-xs border border-emerald-300">
                              <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
                              Veg
                            </span>
                          ) : (
                            <span className="px-2.5 py-0.5 rounded-full bg-surface-container-lowest/90 backdrop-blur-md text-rose-800 text-label-sm font-bold flex items-center gap-1 shadow-xs border border-rose-300">
                              <span className="w-2 h-2 rounded-full bg-rose-600"></span>
                              Non-Veg
                            </span>
                          )}

                          {food.isHalal && (
                            <span className="px-2 py-0.5 rounded-full bg-surface-container-lowest/90 backdrop-blur-md text-tertiary text-label-sm font-bold flex items-center gap-1 shadow-xs">
                              <span className="material-symbols-outlined text-xs">verified</span> Halal
                            </span>
                          )}
                        </div>

                        <div className="absolute top-3 right-3">
                          <span className="px-2.5 py-0.5 rounded-full bg-inverse-surface/85 backdrop-blur-md text-inverse-on-surface text-label-sm font-semibold flex items-center gap-1">
                            <span className="material-symbols-outlined text-xs text-secondary-fixed">schedule</span>{' '}
                            {food.prepTimeMin}-{food.prepTimeMax} mins
                          </span>
                        </div>

                        {/* Out of Stock Overlay Ribbon */}
                        {!isAvailable && (
                          <div className="absolute inset-0 bg-on-background/40 backdrop-blur-xs flex items-center justify-center">
                            <span className="px-4 py-1.5 rounded-full bg-error text-on-error font-extrabold text-label-md shadow-lg flex items-center gap-1.5">
                              <span className="material-symbols-outlined text-base">block</span>
                              <span>Unavailable / Sold Out</span>
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Food Details Body */}
                      <div className="p-5 flex flex-col justify-between flex-1 space-y-3">
                        <div>
                          <div className="flex items-center justify-between text-body-sm text-on-surface-variant mb-1">
                            <span className="font-bold text-secondary truncate max-w-[200px]">
                              {stallName} • {counterNumber}
                            </span>
                            {food.category && (
                              <span className="text-label-sm text-outline font-medium">
                                {food.category.name}
                              </span>
                            )}
                          </div>

                          <h3 className="text-headline-sm font-bold text-on-surface leading-tight">
                            {food.name}
                          </h3>

                          {food.description && (
                            <p className="text-body-sm text-on-surface-variant line-clamp-2 mt-1.5">
                              {food.description}
                            </p>
                          )}
                        </div>

                        {/* Dietary Tags & Calories */}
                        <div className="flex items-center gap-2 text-label-sm text-outline flex-wrap">
                          {food.calories && (
                            <span className="bg-surface-container px-2 py-0.5 rounded text-on-surface-variant">
                              {food.calories} kcal
                            </span>
                          )}
                          {food.isVegan && (
                            <span className="bg-surface-container px-2 py-0.5 rounded text-tertiary font-bold">
                              Vegan
                            </span>
                          )}
                          {food.isGlutenFree && (
                            <span className="bg-surface-container px-2 py-0.5 rounded text-secondary font-bold">
                              Gluten-Free
                            </span>
                          )}
                        </div>

                        {/* Price & Cart Stepper / Add Button */}
                        <div className="pt-3 border-t border-surface-container flex items-center justify-between">
                          <div>
                            <span className="text-headline-md font-extrabold text-primary">
                              ₹{Number(food.price).toFixed(0)}
                            </span>
                          </div>

                          {/* Action Button */}
                          {!isAvailable ? (
                            <button
                              disabled
                              className="px-4 py-2 bg-surface-container text-outline rounded-xl text-label-md font-bold cursor-not-allowed"
                            >
                              Unavailable
                            </button>
                          ) : inCartQty > 0 ? (
                            <div className="flex items-center bg-surface-container-low rounded-full p-1 border border-outline-variant/40">
                              <button
                                type="button"
                                onClick={() => updateQuantity(food.id, inCartQty - 1)}
                                className="w-8 h-8 rounded-full bg-surface-container-lowest text-on-surface flex items-center justify-center active:scale-90 transition shadow-xs"
                              >
                                <span className="material-symbols-outlined text-sm">remove</span>
                              </button>
                              <span className="w-8 text-center text-label-md font-bold text-on-surface">
                                {inCartQty}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleAddItem(food, 1)}
                                className="w-8 h-8 rounded-full bg-primary text-on-primary flex items-center justify-center active:scale-90 transition shadow-xs"
                              >
                                <span className="material-symbols-outlined text-sm">add</span>
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleAddItem(food, 1)}
                              className="flex items-center space-x-1.5 px-4 py-2 bg-primary hover:bg-primary-container text-on-primary rounded-xl text-label-md font-bold transition-transform active:scale-95 shadow-sm"
                            >
                              <span className="material-symbols-outlined text-base">add</span>
                              <span>Add to Tray</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: MY ORDERS (LIVE TRACKING) */}
        {activeTab === 'orders' && (
          <CustomerOrdersView onBackToMenu={() => setActiveTab('menu')} />
        )}

        {/* TAB 3: MEAL CARD & PROFILE */}
        {activeTab === 'profile' && (
          <div className="space-y-6">
            <section className="bg-surface-container-lowest rounded-3xl p-6 border border-outline-variant/30 custom-warm-shadow flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-2">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary-fixed text-on-primary-fixed text-label-sm font-bold">
                  <span className="material-symbols-outlined text-base">verified_user</span>
                  <span>Authenticated Campus Profile</span>
                </div>
                <h1 className="text-headline-lg font-bold text-on-surface">
                  {user?.fullName || 'Student'}
                </h1>
                <p className="text-body-md text-on-surface-variant max-w-xl">
                  Email: <strong>{user?.email}</strong> • Connected to{' '}
                  <strong className="text-primary">{selectedLocation?.name || 'Campus Canteen'}</strong>
                </p>
              </div>

              <div className="bg-surface-container-low rounded-2xl p-5 border border-outline-variant/30 flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-secondary-fixed flex items-center justify-center text-on-secondary-fixed">
                  <span className="material-symbols-outlined text-3xl">account_balance_wallet</span>
                </div>
                <div>
                  <span className="text-label-sm font-medium text-on-surface-variant block">Campus Meal Card</span>
                  <span className="text-headline-md font-extrabold text-on-surface">₹ 450.00</span>
                  <span className="text-label-sm text-tertiary font-bold block">1-Tap Auto Recharge Active</span>
                </div>
              </div>
            </section>
          </div>
        )}
      </main>

      {/* Persistent Floating Tray Bar (Stitch Contextual Elevation) */}
      {cartItems.length > 0 && activeTab === 'menu' && (
        <div className="fixed bottom-6 left-0 right-0 z-40 px-4 max-w-xl mx-auto pointer-events-none">
          <div className="pointer-events-auto bg-inverse-surface text-inverse-on-surface rounded-2xl p-3.5 tray-shadow flex items-center justify-between transition-transform transform active:scale-98">
            <div className="flex items-center space-x-3">
              <div className="relative flex items-center justify-center w-11 h-11 rounded-xl bg-primary text-on-primary shadow-sm">
                <span className="material-symbols-outlined text-2xl">shopping_bag</span>
                <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-secondary-container text-on-secondary-container text-label-sm font-extrabold flex items-center justify-center">
                  {totalItems}
                </span>
              </div>
              <div>
                <p className="text-label-md font-bold text-inverse-on-surface">
                  {totalItems} item{totalItems !== 1 ? 's' : ''} in your tray
                </p>
                <p className="text-body-sm text-surface-variant">
                  {cartItems[0]?.foodItem?.provider?.name || 'Campus Canteen'}
                </p>
              </div>
            </div>

            <button
              onClick={() => setIsCheckoutOpen(true)}
              className="flex items-center space-x-2 bg-primary hover:bg-primary-container text-on-primary px-5 py-2.5 rounded-xl text-label-md font-bold transition-all active:scale-95 shadow-md"
            >
              <span>₹{subtotal.toFixed(0)}</span>
              <span className="w-1 h-1 rounded-full bg-on-primary/60"></span>
              <span>View Order</span>
              <span className="material-symbols-outlined text-base">arrow_forward</span>
            </button>
          </div>
        </div>
      )}

      {/* Checkout Modal */}
      <CheckoutModal
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        onOrderSuccess={handleOrderSuccess}
      />

      {/* Order Confirmation Receipt Modal */}
      <OrderConfirmationModal
        isOpen={isConfirmationOpen}
        order={completedOrder}
        onClose={() => setIsConfirmationOpen(false)}
        onViewOrders={() => {
          setIsConfirmationOpen(false);
          setActiveTab('orders');
        }}
      />

      {/* Single Stall Conflict Modal */}
      {pendingItemToAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-on-background/60 backdrop-blur-sm">
          <div className="bg-surface-container-lowest rounded-3xl w-full max-w-md border border-outline-variant/40 shadow-2xl p-6 space-y-4 animate-in fade-in">
            <div className="w-12 h-12 rounded-2xl bg-secondary-container text-on-secondary-container flex items-center justify-center mx-auto">
              <span className="material-symbols-outlined text-2xl">swap_horiz</span>
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-headline-sm font-bold text-on-surface">Start order from new stall?</h3>
              <p className="text-body-sm text-on-surface-variant">
                Your tray currently has items from{' '}
                <strong className="text-on-surface">
                  {cartItems[0]?.foodItem?.provider?.name || 'another stall'}
                </strong>
                . A canteen order can only contain items from one stall at a time.
              </p>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setPendingItemToAdd(null)}
                className="flex-1 py-2.5 px-4 rounded-xl border border-outline-variant/60 hover:bg-surface-container text-label-md font-semibold text-on-surface transition"
              >
                Keep Current Tray
              </button>
              <button
                type="button"
                onClick={handleConfirmSwitchStall}
                className="flex-1 py-2.5 px-4 rounded-xl bg-primary text-on-primary hover:bg-primary-container active:scale-95 text-label-md font-bold transition shadow-sm"
              >
                Clear & Switch
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
