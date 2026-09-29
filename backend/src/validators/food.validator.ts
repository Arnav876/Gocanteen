import { z } from 'zod';

export const createFoodSchema = z.object({
  body: z.object({
    name: z.string().min(2, 'Item name must be at least 2 characters long').max(100),
    description: z.string().max(500).optional().nullable(),
    categoryId: z.string().uuid('Invalid category ID format'),
    price: z.coerce.number().positive('Price must be greater than 0'),
    imageUrl: z.string().optional().nullable(),
    isVeg: z.boolean().optional().default(false),
    isVegan: z.boolean().optional().default(false),
    isHalal: z.boolean().optional().default(false),
    isGlutenFree: z.boolean().optional().default(false),
    prepTimeMin: z.coerce.number().int().min(1).max(120).optional().default(10),
    prepTimeMax: z.coerce.number().int().min(1).max(120).optional().default(15),
    minPrepMinutes: z.coerce.number().int().min(1).max(120).optional(),
    maxPrepMinutes: z.coerce.number().int().min(1).max(120).optional(),
    availability: z.enum(['AVAILABLE', 'UNAVAILABLE']).optional().default('AVAILABLE'),
  }),
});

export const updateFoodSchema = z.object({
  body: z.object({
    name: z.string().min(2, 'Item name must be at least 2 characters long').max(100).optional(),
    description: z.string().max(500).optional().nullable(),
    categoryId: z.string().uuid('Invalid category ID format').optional(),
    price: z.coerce.number().positive('Price must be greater than 0').optional(),
    imageUrl: z.string().optional().nullable(),
    isVeg: z.boolean().optional(),
    isVegan: z.boolean().optional(),
    isHalal: z.boolean().optional(),
    isGlutenFree: z.boolean().optional(),
    prepTimeMin: z.coerce.number().int().min(1).max(120).optional(),
    prepTimeMax: z.coerce.number().int().min(1).max(120).optional(),
    minPrepMinutes: z.coerce.number().int().min(1).max(120).optional(),
    maxPrepMinutes: z.coerce.number().int().min(1).max(120).optional(),
    availability: z.enum(['AVAILABLE', 'UNAVAILABLE']).optional(),
  }),
});
