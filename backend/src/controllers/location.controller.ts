import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/prisma';

export class LocationController {
  static async getAllLocations(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const locations = await prisma.location.findMany({
        where: { isActive: true },
        include: {
          providers: {
            where: { status: 'APPROVED' },
            select: {
              id: true,
              name: true,
              counterNumber: true,
              isOpen: true,
              rating: true,
            },
          },
        },
        orderBy: { name: 'asc' },
      });

      res.status(200).json({
        success: true,
        data: locations,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getLocationById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const location = await prisma.location.findUnique({
        where: { id },
        include: {
          providers: {
            where: { status: 'APPROVED' },
            include: {
              foodItems: {
                where: { availability: 'AVAILABLE' },
              },
            },
          },
        },
      });

      if (!location) {
        res.status(404).json({ success: false, error: 'Location not found' });
        return;
      }

      res.status(200).json({
        success: true,
        data: location,
      });
    } catch (error) {
      next(error);
    }
  }
}
