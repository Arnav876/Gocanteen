import axios, { AxiosInstance } from 'axios';
import crypto from 'crypto';
import { ENV } from '../config/env';

export interface CashfreeCustomerDetails {
  customer_id: string;
  customer_name?: string;
  customer_email: string;
  customer_phone: string;
}

export interface CashfreeCreateOrderParams {
  orderId: string;
  orderAmount: number;
  orderCurrency?: string;
  customerDetails: CashfreeCustomerDetails;
  returnUrl: string;
  notifyUrl?: string;
  orderNote?: string;
}

export interface CashfreeOrderResponse {
  cf_order_id: string;
  order_id: string;
  order_status: 'ACTIVE' | 'PAID' | 'EXPIRED';
  payment_session_id: string;
  order_amount: number;
  order_currency: string;
  payment_methods?: string;
}

export interface CashfreePaymentRecord {
  cf_payment_id: string;
  order_id: string;
  payment_status: 'SUCCESS' | 'FAILED' | 'PENDING' | 'USER_DROPPED' | 'CANCELLED';
  payment_amount: number;
  payment_currency: string;
  payment_time: string;
  payment_method: any;
  payment_message?: string;
  bank_reference?: string;
}

export class CashfreeService {
  private client: AxiosInstance;
  private isConfigured: boolean;

  constructor() {
    const isProd = ENV.CASHFREE_ENV === 'PRODUCTION';
    const baseURL = isProd
      ? 'https://api.cashfree.com/pg'
      : 'https://sandbox.cashfree.com/pg';

    this.isConfigured = Boolean(
      ENV.CASHFREE_APP_ID &&
      ENV.CASHFREE_SECRET_KEY &&
      !ENV.CASHFREE_APP_ID.includes('TEST_APP_ID') &&
      !ENV.CASHFREE_APP_ID.includes('your_cashfree')
    );

    this.client = axios.create({
      baseURL,
      headers: {
        'x-client-id': ENV.CASHFREE_APP_ID,
        'x-client-secret': ENV.CASHFREE_SECRET_KEY,
        'x-api-version': ENV.CASHFREE_API_VERSION,
        'Content-Type': 'application/json',
      },
      timeout: 15000,
    });
  }

  public getMode(): 'SANDBOX' | 'PRODUCTION' {
    return ENV.CASHFREE_ENV;
  }

  public hasValidCredentials(): boolean {
    return this.isConfigured;
  }

  /**
   * Create a Cashfree Payment Order
   */
  public async createOrder(params: CashfreeCreateOrderParams): Promise<CashfreeOrderResponse> {
    const {
      orderId,
      orderAmount,
      orderCurrency = 'INR',
      customerDetails,
      returnUrl,
      notifyUrl,
      orderNote,
    } = params;

    // Ensure phone number has at least 10 digits
    let phone = customerDetails.customer_phone?.replace(/\D/g, '') || '9876543210';
    if (phone.length < 10) {
      phone = '9876543210';
    } else if (phone.length > 10) {
      phone = phone.slice(-10);
    }

    const payload = {
      order_id: orderId,
      order_amount: Number(orderAmount.toFixed(2)),
      order_currency: orderCurrency,
      customer_details: {
        customer_id: customerDetails.customer_id,
        customer_name: customerDetails.customer_name || 'Campus Student',
        customer_email: customerDetails.customer_email,
        customer_phone: phone,
      },
      order_meta: {
        return_url: returnUrl,
        notify_url: notifyUrl || `${ENV.BACKEND_URL}/api/payments/webhook`,
        payment_methods: 'upi,card,netbanking,app',
      },
      order_note: orderNote || `Gocanteen Order ${orderId}`,
    };

    if (!this.isConfigured) {
      // Provide an official Sandbox simulation session for dev/testing when API keys are pending
      console.log(`[CashfreeService] Using Sandbox Simulator mode for order ${orderId} (₹${orderAmount})`);
      return {
        cf_order_id: `cf_mock_${Date.now()}`,
        order_id: orderId,
        order_status: 'ACTIVE',
        payment_session_id: `session_sandbox_mock_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        order_amount: Number(orderAmount.toFixed(2)),
        order_currency: orderCurrency,
      };
    }

    try {
      const response = await this.client.post<CashfreeOrderResponse>('/orders', payload);
      return response.data;
    } catch (error: any) {
      console.error('[CashfreeService] createOrder Error:', error.response?.data || error.message);
      const errMsg = error.response?.data?.message || error.message || 'Failed to create Cashfree order.';
      throw new Error(`Cashfree Order Error: ${errMsg}`);
    }
  }

  /**
   * Fetch order status from Cashfree
   */
  public async getOrder(orderId: string): Promise<CashfreeOrderResponse | null> {
    if (!this.isConfigured) {
      return {
        cf_order_id: `cf_mock_${orderId}`,
        order_id: orderId,
        order_status: 'ACTIVE',
        payment_session_id: `session_mock_${orderId}`,
        order_amount: 100,
        order_currency: 'INR',
      };
    }

    try {
      const response = await this.client.get<CashfreeOrderResponse>(`/orders/${orderId}`);
      return response.data;
    } catch (error: any) {
      console.error(`[CashfreeService] getOrder Error for ${orderId}:`, error.response?.data || error.message);
      return null;
    }
  }

  /**
   * Fetch payments for an order from Cashfree
   */
  public async getOrderPayments(orderId: string): Promise<CashfreePaymentRecord[]> {
    if (!this.isConfigured) {
      return [];
    }

    try {
      const response = await this.client.get<CashfreePaymentRecord[]>(`/orders/${orderId}/payments`);
      return response.data || [];
    } catch (error: any) {
      console.error(`[CashfreeService] getOrderPayments Error for ${orderId}:`, error.response?.data || error.message);
      return [];
    }
  }

  /**
   * Verify Webhook Signature from Cashfree
   * Formula: HMAC_SHA256(timestamp + rawBody, CASHFREE_SECRET_KEY) in Base64
   */
  public verifyWebhookSignature(signature: string, timestamp: string, rawBody: string): boolean {
    if (!ENV.CASHFREE_SECRET_KEY || !signature || !timestamp) {
      return false;
    }

    try {
      const signatureData = `${timestamp}${rawBody}`;
      const expectedSignature = crypto
        .createHmac('sha256', ENV.CASHFREE_SECRET_KEY)
        .update(signatureData)
        .digest('base64');

      return crypto.timingSafeEqual(
        Buffer.from(signature, 'utf8'),
        Buffer.from(expectedSignature, 'utf8')
      );
    } catch (err) {
      console.error('[CashfreeService] Webhook signature verification error:', err);
      return false;
    }
  }
}

export const cashfreeService = new CashfreeService();
