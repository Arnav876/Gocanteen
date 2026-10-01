import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/prisma';
import { AuthenticatedRequest } from '../types';
import { AppError } from '../middlewares/error.middleware';
import { razorpayService } from '../services/razorpay.service';
import { OrderStatus, PaymentStatus, FoodAvailability } from '@prisma/client';

export class PaymentController {
  /**
   * Create Payment Order & Razorpay Order
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

        // Calculate server-side pricing directly from database
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

        // Apply tax and packaging calculations
        const tax = Number((subtotal * 0.05).toFixed(2)); // 5% campus food GST
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
                  gateway: 'RAZORPAY',
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

      // Fetch user profile for customer prefill details
      const userProfile = await prisma.user.findUnique({
        where: { id: customerId },
      });

      const customerPhone = userProfile?.phoneNumber || customer.phoneNumber || '9876543210';
      const customerEmail = userProfile?.email || customer.email;
      const customerName = userProfile?.fullName || customer.fullName || 'Student';

      // Total amount in paise for Razorpay
      const amountInPaise = Math.round(Number(order.totalAmount) * 100);

      // Create Razorpay Order
      const razorpayOrder = await razorpayService.createOrder({
        amountInPaise,
        currency: 'INR',
        receipt: order.orderNumber,
        notes: {
          orderId: order.id,
          orderNumber: order.orderNumber,
          customerId: customerId,
          providerId: order.providerId,
        },
      });

      // Save Razorpay order ID on Payment record
      await prisma.payment.update({
        where: { orderId: order.id },
        data: {
          gatewayOrderId: razorpayOrder.id,
        },
      });

      res.status(201).json({
        success: true,
        message: 'Razorpay order created successfully.',
        data: {
          orderId: order.id,
          orderNumber: order.orderNumber,
          amount: Number(order.totalAmount),
          amountInPaise: Number(razorpayOrder.amount),
          currency: razorpayOrder.currency || 'INR',
          razorpayOrderId: razorpayOrder.id,
          razorpayKeyId: razorpayService.getKeyId(),
          customer: {
            name: customerName,
            email: customerEmail,
            phone: customerPhone,
          },
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

      // If payment is PENDING and has Razorpay Order ID, check Razorpay to synchronize
      if (payment && payment.status === PaymentStatus.PENDING && payment.gatewayOrderId) {
        const payments = await razorpayService.fetchOrderPayments(payment.gatewayOrderId);
        const successfulPayment = payments.find((p) => p.status === 'captured' || p.captured === true);

        if (successfulPayment) {
          payment = await prisma.payment.update({
            where: { orderId: order.id },
            data: {
              status: PaymentStatus.PAID,
              paidAt: new Date(successfulPayment.created_at * 1000),
              gatewayPaymentId: successfulPayment.id,
              transactionId: successfulPayment.id,
              paymentMethod: successfulPayment.method ? successfulPayment.method.toUpperCase() : 'UPI',
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
          const failedPayment = payments.find((p) => p.status === 'failed');
          if (failedPayment) {
            payment = await prisma.payment.update({
              where: { orderId: order.id },
              data: {
                status: PaymentStatus.FAILED,
                gatewayPaymentId: failedPayment.id,
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
   * Verify Razorpay Payment Signature
   * POST /api/payments/verify
   */
  static async verifyPayment(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { orderId, razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

      if (!orderId || !razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
        throw new AppError('orderId, razorpay_order_id, razorpay_payment_id, and razorpay_signature are required.', 400);
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

      // 1. Verify Razorpay cryptographic signature
      const isSignatureValid = razorpayService.verifyPaymentSignature({
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature,
      });

      if (!isSignatureValid) {
        console.warn(`[Razorpay verifyPayment] Signature mismatch for Order ${order.orderNumber}`);
        throw new AppError('Payment signature verification failed. Possible tampering detected.', 400);
      }

      // 2. Verify Razorpay order ID matches payment gatewayOrderId
      if (order.payment?.gatewayOrderId && order.payment.gatewayOrderId !== razorpay_order_id) {
        console.warn(`[Razorpay verifyPayment] Order ID mismatch. Expected ${order.payment.gatewayOrderId}, got ${razorpay_order_id}`);
        throw new AppError('Invalid Razorpay Order ID for this order.', 400);
      }

      // 3. Mark payment as PAID in database idempotently
      let updatedPayment = order.payment;
      if (order.payment?.status !== PaymentStatus.PAID) {
        updatedPayment = await prisma.payment.update({
          where: { orderId },
          data: {
            status: PaymentStatus.PAID,
            paidAt: new Date(),
            gatewayOrderId: razorpay_order_id,
            gatewayPaymentId: razorpay_payment_id,
            gatewaySignature: razorpay_signature,
            transactionId: razorpay_payment_id,
            paymentMethod: 'UPI',
          },
        });

        // Create customer confirmation notification
        await prisma.notification.create({
          data: {
            userId: order.customerId,
            orderId: order.id,
            title: `Payment Verified: ${order.orderNumber}`,
            message: `Your payment of ₹${Number(order.totalAmount).toFixed(0)} was successfully verified via Razorpay!`,
            type: 'PAYMENT_SUCCESS',
          },
        });
      }

      res.status(200).json({
        success: true,
        message: 'Razorpay payment successfully verified.',
        data: {
          orderId: order.id,
          orderNumber: order.orderNumber,
          status: updatedPayment?.status || 'PAID',
          isPaid: true,
          gatewayPaymentId: razorpay_payment_id,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Razorpay Webhook Handler
   * POST /api/payments/webhook
   */
  static async handleWebhook(req: Request, res: Response): Promise<void> {
    try {
      const signature = (req.headers['x-razorpay-signature'] as string) || '';
      const rawBody = (req as any).rawBody || JSON.stringify(req.body);

      // Verify webhook signature if secret key is configured
      if (razorpayService.hasWebhookSecret()) {
        const isValid = razorpayService.verifyWebhookSignature(rawBody, signature);
        if (!isValid) {
          console.warn('[Razorpay Webhook] Invalid webhook signature received.');
          res.status(400).json({ status: 'INVALID_SIGNATURE' });
          return;
        }
      } else {
        console.log('[Razorpay Webhook] Webhook secret not set yet. Processing in unverified dev mode.');
      }

      const eventPayload = req.body;
      const event = eventPayload?.event;
      const paymentEntity = eventPayload?.payload?.payment?.entity;
      const orderEntity = eventPayload?.payload?.order?.entity;

      console.log(`[Razorpay Webhook] Received Event: "${event}"`);

      // Resolve Razorpay Order ID & Payment ID
      const rzpOrderId = paymentEntity?.order_id || orderEntity?.id;
      const rzpPaymentId = paymentEntity?.id;
      const customOrderId = paymentEntity?.notes?.orderId || orderEntity?.notes?.orderId;

      let order = null;

      if (rzpOrderId) {
        const paymentRecord = await prisma.payment.findFirst({
          where: { gatewayOrderId: rzpOrderId },
          include: { order: true },
        });
        if (paymentRecord?.order) {
          order = paymentRecord.order;
        }
      }

      if (!order && customOrderId) {
        order = await prisma.order.findUnique({
          where: { id: customOrderId },
          include: { payment: true },
        });
      }

      if (!order) {
        console.warn(`[Razorpay Webhook] Could not match Razorpay event to an internal order. Order ID: ${rzpOrderId || customOrderId}`);
        res.status(200).json({ status: 'IGNORED_ORDER_NOT_FOUND' });
        return;
      }

      const orderId = order.id;
      const currentPayment = await prisma.payment.findUnique({ where: { orderId } });

      // Handle payment captured / order paid events
      if (event === 'payment.captured' || event === 'order.paid') {
        // Idempotency check
        if (currentPayment?.status !== PaymentStatus.PAID) {
          const expectedPaise = Math.round(Number(order.totalAmount) * 100);
          const receivedPaise = paymentEntity?.amount || orderEntity?.amount;

          if (receivedPaise && Math.abs(receivedPaise - expectedPaise) > 100) {
            console.error(
              `[Razorpay Webhook] Amount mismatch! Expected ${expectedPaise} paise, received ${receivedPaise} paise.`
            );
          }

          await prisma.payment.update({
            where: { orderId },
            data: {
              status: PaymentStatus.PAID,
              paidAt: new Date(paymentEntity?.created_at ? paymentEntity.created_at * 1000 : Date.now()),
              gatewayPaymentId: rzpPaymentId || currentPayment?.gatewayPaymentId,
              gatewayOrderId: rzpOrderId || currentPayment?.gatewayOrderId,
              transactionId: rzpPaymentId || currentPayment?.transactionId,
              paymentMethod: paymentEntity?.method ? paymentEntity.method.toUpperCase() : 'UPI',
            },
          });

          // Create notification
          await prisma.notification.create({
            data: {
              userId: order.customerId,
              orderId: order.id,
              title: `Payment Confirmed: ${order.orderNumber}`,
              message: `Your payment of ₹${Number(order.totalAmount).toFixed(0)} is confirmed by Razorpay. Kitchen has received your order!`,
              type: 'PAYMENT_SUCCESS',
            },
          });

          console.log(`[Razorpay Webhook] Successfully marked order ${order.orderNumber} as PAID.`);
        } else {
          console.log(`[Razorpay Webhook] Order ${order.orderNumber} already marked as PAID. Skipping redundant update.`);
        }
      } else if (event === 'payment.failed') {
        if (currentPayment?.status === PaymentStatus.PENDING) {
          await prisma.payment.update({
            where: { orderId },
            data: {
              status: PaymentStatus.FAILED,
              gatewayPaymentId: rzpPaymentId,
            },
          });
          console.log(`[Razorpay Webhook] Marked order ${order.orderNumber} as FAILED.`);
        }
      }

      res.status(200).json({ status: 'OK' });
    } catch (error: any) {
      console.error('[Razorpay Webhook] Processing error:', error);
      res.status(500).json({ error: 'Webhook processing error', details: error.message });
    }
  }
}
