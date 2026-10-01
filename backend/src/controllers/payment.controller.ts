import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/prisma';
import { AuthenticatedRequest } from '../types';
import { AppError } from '../middlewares/error.middleware';
import { cashfreeService } from '../services/cashfree.service';
import { ENV } from '../config/env';
import { OrderStatus, PaymentStatus, FoodAvailability } from '@prisma/client';

export class PaymentController {
  /**
   * Create Payment Order & Cashfree Payment Session
   * POST /api/payments/create-order
   */
  static async createPaymentOrder(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const customer = req.user!;
      const customerId = customer.id;
      const { items, pickupPreference = 'ASAP', diningType = 'Takeaway', notes, orderId } = req.body;

      let order;

      if (orderId) {
        // Retry payment on an existing pending order
        order = await prisma.order.findUnique({
          where: { id: orderId },
          include: {
            customer: true,
            provider: true,
            payment: true,
            items: {
              include: { foodItem: true },
            },
          },
        });

        if (!order) {
          throw new AppError('Order not found.', 404);
        }

        if (order.customerId !== customerId && customer.role !== 'ADMIN') {
          throw new AppError('Forbidden: You can only pay for your own orders.', 403);
        }

        if (order.payment?.status === PaymentStatus.PAID) {
          throw new AppError('This order has already been paid for.', 400);
        }
      } else {
        // Create new order with server-side validation
        if (!items || !Array.isArray(items) || items.length === 0) {
          throw new AppError('Order must contain at least one item.', 400);
        }

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

        // Fetch food items from PostgreSQL (never trust frontend prices)
        const foodRecords = await prisma.foodItem.findMany({
          where: { id: { in: foodIds } },
          include: {
            provider: {
              include: { location: true },
            },
          },
        });

        if (foodRecords.length !== foodIds.length) {
          throw new AppError('One or more selected food items do not exist.', 404);
        }

        // Verify availability & single-stall rule
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

        // Calculate server-side pricing
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
            itemName: food.name,
            price: unitPrice,
            quantity: itemInfo.quantity,
            specialInstructions: itemInfo.specialInstructions,
          });
        }

        // Apply tax and packaging calculations if applicable
        const tax = Number((subtotal * 0.05).toFixed(2)); // 5% campus food GST
        const deliveryFee = 0;
        const discount = Number((subtotal * 0.1).toFixed(2)); // 10% student meal perk
        const packagingFee = diningType === 'Takeaway' ? 10 : 0;
        const totalAmount = Math.max(1, Number((subtotal + tax + packagingFee - discount).toFixed(2)));

        const randomSuffix = Math.floor(1000 + Math.random() * 9000);
        const orderNumber = `#CB-${randomSuffix}`;

        // Create Order + Payment in atomic transaction
        order = await prisma.$transaction(async (tx) => {
          return tx.order.create({
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
              deliveryFee: packagingFee,
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
                  paymentMethod: 'UPI',
                  gateway: 'CASHFREE',
                  currency: 'INR',
                },
              },
            },
            include: {
              items: {
                include: { foodItem: true },
              },
              provider: {
                include: { location: true },
              },
              payment: true,
              customer: true,
            },
          });
        });
      }

      // Fetch user profile for Cashfree customer details
      const userProfile = await prisma.user.findUnique({
        where: { id: customerId },
      });

      const customerPhone = userProfile?.phoneNumber || customer.phoneNumber || '9876543210';
      const customerEmail = userProfile?.email || customer.email;
      const customerName = userProfile?.fullName || customer.fullName || 'Student';

      // Call Cashfree API to initialize payment session
      const returnUrl = `${ENV.FRONTEND_URL}/payment/status?order_id=${order.id}`;
      const notifyUrl = `${ENV.BACKEND_URL}/api/payments/webhook`;

      const cfResponse = await cashfreeService.createOrder({
        orderId: order.id,
        orderAmount: Number(order.totalAmount),
        customerDetails: {
          customer_id: customerId,
          customer_name: customerName,
          customer_email: customerEmail,
          customer_phone: customerPhone,
        },
        returnUrl,
        notifyUrl,
        orderNote: `Canteen Order ${order.orderNumber} - ${order.provider.name}`,
      });

      // Save Cashfree session details on Payment record
      await prisma.payment.update({
        where: { orderId: order.id },
        data: {
          cfPaymentSessionId: cfResponse.payment_session_id,
          gatewayOrderId: cfResponse.cf_order_id,
        },
      });

      res.status(201).json({
        success: true,
        message: 'Payment session created successfully.',
        data: {
          orderId: order.id,
          orderNumber: order.orderNumber,
          amount: Number(order.totalAmount),
          currency: 'INR',
          paymentSessionId: cfResponse.payment_session_id,
          cfOrderId: cfResponse.cf_order_id,
          paymentMode: cashfreeService.getMode(),
          isLiveEnvironment: cashfreeService.hasValidCredentials(),
          order,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Check / Sync Payment Status
   * GET /api/payments/:orderId/status
   */
  static async getPaymentStatus(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { orderId } = req.params;
      const user = req.user!;

      const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: {
          customer: {
            select: { id: true, fullName: true, email: true, phoneNumber: true },
          },
          provider: {
            include: { location: true },
          },
          items: {
            include: { foodItem: true },
          },
          payment: true,
        },
      });

      if (!order) {
        throw new AppError('Order not found.', 404);
      }

      // Authorization Check
      const isCustomerOwner = order.customerId === user.id;
      const isProviderOwner = user.provider && order.providerId === user.provider.id;
      const isAdmin = user.role === 'ADMIN';

      if (!isCustomerOwner && !isProviderOwner && !isAdmin) {
        throw new AppError('Forbidden: You do not have permission to view this payment.', 403);
      }

      let payment = order.payment;

      // If payment is PENDING, query Cashfree to sync latest gateway status
      if (payment && payment.status === PaymentStatus.PENDING) {
        const payments = await cashfreeService.getOrderPayments(order.id);
        const successfulPayment = payments.find((p) => p.payment_status === 'SUCCESS');

        if (successfulPayment) {
          // Reconcile and mark PAID in database
          payment = await prisma.payment.update({
            where: { orderId: order.id },
            data: {
              status: PaymentStatus.PAID,
              paidAt: new Date(),
              gatewayPaymentId: successfulPayment.cf_payment_id,
              transactionId: successfulPayment.cf_payment_id,
              paymentMethod: 'UPI',
            },
          });

          // Create notification for confirmed payment
          await prisma.notification.create({
            data: {
              userId: order.customerId,
              orderId: order.id,
              title: `Payment Received: ${order.orderNumber}`,
              message: `Your payment of ₹${Number(order.totalAmount).toFixed(0)} was verified. Kitchen is now preparing your food.`,
              type: 'PAYMENT_SUCCESS',
            },
          });
        } else {
          const failedPayment = payments.find((p) => p.payment_status === 'FAILED' || p.payment_status === 'CANCELLED');
          if (failedPayment) {
            payment = await prisma.payment.update({
              where: { orderId: order.id },
              data: {
                status: PaymentStatus.FAILED,
                gatewayPaymentId: failedPayment.cf_payment_id,
              },
            });
          }
        }
      }

      res.status(200).json({
        success: true,
        data: {
          orderId: order.id,
          orderNumber: order.orderNumber,
          paymentStatus: payment?.status || 'PENDING',
          paymentAmount: Number(order.totalAmount),
          currency: payment?.currency || 'INR',
          paidAt: payment?.paidAt,
          paymentMethod: payment?.paymentMethod || 'UPI',
          gatewayOrderId: payment?.gatewayOrderId,
          gatewayPaymentId: payment?.gatewayPaymentId,
          order: {
            ...order,
            payment,
          },
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Verify & Reconcile Payment manually on redirect
   * POST /api/payments/verify
   */
  static async verifyPayment(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { orderId } = req.body;
      if (!orderId) {
        throw new AppError('orderId is required for verification.', 400);
      }

      const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: { payment: true, customer: true, provider: true },
      });

      if (!order) {
        throw new AppError('Order not found.', 404);
      }

      if (order.customerId !== req.user!.id && req.user!.role !== 'ADMIN') {
        throw new AppError('Forbidden: Access denied.', 403);
      }

      // Sync with Cashfree
      const payments = await cashfreeService.getOrderPayments(orderId);
      const isSuccess = payments.some((p) => p.payment_status === 'SUCCESS');

      let updatedPayment = order.payment;

      if (isSuccess && order.payment?.status !== PaymentStatus.PAID) {
        const successRecord = payments.find((p) => p.payment_status === 'SUCCESS');
        updatedPayment = await prisma.payment.update({
          where: { orderId },
          data: {
            status: PaymentStatus.PAID,
            paidAt: new Date(),
            gatewayPaymentId: successRecord?.cf_payment_id,
          },
        });
      }

      res.status(200).json({
        success: true,
        message: 'Payment verification complete.',
        data: {
          orderId: order.id,
          orderNumber: order.orderNumber,
          status: updatedPayment?.status || 'PENDING',
          isPaid: updatedPayment?.status === PaymentStatus.PAID,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Cashfree Webhook Handler
   * POST /api/payments/webhook
   */
  static async handleWebhook(req: Request, res: Response): Promise<void> {
    try {
      const signature = req.headers['x-webhook-signature'] as string;
      const timestamp = req.headers['x-webhook-timestamp'] as string;
      const rawBody = (req as any).rawBody || JSON.stringify(req.body);

      // Verify webhook signature if secret key is configured
      if (cashfreeService.hasValidCredentials()) {
        const isValid = cashfreeService.verifyWebhookSignature(signature, timestamp, rawBody);
        if (!isValid) {
          console.warn('[Cashfree Webhook] Invalid webhook signature received.');
          res.status(400).json({ status: 'INVALID_SIGNATURE' });
          return;
        }
      }

      const eventData = req.body;
      const eventType = eventData.type;
      const orderData = eventData.data?.order;
      const paymentData = eventData.data?.payment;

      console.log(`[Cashfree Webhook] Received ${eventType} for Order: ${orderData?.order_id}`);

      if (!orderData?.order_id) {
        res.status(200).json({ status: 'IGNORED_NO_ORDER_ID' });
        return;
      }

      const orderId = orderData.order_id;
      const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: { payment: true, provider: true },
      });

      if (!order) {
        console.warn(`[Cashfree Webhook] Order ${orderId} not found in DB.`);
        res.status(200).json({ status: 'ORDER_NOT_FOUND' });
        return;
      }

      // Handle SUCCESS webhook
      if (eventType === 'PAYMENT_SUCCESS_WEBHOOK' || paymentData?.payment_status === 'SUCCESS') {
        // Idempotent check: if already PAID, do not repeat
        if (order.payment?.status !== PaymentStatus.PAID) {
          // Verify amount matches expected order total
          const receivedAmount = Number(paymentData?.payment_amount || orderData.order_amount);
          const expectedAmount = Number(order.totalAmount);

          if (Math.abs(receivedAmount - expectedAmount) > 1.0) {
            console.error(
              `[Cashfree Webhook] Amount mismatch! Expected ₹${expectedAmount}, received ₹${receivedAmount}`
            );
          }

          await prisma.payment.update({
            where: { orderId },
            data: {
              status: PaymentStatus.PAID,
              paidAt: new Date(paymentData?.payment_time || Date.now()),
              gatewayPaymentId: paymentData?.cf_payment_id,
              transactionId: paymentData?.cf_payment_id,
              paymentMethod: 'UPI',
            },
          });

          // Create customer confirmation notification
          await prisma.notification.create({
            data: {
              userId: order.customerId,
              orderId: order.id,
              title: `Payment Confirmed: ${order.orderNumber}`,
              message: `Your payment of ₹${expectedAmount.toFixed(0)} is confirmed. Kitchen has received your order!`,
              type: 'PAYMENT_SUCCESS',
            },
          });

          console.log(`[Cashfree Webhook] Successfully marked order ${order.orderNumber} as PAID.`);
        }
      } else if (
        eventType === 'PAYMENT_FAILED_WEBHOOK' ||
        eventType === 'PAYMENT_USER_DROPPED_WEBHOOK' ||
        paymentData?.payment_status === 'FAILED'
      ) {
        if (order.payment?.status === PaymentStatus.PENDING) {
          await prisma.payment.update({
            where: { orderId },
            data: {
              status: PaymentStatus.FAILED,
              gatewayPaymentId: paymentData?.cf_payment_id,
            },
          });
          console.log(`[Cashfree Webhook] Marked order ${order.orderNumber} as FAILED.`);
        }
      }

      res.status(200).json({ status: 'OK' });
    } catch (error: any) {
      console.error('[Cashfree Webhook] Processing error:', error);
      res.status(500).json({ error: 'Webhook processing error', details: error.message });
    }
  }
}
