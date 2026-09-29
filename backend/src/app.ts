import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { ENV } from './config/env';

export const createApp = (): Application => {
  const app = express();

  app.use(cors({
    origin: ENV.CORS_ORIGIN,
    credentials: true,
  }));
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Health check route
  app.get('/api/health', (_req: Request, res: Response) => {
    res.status(200).json({
      status: 'ok',
      service: 'CampusBites Backend API',
      timestamp: new Date().toISOString(),
    });
  });

  // Global error handler
  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    console.error('Unhandled error:', err);
    res.status(500).json({
      error: 'Internal Server Error',
      message: err.message,
    });
  });

  return app;
};
