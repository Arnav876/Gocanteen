import Razorpay from 'razorpay';
import crypto from 'crypto';
import { ENV } from '../config/env';

export interface RazorpayCreateOrderParams {
  amountInPaise: number;
  currency?: string;
  receipt?: string;
  notes?: Record<string, string>;
}

export interface RazorpayOrderResult {
  id: string;
  entity: string;
  amount: number | string;
  amount_paid: number | string;
  amount_due: number | string;
  currency: string;
  receipt?: string | null;
  status: string;
  attempts: number;
  notes?: Record<string, any>;
  created_at: number;
}

export interface RazorpayPaymentResult {
  id: string;
  entity: string;
  amount: number | string;
  currency: string;
  status: string;
  order_id: string;
  invoice_id?: string | null;
  international: boolean;
  method: string;
  amount_refunded: number | string;
  refund_status?: string | null;
  captured: boolean;
  description?: string;
  card_id?: string | null;
  bank?: string | null;
  wallet?: string | null;
  vpa?: string | null;
  email?: string;
  contact?: string;
  notes?: Record<string, any>;
  fee?: number | string;
  tax?: number | string;
  error_code?: string | null;
  error_description?: string | null;
  created_at: number;
}

export interface VerifySignatureParams {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

export class RazorpayService {
  private instance: Razorpay | null = null;
  private isConfigured: boolean;

  constructor() {
    this.isConfigured = Boolean(
      ENV.RAZORPAY_KEY_ID &&
      ENV.RAZORPAY_KEY_SECRET &&
      !ENV.RAZORPAY_KEY_ID.includes('your_') &&
      !ENV.RAZORPAY_KEY_SECRET.includes('your_')
    );

    if (this.isConfigured) {
      this.instance = new Razorpay({
        key_id: ENV.RAZORPAY_KEY_ID,
        key_secret: ENV.RAZORPAY_KEY_SECRET,
      });
    }
  }

  public hasValidCredentials(): boolean {
    return this.isConfigured && this.instance !== null;
  }

  public getKeyId(): string {
    return ENV.RAZORPAY_KEY_ID;
  }

  public hasWebhookSecret(): boolean {
    return Boolean(
      ENV.RAZORPAY_WEBHOOK_SECRET &&
      ENV.RAZORPAY_WEBHOOK_SECRET.trim().length > 0 &&
      !ENV.RAZORPAY_WEBHOOK_SECRET.includes('your_')
    );
  }

  /**
   * Create an authoritative Order in Razorpay
   */
  public async createOrder(params: RazorpayCreateOrderParams): Promise<RazorpayOrderResult> {
    const { amountInPaise, currency = 'INR', receipt, notes } = params;

    if (!this.instance) {
      throw new Error('Razorpay is not configured. Please check RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET.');
    }

    try {
      const order = await this.instance.orders.create({
        amount: Math.round(amountInPaise),
        currency,
        receipt: receipt?.substring(0, 40),
        notes: notes || {},
      });

      return order as unknown as RazorpayOrderResult;
    } catch (error: any) {
      console.error('[RazorpayService] createOrder Error:', error?.error || error?.message || error);
      const errMsg = error?.error?.description || error?.message || 'Failed to create Razorpay order.';
      throw new Error(`Razorpay Order Error: ${errMsg}`);
    }
  }

  /**
   * Fetch an Order from Razorpay by Order ID
   */
  public async fetchOrder(orderId: string): Promise<RazorpayOrderResult | null> {
    if (!this.instance) return null;
    try {
      const order = await this.instance.orders.fetch(orderId);
      return order as unknown as RazorpayOrderResult;
    } catch (error: any) {
      console.error(`[RazorpayService] fetchOrder Error for ${orderId}:`, error?.error || error?.message);
      return null;
    }
  }

  /**
   * Fetch a Payment from Razorpay by Payment ID
   */
  public async fetchPayment(paymentId: string): Promise<RazorpayPaymentResult | null> {
    if (!this.instance) return null;
    try {
      const payment = await this.instance.payments.fetch(paymentId);
      return payment as unknown as RazorpayPaymentResult;
    } catch (error: any) {
      console.error(`[RazorpayService] fetchPayment Error for ${paymentId}:`, error?.error || error?.message);
      return null;
    }
  }

  /**
   * Fetch all payments associated with a Razorpay Order
   */
  public async fetchOrderPayments(razorpayOrderId: string): Promise<RazorpayPaymentResult[]> {
    if (!this.instance) return [];
    try {
      const payments = await this.instance.orders.fetchPayments(razorpayOrderId);
      return (payments.items || []) as unknown as RazorpayPaymentResult[];
    } catch (error: any) {
      console.error(`[RazorpayService] fetchOrderPayments Error for ${razorpayOrderId}:`, error?.error || error?.message);
      return [];
    }
  }

  /**
   * Verify Checkout Signature
   * Signature formula: HMAC_SHA256(razorpay_order_id + "|" + razorpay_payment_id, RAZORPAY_KEY_SECRET) in hex
   */
  public verifyPaymentSignature(params: VerifySignatureParams): boolean {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = params;

    if (!ENV.RAZORPAY_KEY_SECRET || !razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return false;
    }

    try {
      const body = `${razorpay_order_id}|${razorpay_payment_id}`;
      const expectedSignature = crypto
        .createHmac('sha256', ENV.RAZORPAY_KEY_SECRET)
        .update(body)
        .digest('hex');

      const expectedBuf = Buffer.from(expectedSignature, 'utf8');
      const receivedBuf = Buffer.from(razorpay_signature, 'utf8');

      if (expectedBuf.length !== receivedBuf.length) {
        return false;
      }

      return crypto.timingSafeEqual(expectedBuf, receivedBuf);
    } catch (err) {
      console.error('[RazorpayService] verifyPaymentSignature Error:', err);
      return false;
    }
  }

  /**
   * Verify Webhook Signature
   * Signature formula: HMAC_SHA256(rawBody, RAZORPAY_WEBHOOK_SECRET) in hex
   */
  public verifyWebhookSignature(rawBody: string, signature: string): boolean {
    if (!this.hasWebhookSecret() || !signature || !rawBody) {
      return false;
    }

    try {
      const expectedSignature = crypto
        .createHmac('sha256', ENV.RAZORPAY_WEBHOOK_SECRET)
        .update(rawBody)
        .digest('hex');

      const expectedBuf = Buffer.from(expectedSignature, 'utf8');
      const receivedBuf = Buffer.from(signature, 'utf8');

      if (expectedBuf.length !== receivedBuf.length) {
        return false;
      }

      return crypto.timingSafeEqual(expectedBuf, receivedBuf);
    } catch (err) {
      console.error('[RazorpayService] verifyWebhookSignature Error:', err);
      return false;
    }
  }
}

export const razorpayService = new RazorpayService();
