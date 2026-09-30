import { z } from 'zod';
import { OrderStatus } from '@prisma/client';

export const createOrderSchema = z.object({
  body: z.object({
    items: z
      .array(
        z.object({
          foodId: z.string().uuid('Invalid food item ID format').optional(),
          foodItemId: z.string().uuid('Invalid food item ID format').optional(),
          quantity: z.coerce.number().int().min(1, 'Quantity must be at least 1'),
          specialInstructions: z.string().max(250).optional().nullable(),
        })
      )
      .min(1, 'Order must contain at least one food item'),
    pickupPreference: z.string().optional().default('ASAP'),
    diningType: z.string().optional().default('Takeaway'),
    notes: z.string().max(500).optional().nullable(),
  }),
});

export const updateOrderStatusSchema = z.object({
  body: z.object({
    status: z.nativeEnum(OrderStatus, {
      errorMap: () => ({ message: 'Invalid order status value' }),
    }),
  }),
});
