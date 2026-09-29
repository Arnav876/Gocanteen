import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/prisma';

export class FoodController {
  static async getAllFoods(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { categoryId, providerId, locationId, isVeg, search } = req.query;

      const whereClause: any = {
        availability: 'AVAILABLE',
      };

      if (categoryId) {
        whereClause.categoryId = String(categoryId);
      }

      if (providerId) {
        whereClause.providerId = String(providerId);
      }

      if (locationId) {
        whereClause.provider = {
          locationId: String(locationId),
        };
      }

      if (isVeg !== undefined) {
        whereClause.isVeg = isVeg === 'true';
      }

      if (search) {
        whereClause.OR = [
          { name: { contains: String(search), mode: 'insensitive' } },
          { description: { contains: String(search), mode: 'insensitive' } },
        ];
      }

      const foods = await prisma.foodItem.findMany({
        where: whereClause,
        include: {
          category: true,
          provider: {
            include: {
              location: true,
            },
          },
        },
        orderBy: { name: 'asc' },
      });

      res.status(200).json({
        success: true,
        count: foods.length,
        data: foods,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getFoodById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const food = await prisma.foodItem.findUnique({
        where: { id },
        include: {
          category: true,
          provider: {
            include: {
              location: true,
            },
          },
        },
      });

      if (!food) {
        res.status(404).json({ success: false, error: 'Food item not found' });
        return;
      }

      res.status(200).json({
        success: true,
        data: food,
      });
    } catch (error) {
      next(error);
    }
  }
}
