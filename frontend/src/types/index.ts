export type Role = 'CUSTOMER' | 'PROVIDER' | 'ADMIN';

export interface User {
  id: string;
  email: string;
  fullName: string;
  role: Role;
  studentStaffId?: string;
  phoneNumber?: string;
  mealCardBalance: number;
}

export interface CampusLocation {
  id: string;
  name: string;
  hallName: string;
  hallPin: string;
  crowdStatus: 'Normal crowd' | 'Moderate crowd' | 'High crowd';
  avgPrepTimeMin: number;
  isOpen: boolean;
  isFastLane?: boolean;
}

export interface Canteen {
  id: string;
  name: string;
  counterNumber: string;
  locationId: string;
  locationName: string;
  isOpen: boolean;
  prepBufferMin: number;
  rating: number;
  reviewCount: number;
}

export interface MenuItem {
  id: string;
  canteenId: string;
  categoryId: string;
  categoryName: string;
  stallName: string;
  rating: number;
  reviewCount: number;
  name: string;
  description: string;
  price: number;
  calories?: number;
  imageUrl: string;
  prepTimeMin: number;
  prepTimeMax: number;
  isVeg?: boolean;
  isVegan?: boolean;
  isHalal?: boolean;
  isGlutenFree?: boolean;
  isQuickGrab?: boolean;
  isAvailable: boolean;
  stockCount?: number;
  customizationHint?: string;
}

export type OrderStatus = 'RECEIVED' | 'PREPPING' | 'READY' | 'COMPLETED' | 'CANCELLED';

export type PickupPreference = 'asap' | 'break';

export type PaymentMethodType = 'meal_card' | 'wallet' | 'card' | 'qr';

export interface CartItem {
  menuItem: MenuItem;
  quantity: number;
  specialInstructions?: string;
}

export interface OrderItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
  specialInstructions?: string;
  ecoContainer?: boolean;
}

export interface Order {
  id: string;
  orderNumber: string; // e.g. "#CB-104"
  customerName: string;
  studentStaffId: string;
  canteenName: string;
  counterName: string;
  diningType: 'Dine-in' | 'Takeaway';
  trayNumber?: string;
  shelveCubby?: string;
  status: OrderStatus;
  pickupPreference: PickupPreference;
  estimatedReadyTime: string;
  receivedAt: string;
  items: OrderItem[];
  subtotal: number;
  discount: number;
  feeAndTax: number;
  totalAmount: number;
  paymentMethod: PaymentMethodType;
  paymentLabel: string;
}
