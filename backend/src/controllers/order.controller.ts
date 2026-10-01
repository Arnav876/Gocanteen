import { Response, NextFunction } from 'express';
import { prisma } from '../config/prisma';
import { AuthenticatedRequest } from '../types';
import { AppError } from '../middlewares/error.middleware';
import { OrderStatus, PaymentStatus, FoodAvailability } from '@prisma/client';

export class OrderController {
  // Customer: Create a new order
  static async createOrder(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const customerId = req.user!.id;
      const { items, pickupPreference = 'ASAP', diningType = 'Takeaway', notes } = req.body;

      if (!items || !Array.isArray(items) || items.length === 0) {
        throw new AppError('Order must contain at least one item.', 400);
      }

      // 1. Extract item IDs and quantities
      const itemMap = new Map<string, { quantity: number; specialInstructions?: string | null }>();
      for (const it of items) {
        const foodId = it.foodId || it.foodItemId;
        if (!foodId) {
          throw new AppError('Each item must specify a valid food ID.', 400);
        }
        const qty = parseInt(it.quantity, 10);
        if (isNaN(qty) || qty <= 0) {
          throw new AppError('Item quantity must be a positive integer.', 400);
        }
        itemMap.set(foodId, {
          quantity: qty,
          specialInstructions: it.specialInstructions?.trim() || null,
        });
      }

      const foodIds = Array.from(itemMap.keys());

      // 2. Fetch food items from PostgreSQL (never trusting frontend prices or provider data)
      const foodRecords = await prisma.foodItem.findMany({
        where: { id: { in: foodIds } },
        include: {
          provider: {
            include: {
              location: true,
            },
          },
        },
      });

      if (foodRecords.length !== foodIds.length) {
        throw new AppError('One or more selected food items do not exist.', 404);
      }

      // 3. Verify availability & single-stall consistency
      const providerIds = new Set<string>();
      for (const food of foodRecords) {
        if (food.availability === FoodAvailability.UNAVAILABLE) {
          throw new AppError(`"${food.name}" is currently out of stock. Please remove it from your tray.`, 400);
        }
        providerIds.add(food.providerId);
      }

      if (providerIds.size > 1) {
        throw new AppError(
          'An order can only contain food items from a single canteen stall. Please order from each stall separately.',
          400
        );
      }

      const provider = foodRecords[0].provider;
      const providerId = provider.id;
      const locationId = provider.locationId;

      // 4. Calculate server-side pricing directly from DB
      let subtotal = 0;
      const orderItemsData: Array<{
        foodItemId: string;
        itemName: string;
        price: number;
        quantity: number;
        specialInstructions?: string | null;
      }> = [];

      for (const food of foodRecords) {
        const itemInfo = itemMap.get(food.id)!;
        const unitPrice = Number(food.price);
        const itemTotal = unitPrice * itemInfo.quantity;
        subtotal += itemTotal;

        orderItemsData.push({
          foodItemId: food.id,
          itemName: food.name, // Snapshot of item name at time of order
          price: unitPrice, // Snapshot of price at time of order
          quantity: itemInfo.quantity,
          specialInstructions: itemInfo.specialInstructions,
        });
      }

      const tax = 0; // Tax or campus fee (can be adjusted)
      const deliveryFee = 0;
      const discount = 0;
      const totalAmount = subtotal + tax + deliveryFee - discount;

      // 5. Generate human-readable order number (e.g. #CB-1048)
      const randomSuffix = Math.floor(1000 + Math.random() * 9000);
      const orderNumber = `#CB-${randomSuffix}`;

      // 6. Execute atomic database transaction
      const createdOrder = await prisma.$transaction(async (tx) => {
        const order = await tx.order.create({
          data: {
            orderNumber,
            customerId,
            providerId,
            locationId,
            status: OrderStatus.PLACED,
            pickupPreference,
            diningType,
            subtotal,
            tax,
            deliveryFee,
            discount,
            totalAmount,
            notes: notes?.trim() || null,
            items: {
              create: orderItemsData.map((oi) => ({
                foodItemId: oi.foodItemId,
                itemName: oi.itemName,
                price: oi.price,
                quantity: oi.quantity,
                specialInstructions: oi.specialInstructions,
              })),
            },
            payment: {
              create: {
                amount: totalAmount,
                status: PaymentStatus.PENDING,
                paymentMethod: 'MEAL_CARD',
              },
            },
          },
          include: {
            items: {
              include: {
                foodItem: true,
              },
            },
            provider: {
              select: {
                id: true,
                name: true,
                counterNumber: true,
                location: true,
              },
            },
            payment: true,
          },
        });

        // Create welcome/order confirmation notification
        await tx.notification.create({
          data: {
            userId: customerId,
            orderId: order.id,
            title: `Order Confirmed: ${order.orderNumber}`,
            message: `Your order for ${order.items.length} item(s) at ${provider.name} has been placed. Total: ₹${totalAmount.toFixed(0)}.`,
            type: 'ORDER_PLACED',
          },
        });

        return order;
      });

      res.status(201).json({
        success: true,
        message: 'Order placed successfully.',
        data: createdOrder,
      });
    } catch (error) {
      next(error);
    }
  }

  // Customer: Get my order history
  static async getMyOrders(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const customerId = req.user!.id;
      const orders = await prisma.order.findMany({
        where: { customerId },
        include: {
          items: {
            include: {
              foodItem: true,
            },
          },
          provider: {
            select: {
              id: true,
              name: true,
              counterNumber: true,
              location: true,
            },
          },
          payment: true,
        },
        orderBy: { createdAt: 'desc' },
      });

      res.status(200).json({
        success: true,
        count: orders.length,
        data: orders,
      });
    } catch (error) {
      next(error);
    }
  }

  // Provider: Get incoming & past orders for stall
  static async getProviderOrders(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const provider = await prisma.provider.findUnique({
        where: { userId: req.user!.id },
      });

      if (!provider) {
        throw new AppError('No provider stall associated with this account.', 404);
      }

      const orders = await prisma.order.findMany({
        where: {
          providerId: provider.id,
          // Only show orders with confirmed / successful payments to the kitchen
          payment: {
            status: PaymentStatus.PAID,
          },
        },
        include: {
          customer: {
            select: {
              id: true,
              fullName: true,
              email: true,
              phoneNumber: true,
            },
          },
          items: {
            include: {
              foodItem: true,
            },
          },
          location: true,
          payment: true,
        },
        orderBy: { createdAt: 'desc' },
      });

      res.status(200).json({
        success: true,
        count: orders.length,
        data: orders,
      });
    } catch (error) {
      next(error);
    }
  }

  // Common: Get single order by ID
  static async getOrderById(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const order = await prisma.order.findUnique({
        where: { id },
        include: {
          customer: {
            select: {
              id: true,
              fullName: true,
              email: true,
              phoneNumber: true,
            },
          },
          items: {
            include: {
              foodItem: true,
            },
          },
          provider: {
            include: {
              location: true,
            },
          },
          location: true,
          payment: true,
        },
      });

      if (!order) {
        res.status(404).json({ success: false, error: 'Order not found.' });
        return;
      }

      // Check authorization (must be the customer, the provider, or an Admin)
      const user = req.user!;
      const isCustomerOwner = order.customerId === user.id;
      const isProviderOwner = user.provider && order.providerId === user.provider.id;
      const isAdmin = user.role === 'ADMIN';

      if (!isCustomerOwner && !isProviderOwner && !isAdmin) {
        throw new AppError('Forbidden: You do not have permission to view this order.', 403);
      }

      res.status(200).json({
        success: true,
        data: order,
      });
    } catch (error) {
      next(error);
    }
  }

  // Provider: Update order status (PLACED -> ACCEPTED -> PREPARING -> READY -> COMPLETED / CANCELLED / REJECTED)
  static async updateOrderStatus(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { status } = req.body;

      const order = await prisma.order.findUnique({
        where: { id },
        include: { provider: true },
      });

      if (!order) {
        throw new AppError('Order not found.', 404);
      }

      const provider = await prisma.provider.findUnique({
        where: { userId: req.user!.id },
      });

      if (!provider || (order.providerId !== provider.id && req.user!.role !== 'ADMIN')) {
        throw new AppError('Forbidden: You can only update orders for your own stall.', 403);
      }

      const updatedOrder = await prisma.order.update({
        where: { id },
        data: {
          status,
          ...(status === OrderStatus.COMPLETED && {
            payment: {
              update: {
                status: PaymentStatus.PAID,
                paidAt: new Date(),
              },
            },
          }),
        },
        include: {
          customer: {
            select: {
              id: true,
              fullName: true,
              email: true,
              phoneNumber: true,
            },
          },
          items: {
            include: {
              foodItem: true,
            },
          },
          provider: true,
          payment: true,
        },
      });

      // Create notification for status change
      await prisma.notification.create({
        data: {
          userId: order.customerId,
          orderId: order.id,
          title: `Order ${order.orderNumber}: ${status}`,
          message: `Your order status at ${provider.name} has been updated to "${status}".`,
          type: `ORDER_${status}`,
        },
      });

      res.status(200).json({
        success: true,
        message: `Order status updated to ${status}.`,
        data: updatedOrder,
      });
    } catch (error) {
      next(error);
    }
  }
}
