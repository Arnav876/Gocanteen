import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/prisma';

export class ProviderController {
  static async getAllProviders(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const providers = await prisma.provider.findMany({
        where: { status: 'APPROVED' },
        include: {
          location: true,
          foodItems: {
            where: { availability: 'AVAILABLE' },
          },
        },
      });

      res.status(200).json({
        success: true,
        data: providers,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getProviderById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const provider = await prisma.provider.findUnique({
        where: { id },
        include: {
          location: true,
          foodItems: {
            include: { category: true },
          },
        },
      });

      if (!provider) {
        res.status(404).json({ success: false, error: 'Provider not found' });
        return;
      }

      res.status(200).json({
        success: true,
        data: provider,
      });
    } catch (error) {
      next(error);
    }
  }
}
