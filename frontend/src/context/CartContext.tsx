import React, { createContext, useContext, useState, useEffect } from 'react';
import type { CartItem, FoodItem } from '../types';

interface CartContextType {
  items: CartItem[];
  activeProviderId: string | null;
  activeProviderName: string | null;
  totalItems: number;
  subtotal: number;
  addToCart: (
    foodItem: FoodItem,
    quantity?: number,
    specialInstructions?: string
  ) => { success: boolean; requiresClearConfirm?: boolean; differentProviderName?: string };
  updateQuantity: (foodId: string, quantity: number) => void;
  removeFromCart: (foodId: string) => void;
  updateSpecialInstructions: (foodId: string, instructions: string) => void;
  clearCart: () => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const CART_STORAGE_KEY = 'campusbites_cart';

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem(CART_STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
    } catch {
      // ignore
    }
  }, [items]);

  const activeProviderId = items.length > 0 ? items[0].foodItem.providerId : null;
  const activeProviderName = items.length > 0 ? (items[0].foodItem.provider?.name || 'Canteen Stall') : null;

  const totalItems = items.reduce((acc, curr) => acc + curr.quantity, 0);
  const subtotal = items.reduce((acc, curr) => acc + Number(curr.foodItem.price) * curr.quantity, 0);

  const addToCart = (
    foodItem: FoodItem,
    quantity = 1,
    specialInstructions = ''
  ): { success: boolean; requiresClearConfirm?: boolean; differentProviderName?: string } => {
    // If cart has items from another provider, notify caller
    if (activeProviderId && activeProviderId !== foodItem.providerId) {
      return {
        success: false,
        requiresClearConfirm: true,
        differentProviderName: activeProviderName || 'another stall',
      };
    }

    setItems((prev) => {
      const existingIndex = prev.findIndex((i) => i.foodItem.id === foodItem.id);
      if (existingIndex > -1) {
        const updated = [...prev];
        updated[existingIndex] = {
          ...updated[existingIndex],
          quantity: updated[existingIndex].quantity + quantity,
          specialInstructions: specialInstructions || updated[existingIndex].specialInstructions,
        };
        return updated;
      } else {
        return [...prev, { foodItem, quantity, specialInstructions }];
      }
    });

    return { success: true };
  };

  const updateQuantity = (foodId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(foodId);
      return;
    }
    setItems((prev) =>
      prev.map((item) => (item.foodItem.id === foodId ? { ...item, quantity } : item))
    );
  };

  const removeFromCart = (foodId: string) => {
    setItems((prev) => prev.filter((item) => item.foodItem.id !== foodId));
  };

  const updateSpecialInstructions = (foodId: string, instructions: string) => {
    setItems((prev) =>
      prev.map((item) =>
        item.foodItem.id === foodId ? { ...item, specialInstructions: instructions } : item
      )
    );
  };

  const clearCart = () => {
    setItems([]);
  };

  return (
    <CartContext.Provider
      value={{
        items,
        activeProviderId,
        activeProviderName,
        totalItems,
        subtotal,
        addToCart,
        updateQuantity,
        removeFromCart,
        updateSpecialInstructions,
        clearCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = (): CartContextType => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};
