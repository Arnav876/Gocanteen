import { prisma } from '../config/prisma';
import crypto from 'crypto';
import { ENV } from '../config/env';

const API_BASE = 'http://localhost:5001/api';

async function req(url: string, options: RequestInit = {}) {
  const res = await fetch(`${API_BASE}${url}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  const data = await res.json();
  return { status: res.status, data };
}

async function runPaymentSuite() {
  console.log('=====================================================');
  console.log('STARTING RAZORPAY UPI PAYMENT INTEGRATION TEST SUITE');
  console.log('=====================================================\n');

  // 1. Health check
  console.log('👉 [TEST 1] Backend Health Check...');
  const healthRes = await req('/health');
  if (healthRes.data.status !== 'ok') throw new Error('Backend health check failed');
  console.log('   ✅ PASS: Backend is healthy.\n');

  // 2. Authenticate Customer
  console.log('👉 [TEST 2] Authenticate Student Customer (student@campusbites.edu)...');
  const custRes = await req('/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      email: 'student@campusbites.edu',
      password: 'StudentPassword123!',
    }),
  });
  const customerToken = custRes.data.data.token;
  const customerId = custRes.data.data.user.id;
  console.log(`   Authenticated Customer ID: ${customerId}`);
  console.log('   ✅ PASS: Customer logged in.\n');

  // 3. Authenticate Provider 1 (Fresh Bites)
  console.log('👉 [TEST 3] Authenticate Provider (freshbites@campusbites.edu)...');
  const provRes = await req('/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      email: 'freshbites@campusbites.edu',
      password: 'ProviderPassword123!',
    }),
  });
  const providerToken = provRes.data.data.token;
  const providerId = provRes.data.data.user.provider.id;
  console.log(`   Authenticated Provider ID: ${providerId}`);
  console.log('   ✅ PASS: Provider logged in.\n');

  // 4. Fetch available food items
  console.log('👉 [TEST 4] Fetch Available Dishes...');
  const foodsRes = await req('/foods');
  const provFoods = foodsRes.data.data.filter(
    (f: any) => f.providerId === providerId && f.availability === 'AVAILABLE'
  );
  if (provFoods.length === 0) throw new Error('No foods available for provider');
  console.log(`   Found ${provFoods.length} available dishes at stall.`);
  console.log('   ✅ PASS: Food items retrieved.\n');

  // 5. Create Payment Order (POST /api/payments/create-order)
  console.log('👉 [TEST 5] Initiate UPI Payment Order (POST /api/payments/create-order)...');
  const createPayRes = await req('/payments/create-order', {
    method: 'POST',
    headers: { Authorization: `Bearer ${customerToken}` },
    body: JSON.stringify({
      items: [
        { foodId: provFoods[0].id, quantity: 2, specialInstructions: 'Razorpay UPI Test Order' },
      ],
      pickupPreference: 'Pick up ASAP',
      diningType: 'Takeaway',
      notes: 'Testing Razorpay UPI Checkout',
    }),
  });

  if (createPayRes.status !== 201) {
    throw new Error(`Failed to create payment order: ${JSON.stringify(createPayRes.data)}`);
  }

  const { orderId, orderNumber, amount, amountInPaise, razorpayOrderId, razorpayKeyId } = createPayRes.data.data;
  console.log(`   Order Created: ${orderNumber} (ID: ${orderId})`);
  console.log(`   Calculated Total Amount: ₹${amount} (${amountInPaise} paise)`);
  console.log(`   Razorpay Order ID: ${razorpayOrderId}`);
  console.log(`   Razorpay Public Key ID: ${razorpayKeyId}`);
  console.log('   ✅ PASS: Razorpay order successfully created.\n');

  // 6. Section 10 Rule: Provider must NOT see the order while payment is PENDING
  console.log('👉 [TEST 6] Verification: Order must NOT appear in Provider KDS while payment is PENDING...');
  const provPendingOrdersRes = await req('/orders/provider', {
    headers: { Authorization: `Bearer ${providerToken}` },
  });
  const foundInKdsPending = provPendingOrdersRes.data.data.find((o: any) => o.id === orderId);
  if (foundInKdsPending) {
    throw new Error('RULE VIOLATION: Unpaid order appeared in provider dashboard before payment!');
  }
  console.log(`   Verified: Order ${orderNumber} is NOT in Provider queue while PENDING.`);
  console.log('   ✅ PASS: Unpaid order properly hidden from provider.\n');

  // 7. Check Payment Status (GET /api/payments/:orderId/status)
  console.log('👉 [TEST 7] Query Payment Status Endpoint (GET /api/payments/:orderId/status)...');
  const statusRes1 = await req(`/payments/${orderId}/status`, {
    headers: { Authorization: `Bearer ${customerToken}` },
  });
  console.log(`   Payment Status: ${statusRes1.data.data.paymentStatus}`);
  if (statusRes1.data.data.paymentStatus !== 'PENDING') {
    throw new Error('Expected payment status to be PENDING');
  }
  console.log('   ✅ PASS: Payment status endpoint confirmed PENDING.\n');

  // 8. Test Client Payment Verification Endpoint (POST /api/payments/verify) with Valid Signature
  console.log('👉 [TEST 8] Test Signature Verification Endpoint (POST /api/payments/verify)...');
  const mockPaymentId = `pay_test_${Date.now()}`;
  const validSignature = crypto
    .createHmac('sha256', ENV.RAZORPAY_KEY_SECRET)
    .update(`${razorpayOrderId}|${mockPaymentId}`)
    .digest('hex');

  const verifyRes = await req('/payments/verify', {
    method: 'POST',
    headers: { Authorization: `Bearer ${customerToken}` },
    body: JSON.stringify({
      orderId,
      razorpay_order_id: razorpayOrderId,
      razorpay_payment_id: mockPaymentId,
      razorpay_signature: validSignature,
    }),
  });

  if (verifyRes.status !== 200 || !verifyRes.data.data.isPaid) {
    throw new Error(`Signature verification failed: ${JSON.stringify(verifyRes.data)}`);
  }
  console.log(`   Verification Response: Status = ${verifyRes.data.data.status}, isPaid = ${verifyRes.data.data.isPaid}`);
  console.log('   ✅ PASS: Cryptographic signature verified and payment marked PAID.\n');

  // 9. Test Signature Verification with Tampered Signature (Security Guard)
  console.log('👉 [TEST 9] Security: Test Tampered Signature Rejection...');
  const tamperedRes = await req('/payments/verify', {
    method: 'POST',
    headers: { Authorization: `Bearer ${customerToken}` },
    body: JSON.stringify({
      orderId,
      razorpay_order_id: razorpayOrderId,
      razorpay_payment_id: mockPaymentId,
      razorpay_signature: 'fake_tampered_signature_1234567890abcdef',
    }),
  });
  if (tamperedRes.status !== 400) {
    throw new Error(`Expected 400 Bad Request for tampered signature, got ${tamperedRes.status}`);
  }
  console.log(`   Received expected 400 rejection: "${tamperedRes.data.error || tamperedRes.data.message}"`);
  console.log('   ✅ PASS: Tampered signature rejected.\n');

  // 10. Simulate Razorpay Webhook for Payment Confirmation (POST /api/payments/webhook)
  console.log('👉 [TEST 10] Simulate Razorpay payment.captured Webhook (POST /api/payments/webhook)...');
  const webhookPayload = {
    event: 'payment.captured',
    payload: {
      payment: {
        entity: {
          id: mockPaymentId,
          order_id: razorpayOrderId,
          amount: amountInPaise,
          currency: 'INR',
          status: 'captured',
          method: 'upi',
          created_at: Math.floor(Date.now() / 1000),
          notes: {
            orderId,
            orderNumber,
          },
        },
      },
    },
  };

  const webhookRes = await req('/payments/webhook', {
    method: 'POST',
    body: JSON.stringify(webhookPayload),
  });
  console.log(`   Webhook Response Status: ${webhookRes.status}, data:`, webhookRes.data);
  if (webhookRes.status !== 200 || webhookRes.data.status !== 'OK') {
    throw new Error(`Webhook failed: ${JSON.stringify(webhookRes.data)}`);
  }
  console.log('   ✅ PASS: Razorpay Webhook processed successfully.\n');

  // 11. Verify Idempotency on Duplicate Webhook
  console.log('👉 [TEST 11] Test Webhook Idempotency (Sending duplicate webhook)...');
  const dupWebhookRes = await req('/payments/webhook', {
    method: 'POST',
    body: JSON.stringify(webhookPayload),
  });
  if (dupWebhookRes.status !== 200) throw new Error('Idempotent webhook handling failed');
  console.log('   ✅ PASS: Duplicate webhook handled idempotently without error.\n');

  // 12. Verify DB status is PAID
  console.log('👉 [TEST 12] Verify Database Status is updated to PAID...');
  const dbPayment = await prisma.payment.findUnique({
    where: { orderId },
  });
  if (dbPayment?.status !== 'PAID') {
    throw new Error(`Expected DB payment to be PAID, but got ${dbPayment?.status}`);
  }
  console.log(`   DB Payment Record: Status = ${dbPayment.status}, Gateway Ref = ${dbPayment.gatewayPaymentId}, Gateway Order = ${dbPayment.gatewayOrderId}`);
  console.log('   ✅ PASS: Database reflects PAID status.\n');

  // 13. Section 10 Rule: Provider NOW receives the confirmed order
  console.log('👉 [TEST 13] Verification: Provider KDS receives the confirmed order after payment...');
  const provPaidOrdersRes = await req('/orders/provider', {
    headers: { Authorization: `Bearer ${providerToken}` },
  });
  const foundInKdsPaid = provPaidOrdersRes.data.data.find((o: any) => o.id === orderId);
  if (!foundInKdsPaid) {
    throw new Error('Order missing from provider dashboard after successful payment!');
  }
  console.log(`   Found confirmed order ${foundInKdsPaid.orderNumber} in Provider queue with status: ${foundInKdsPaid.status}`);
  console.log('   ✅ PASS: Confirmed order delivered to provider.\n');

  // 14. Security Test: Unauthorized access to payment status
  console.log('👉 [TEST 14] Security: Verify unauthorized user cannot access payment details...');
  const otherUserRes = await req('/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      email: 'chaiandchat@campusbites.edu',
      password: 'ProviderPassword123!',
    }),
  });
  const otherUserToken = otherUserRes.data.data.token;

  const unauthRes = await req(`/payments/${orderId}/status`, {
    headers: { Authorization: `Bearer ${otherUserToken}` },
  });
  if (unauthRes.status !== 403) {
    throw new Error(`Expected 403 Forbidden, but got ${unauthRes.status}`);
  }
  console.log(`   Received expected 403 Forbidden: "${unauthRes.data.error || unauthRes.data.message}"`);
  console.log('   ✅ PASS: Payment authorization guard verified.\n');

  console.log('=====================================================');
  console.log('ALL RAZORPAY UPI INTEGRATION TESTS PASSED 100%');
  console.log('=====================================================');
}

runPaymentSuite()
  .catch((err) => {
    console.error('❌ PAYMENT TEST FAILED:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
