import dotenv from 'dotenv';
dotenv.config();

export const ENV = {
  PORT: process.env.PORT ? parseInt(process.env.PORT, 10) : 5001,
  NODE_ENV: process.env.NODE_ENV || 'development',
  DATABASE_URL: process.env.DATABASE_URL || '',
  JWT_SECRET: process.env.JWT_SECRET || 'dev-secret-campus-canteen-jwt-key-2025',
  CLIENT_URL: process.env.CLIENT_URL || process.env.CORS_ORIGIN || 'http://localhost:5173',
  FRONTEND_URL: process.env.FRONTEND_URL || process.env.CLIENT_URL || 'http://localhost:5173',
  BACKEND_URL: process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 5001}`,

  // Cashfree Payments Configuration
  CASHFREE_APP_ID: process.env.CASHFREE_APP_ID || '',
  CASHFREE_SECRET_KEY: process.env.CASHFREE_SECRET_KEY || '',
  CASHFREE_ENV: (process.env.CASHFREE_ENV?.toUpperCase() === 'PRODUCTION' ? 'PRODUCTION' : 'SANDBOX') as 'SANDBOX' | 'PRODUCTION',
  CASHFREE_API_VERSION: process.env.CASHFREE_API_VERSION || '2023-08-01',
};
