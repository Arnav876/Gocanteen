import axios from 'axios';
import type { AxiosError } from 'axios';
import type { AuthResponse, Location, Category, FoodItem, User } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL 
  ? `${import.meta.env.VITE_API_URL.replace(/\/$/, '')}/api`
  : 'http://localhost:5001/api';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

// Attach Authorization Bearer token if present
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('cb_auth_token');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Format API error messages cleanly
export const parseApiError = (error: unknown): string => {
  if (axios.isAxiosError(error)) {
    const axiosErr = error as AxiosError<{ error?: string; message?: string; details?: Array<{ message: string }> }>;
    if (!axiosErr.response) {
      return 'Unable to connect to the server. Please check your connection or ensure backend is running.';
    }
    if (axiosErr.response.data?.error) {
      if (axiosErr.response.data.details && axiosErr.response.data.details.length > 0) {
        return axiosErr.response.data.details.map((d) => d.message).join('. ');
      }
      return axiosErr.response.data.error;
    }
    if (axiosErr.response.data?.message) {
      return axiosErr.response.data.message;
    }
    if (axiosErr.response.status === 401) {
      return 'Invalid email or password.';
    }
    if (axiosErr.response.status === 403) {
      return 'Access forbidden. You do not have permission for this role.';
    }
  }
  return 'An unexpected error occurred. Please try again.';
};

export const api = {
  // Health
  health: {
    check: async () => {
      const res = await apiClient.get('/health');
      return res.data;
    },
  },

  // Auth
  auth: {
    login: async (email: string, password: string): Promise<AuthResponse['data']> => {
      const res = await apiClient.post<AuthResponse>('/auth/login', { email, password });
      return res.data.data;
    },
    register: async (payload: {
      email: string;
      password: string;
      fullName: string;
      phoneNumber?: string;
      preferredLocationId?: string;
    }): Promise<AuthResponse['data']> => {
      const res = await apiClient.post<AuthResponse>('/auth/register', payload);
      return res.data.data;
    },
    getMe: async (): Promise<User> => {
      const res = await apiClient.get<{ success: boolean; data: User }>('/auth/me');
      return res.data.data;
    },
  },

  // Locations
  locations: {
    getAll: async (): Promise<Location[]> => {
      const res = await apiClient.get<{ success: boolean; data: Location[] }>('/locations');
      return res.data.data;
    },
    getById: async (id: string): Promise<Location> => {
      const res = await apiClient.get<{ success: boolean; data: Location }>(`/locations/${id}`);
      return res.data.data;
    },
  },

  // Categories
  categories: {
    getAll: async (): Promise<Category[]> => {
      const res = await apiClient.get<{ success: boolean; data: Category[] }>('/categories');
      return res.data.data;
    },
  },

  // Food Items
  foods: {
    getAll: async (params?: Record<string, string | boolean | undefined>): Promise<FoodItem[]> => {
      const res = await apiClient.get<{ success: boolean; data: FoodItem[] }>('/foods', { params });
      return res.data.data;
    },
    getById: async (id: string): Promise<FoodItem> => {
      const res = await apiClient.get<{ success: boolean; data: FoodItem }>(`/foods/${id}`);
      return res.data.data;
    },
  },

  // Users
  users: {
    updatePreferredLocation: async (locationId: string): Promise<User> => {
      const res = await apiClient.patch<{ success: boolean; data: User }>('/users/preferred-location', {
        locationId,
      });
      return res.data.data;
    },
  },
};
