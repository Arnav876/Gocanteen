import { Response, NextFunction } from 'express';
import { UserRole, ProviderStatus } from '@prisma/client';
import { verifyToken } from '../utils/jwt';
import { prisma } from '../config/prisma';
import { AuthenticatedRequest } from '../types';
import { AppError } from './error.middleware';

export const requireAuth = async (
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError('Authentication token required. Please log in.', 401);
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      throw new AppError('Invalid authentication token format.', 401);
    }

    const decoded = verifyToken(token);
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        phoneNumber: true,
        preferredLocationId: true,
        provider: {
          select: {
            id: true,
            name: true,
            status: true,
            locationId: true,
          },
        },
      },
    });

    if (!user) {
      throw new AppError('User account not found. Please log in again.', 401);
    }

    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
};

export const requireRole = (...allowedRoles: UserRole[]) => {
  return (req: AuthenticatedRequest, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new AppError('Authentication required.', 401));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(
        new AppError(
          `Forbidden: Access requires one of [${allowedRoles.join(', ')}] role privileges.`,
          403
        )
      );
    }

    // If role is PROVIDER, check approval status
    if (req.user.role === UserRole.PROVIDER && req.user.provider) {
      if (req.user.provider.status !== ProviderStatus.APPROVED) {
        return next(
          new AppError(
            `Provider account is currently ${req.user.provider.status.toLowerCase()}. Please await admin approval.`,
            403
          )
        );
      }
    }

    next();
  };
};
