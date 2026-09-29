import { Response, NextFunction } from 'express';
import { prisma } from '../config/prisma';
import { AuthenticatedRequest } from '../types';
import { AppError } from '../middlewares/error.middleware';

export class UserController {
  static async getProfile(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: req.user!.id },
        select: {
          id: true,
          email: true,
          fullName: true,
          role: true,
          phoneNumber: true,
          preferredLocationId: true,
          preferredLocation: true,
          provider: true,
          createdAt: true,
        },
      });

      if (!user) {
        throw new AppError('User not found', 404);
      }

      res.status(200).json({
        success: true,
        data: user,
      });
    } catch (error) {
      next(error);
    }
  }

  static async updatePreferredLocation(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { locationId } = req.body;
      if (!locationId) {
        throw new AppError('locationId is required', 400);
      }

      const location = await prisma.location.findUnique({
        where: { id: locationId },
      });

      if (!location) {
        throw new AppError('Location not found', 404);
      }

      const updatedUser = await prisma.user.update({
        where: { id: req.user!.id },
        data: { preferredLocationId: locationId },
        select: {
          id: true,
          email: true,
          fullName: true,
          role: true,
          preferredLocation: true,
        },
      });

      res.status(200).json({
        success: true,
        message: 'Preferred location updated successfully',
        data: updatedUser,
      });
    } catch (error) {
      next(error);
    }
  }
}
