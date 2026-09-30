import { Router } from 'express';
import { OrderController } from '../controllers/order.controller';
import { requireAuth, requireRole } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate.middleware';
import { createOrderSchema, updateOrderStatusSchema } from '../validators/order.validator';

const router = Router();

// Customer: Place an order
router.post(
  '/',
  requireAuth,
  requireRole('CUSTOMER', 'ADMIN'),
  validate(createOrderSchema),
  OrderController.createOrder
);

// Customer: View my orders
router.get(
  '/my-orders',
  requireAuth,
  requireRole('CUSTOMER', 'ADMIN'),
  OrderController.getMyOrders
);

// Provider: View stall incoming orders
router.get(
  '/provider',
  requireAuth,
  requireRole('PROVIDER', 'ADMIN'),
  OrderController.getProviderOrders
);

// Get single order details
router.get(
  '/:id',
  requireAuth,
  OrderController.getOrderById
);

// Provider: Update order status
router.patch(
  '/:id/status',
  requireAuth,
  requireRole('PROVIDER', 'ADMIN'),
  validate(updateOrderStatusSchema),
  OrderController.updateOrderStatus
);

export default router;
