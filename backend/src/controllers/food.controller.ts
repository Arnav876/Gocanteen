import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/prisma';
import { AuthenticatedRequest } from '../types';
import { AppError } from '../middlewares/error.middleware';
import { FoodAvailability } from '@prisma/client';

export class FoodController {
  // Public - Browse all available foods
  static async getAllFoods(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { categoryId, providerId, locationId, isVeg, search } = req.query;

      const whereClause: any = {
        availability: FoodAvailability.AVAILABLE,
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

  // Provider Protected - Get all items belonging to the authenticated provider's stall
  static async getMyMenu(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const provider = await prisma.provider.findUnique({
        where: { userId: req.user!.id },
      });

      if (!provider) {
        throw new AppError('No provider stall associated with this account.', 404);
      }

      const items = await prisma.foodItem.findMany({
        where: { providerId: provider.id },
        include: {
          category: true,
          provider: {
            select: {
              id: true,
              name: true,
              counterNumber: true,
              locationId: true,
              location: true,
            },
          },
        },
        orderBy: [{ category: { sortOrder: 'asc' } }, { createdAt: 'desc' }],
      });

      res.status(200).json({
        success: true,
        count: items.length,
        data: items,
      });
    } catch (error) {
      next(error);
    }
  }

  // Public/Protected - Get food by ID
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
        res.status(404).json({ success: false, error: 'Food item not found.' });
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

  // Provider Protected - Create food item for the authenticated provider's stall
  static async createFood(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const provider = await prisma.provider.findUnique({
        where: { userId: req.user!.id },
      });

      if (!provider) {
        throw new AppError('No provider stall associated with this account. Only registered providers can add food items.', 403);
      }

      const {
        name,
        description,
        categoryId,
        price,
        imageUrl,
        isVeg,
        isVegan,
        isHalal,
        isGlutenFree,
        prepTimeMin,
        prepTimeMax,
        minPrepMinutes,
        maxPrepMinutes,
        availability,
      } = req.body;

      // Verify Category
      const category = await prisma.category.findUnique({
        where: { id: categoryId },
      });

      if (!category) {
        throw new AppError('Invalid category ID. Selected category does not exist.', 404);
      }

      const foodItem = await prisma.foodItem.create({
        data: {
          providerId: provider.id, // Authenticated provider identity
          categoryId,
          name: name.trim(),
          description: description?.trim() || null,
          price,
          imageUrl: imageUrl?.trim() || null,
          isVeg: isVeg ?? false,
          isVegan: isVegan ?? false,
          isHalal: isHalal ?? false,
          isGlutenFree: isGlutenFree ?? false,
          prepTimeMin: minPrepMinutes ?? prepTimeMin ?? 10,
          prepTimeMax: maxPrepMinutes ?? prepTimeMax ?? 15,
          availability: availability || FoodAvailability.AVAILABLE,
        },
        include: {
          category: true,
        },
      });

      res.status(201).json({
        success: true,
        message: 'Food item created successfully.',
        data: foodItem,
      });
    } catch (error) {
      next(error);
    }
  }

  // Provider Protected - Update food item
  static async updateFood(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;

      const existingFood = await prisma.foodItem.findUnique({
        where: { id },
        include: { provider: true },
      });

      if (!existingFood) {
        throw new AppError('Food item not found.', 404);
      }

      // Check ownership (or Admin)
      const provider = await prisma.provider.findUnique({
        where: { userId: req.user!.id },
      });

      if (!provider || (existingFood.providerId !== provider.id && req.user!.role !== 'ADMIN')) {
        throw new AppError('Forbidden: You can only edit food items belonging to your own stall.', 403);
      }

      const {
        name,
        description,
        categoryId,
        price,
        imageUrl,
        isVeg,
        isVegan,
        isHalal,
        isGlutenFree,
        prepTimeMin,
        prepTimeMax,
        minPrepMinutes,
        maxPrepMinutes,
        availability,
      } = req.body;

      if (categoryId) {
        const category = await prisma.category.findUnique({
          where: { id: categoryId },
        });
        if (!category) {
          throw new AppError('Invalid category ID. Selected category does not exist.', 404);
        }
      }

      const updatedFood = await prisma.foodItem.update({
        where: { id },
        data: {
          ...(name !== undefined && { name: name.trim() }),
          ...(description !== undefined && { description: description?.trim() || null }),
          ...(categoryId !== undefined && { categoryId }),
          ...(price !== undefined && { price }),
          ...(imageUrl !== undefined && { imageUrl: imageUrl?.trim() || null }),
          ...(isVeg !== undefined && { isVeg }),
          ...(isVegan !== undefined && { isVegan }),
          ...(isHalal !== undefined && { isHalal }),
          ...(isGlutenFree !== undefined && { isGlutenFree }),
          ...((minPrepMinutes !== undefined || prepTimeMin !== undefined) && {
            prepTimeMin: minPrepMinutes ?? prepTimeMin,
          }),
          ...((maxPrepMinutes !== undefined || prepTimeMax !== undefined) && {
            prepTimeMax: maxPrepMinutes ?? prepTimeMax,
          }),
          ...(availability !== undefined && { availability }),
        },
        include: {
          category: true,
        },
      });

      res.status(200).json({
        success: true,
        message: 'Food item updated successfully.',
        data: updatedFood,
      });
    } catch (error) {
      next(error);
    }
  }

  // Provider Protected - Toggle Food Availability (AVAILABLE <-> UNAVAILABLE)
  static async toggleAvailability(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;

      const existingFood = await prisma.foodItem.findUnique({
        where: { id },
      });

      if (!existingFood) {
        throw new AppError('Food item not found.', 404);
      }

      const provider = await prisma.provider.findUnique({
        where: { userId: req.user!.id },
      });

      if (!provider || (existingFood.providerId !== provider.id && req.user!.role !== 'ADMIN')) {
        throw new AppError('Forbidden: You can only modify availability for items from your own stall.', 403);
      }

      const newAvailability =
        existingFood.availability === FoodAvailability.AVAILABLE
          ? FoodAvailability.UNAVAILABLE
          : FoodAvailability.AVAILABLE;

      const updatedFood = await prisma.foodItem.update({
        where: { id },
        data: { availability: newAvailability },
        include: {
          category: true,
        },
      });

      res.status(200).json({
        success: true,
        message: `Food item is now ${newAvailability === FoodAvailability.AVAILABLE ? 'Available' : 'Out of Stock'}.`,
        data: updatedFood,
      });
    } catch (error) {
      next(error);
    }
  }

  // Provider Protected - Delete food item
  static async deleteFood(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;

      const existingFood = await prisma.foodItem.findUnique({
        where: { id },
      });

      if (!existingFood) {
        throw new AppError('Food item not found.', 404);
      }

      const provider = await prisma.provider.findUnique({
        where: { userId: req.user!.id },
      });

      if (!provider || (existingFood.providerId !== provider.id && req.user!.role !== 'ADMIN')) {
        throw new AppError('Forbidden: You can only delete food items belonging to your own stall.', 403);
      }

      await prisma.foodItem.delete({
        where: { id },
      });

      res.status(200).json({
        success: true,
        message: 'Food item deleted successfully.',
      });
    } catch (error) {
      next(error);
    }
  }
}
