import { Router } from 'express';
import { PaymentController } from '../controllers/payment.controller';
import { requireAuth } from '../middlewares/auth.middleware';

const router = Router();

// Public Webhook from Cashfree
router.post('/webhook', PaymentController.handleWebhook);

// Protected Customer / Authenticated Endpoints
router.post('/create-order', requireAuth, PaymentController.createPaymentOrder);
router.get('/:orderId/status', requireAuth, PaymentController.getPaymentStatus);
router.post('/verify', requireAuth, PaymentController.verifyPayment);

export default router;
