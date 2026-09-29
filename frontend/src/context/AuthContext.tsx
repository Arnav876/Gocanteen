import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import type { User, Role, Location } from '../types';
import { api } from '../lib/api';

interface AuthContextType {
  user: User | null;
  token: string | null;
  role: Role | null;
  selectedLocation: Location | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<User>;
  register: (payload: {
    email: string;
    password: string;
    fullName: string;
    phoneNumber?: string;
    preferredLocationId?: string;
  }) => Promise<User>;
  logout: () => void;
  setSelectedLocation: (location: Location | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TOKEN_KEY = 'cb_auth_token';
const USER_KEY = 'cb_auth_user';
const LOCATION_KEY = 'cb_selected_location';

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem(USER_KEY);
    return saved ? JSON.parse(saved) : null;
  });

  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem(TOKEN_KEY);
  });

  const [selectedLocation, setSelectedLocationState] = useState<Location | null>(() => {
    const saved = localStorage.getItem(LOCATION_KEY);
    return saved ? JSON.parse(saved) : null;
  });

  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Restore & verify session on startup
  useEffect(() => {
    const initAuth = async () => {
      const storedToken = localStorage.getItem(TOKEN_KEY);
      if (storedToken) {
        try {
          const freshUser = await api.auth.getMe();
          setUser(freshUser);
          localStorage.setItem(USER_KEY, JSON.stringify(freshUser));
          if (freshUser.preferredLocation && !selectedLocation) {
            setSelectedLocationState(freshUser.preferredLocation);
            localStorage.setItem(LOCATION_KEY, JSON.stringify(freshUser.preferredLocation));
          }
        } catch (error) {
          console.warn('Session expired or invalid, clearing local auth token.', error);
          localStorage.removeItem(TOKEN_KEY);
          localStorage.removeItem(USER_KEY);
          setToken(null);
          setUser(null);
        }
      }
      setIsLoading(false);
    };

    initAuth();
  }, []);

  const login = async (email: string, password: string): Promise<User> => {
    const result = await api.auth.login(email, password);
    setToken(result.token);
    setUser(result.user);
    localStorage.setItem(TOKEN_KEY, result.token);
    localStorage.setItem(USER_KEY, JSON.stringify(result.user));

    if (result.user.preferredLocation) {
      setSelectedLocationState(result.user.preferredLocation);
      localStorage.setItem(LOCATION_KEY, JSON.stringify(result.user.preferredLocation));
    }

    return result.user;
  };

  const register = async (payload: {
    email: string;
    password: string;
    fullName: string;
    phoneNumber?: string;
    preferredLocationId?: string;
  }): Promise<User> => {
    const result = await api.auth.register(payload);
    setToken(result.token);
    setUser(result.user);
    localStorage.setItem(TOKEN_KEY, result.token);
    localStorage.setItem(USER_KEY, JSON.stringify(result.user));

    if (result.user.preferredLocation) {
      setSelectedLocationState(result.user.preferredLocation);
      localStorage.setItem(LOCATION_KEY, JSON.stringify(result.user.preferredLocation));
    }

    return result.user;
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    setSelectedLocationState(null);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(LOCATION_KEY);
  };

  const setSelectedLocation = (location: Location | null) => {
    setSelectedLocationState(location);
    if (location) {
      localStorage.setItem(LOCATION_KEY, JSON.stringify(location));
      // If user is logged in, sync preferred location to backend
      if (token) {
        api.users.updatePreferredLocation(location.id).catch((err) => {
          console.warn('Could not sync preferred location to user profile:', err);
        });
      }
    } else {
      localStorage.removeItem(LOCATION_KEY);
    }
  };

  const role = user?.role || null;
  const isAuthenticated = !!token && !!user;

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        role,
        selectedLocation,
        isAuthenticated,
        isLoading,
        login,
        register,
        logout,
        setSelectedLocation,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
