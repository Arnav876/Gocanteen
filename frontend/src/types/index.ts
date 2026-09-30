export type Role = 'CUSTOMER' | 'PROVIDER' | 'ADMIN';

export interface Location {
  id: string;
  name: string;
  code?: string | null;
  description?: string | null;
  hallName?: string | null;
  crowdStatus: string;
  avgPrepTimeMin: number;
  isActive: boolean;
  providers?: ProviderInfo[];
}

export interface ProviderInfo {
  id: string;
  name: string;
  status: 'PENDING' | 'APPROVED' | 'SUSPENDED';
  counterNumber?: string | null;
  locationId: string;
  isOpen: boolean;
  rating?: number;
  reviewCount?: number;
  location?: Location;
}

export interface User {
  id: string;
  email: string;
  fullName: string;
  role: Role;
  phoneNumber?: string | null;
  preferredLocationId?: string | null;
  preferredLocation?: Location | null;
  provider?: ProviderInfo | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface AuthResponse {
  success: boolean;
  message?: string;
  data: {
    user: User;
    token: string;
  };
}

export interface Category {
  id: string;
  name: string;
  description?: string | null;
  icon?: string | null;
  sortOrder: number;
  isActive: boolean;
}

export interface FoodItem {
  id: string;
  providerId: string;
  categoryId: string;
  name: string;
  description?: string | null;
  price: number | string;
  imageUrl?: string | null;
  availability: 'AVAILABLE' | 'UNAVAILABLE';
  isVeg: boolean;
  isVegan: boolean;
  isHalal: boolean;
  isGlutenFree: boolean;
  calories?: number | null;
  prepTimeMin: number;
  prepTimeMax: number;
  category?: Category;
  provider?: ProviderInfo;
}

export type OrderStatus = 'PLACED' | 'ACCEPTED' | 'PREPARING' | 'READY' | 'COMPLETED' | 'REJECTED' | 'CANCELLED';
export type PaymentStatus = 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED';

export interface OrderItem {
  id: string;
  orderId: string;
  foodItemId: string;
  itemName: string;
  price: number | string;
  quantity: number;
  specialInstructions?: string | null;
  foodItem?: FoodItem;
}

export interface Payment {
  id: string;
  orderId: string;
  amount: number | string;
  status: PaymentStatus;
  paymentMethod: string;
  transactionId?: string | null;
  paidAt?: string | null;
}

export interface Order {
  id: string;
  orderNumber: string;
  customerId: string;
  customer?: User;
  providerId: string;
  provider?: ProviderInfo;
  locationId: string;
  location?: Location;
  status: OrderStatus;
  pickupPreference: string;
  diningType: string;
  scheduledReadyAt?: string | null;
  subtotal: number | string;
  tax: number | string;
  deliveryFee: number | string;
  discount: number | string;
  totalAmount: number | string;
  notes?: string | null;
  items: OrderItem[];
  payment?: Payment | null;
  createdAt: string;
  updatedAt: string;
}

export interface CartItem {
  foodItem: FoodItem;
  quantity: number;
  specialInstructions?: string;
}

export interface CreateOrderPayload {
  items: Array<{
    foodId: string;
    quantity: number;
    specialInstructions?: string | null;
  }>;
  pickupPreference?: string;
  diningType?: string;
  notes?: string | null;
}

export interface NotificationItem {
  id: string;
  userId: string;
  orderId?: string | null;
  title: string;
  message: string;
  isRead: boolean;
  type: string;
  createdAt: string;
}
