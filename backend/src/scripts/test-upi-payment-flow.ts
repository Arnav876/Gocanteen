import { prisma } from '../config/prisma';

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
  console.log('STARTING CASHFREE UPI PAYMENT INTEGRATION TEST SUITE');
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
        { foodId: provFoods[0].id, quantity: 2, specialInstructions: 'UPI Test Order' },
      ],
      pickupPreference: 'Pick up ASAP',
      diningType: 'Takeaway',
      notes: 'Testing Cashfree UPI Redirection',
    }),
  });

  if (createPayRes.status !== 201) {
    throw new Error(`Failed to create payment order: ${JSON.stringify(createPayRes.data)}`);
  }

  const { orderId, orderNumber, amount, paymentSessionId, cfOrderId } = createPayRes.data.data;
  console.log(`   Order Created: ${orderNumber} (ID: ${orderId})`);
  console.log(`   Calculated Total Amount: ₹${amount}`);
  console.log(`   Cashfree Payment Session ID: ${paymentSessionId}`);
  console.log(`   Cashfree Order ID: ${cfOrderId}`);
  console.log('   ✅ PASS: Payment session successfully generated.\n');

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

  // 8. Simulate Cashfree Webhook for Payment Confirmation (POST /api/payments/webhook)
  console.log('👉 [TEST 8] Simulate Cashfree SUCCESS Webhook (POST /api/payments/webhook)...');
  const webhookPayload = {
    type: 'PAYMENT_SUCCESS_WEBHOOK',
    event_time: new Date().toISOString(),
    data: {
      order: {
        order_id: orderId,
        order_amount: amount,
        order_currency: 'INR',
      },
      payment: {
        cf_payment_id: `cf_pay_${Date.now()}`,
        payment_status: 'SUCCESS',
        payment_amount: amount,
        payment_currency: 'INR',
        payment_time: new Date().toISOString(),
        payment_method: {
          upi: {
            channel: 'intent',
            upi_id: 'student@okaxis',
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
  console.log('   ✅ PASS: Webhook processed successfully.\n');

  // 9. Verify Idempotency on Duplicate Webhook
  console.log('👉 [TEST 9] Test Webhook Idempotency (Sending duplicate webhook)...');
  const dupWebhookRes = await req('/payments/webhook', {
    method: 'POST',
    body: JSON.stringify(webhookPayload),
  });
  if (dupWebhookRes.status !== 200) throw new Error('Idempotent webhook handling failed');
  console.log('   ✅ PASS: Duplicate webhook handled idempotently.\n');

  // 10. Verify DB status is now PAID
  console.log('👉 [TEST 10] Verify Database Status is updated to PAID...');
  const dbPayment = await prisma.payment.findUnique({
    where: { orderId },
  });
  if (dbPayment?.status !== 'PAID') {
    throw new Error(`Expected DB payment to be PAID, but got ${dbPayment?.status}`);
  }
  console.log(`   DB Payment Record: Status = ${dbPayment.status}, Gateway Ref = ${dbPayment.gatewayPaymentId}`);
  console.log('   ✅ PASS: Database reflects PAID status.\n');

  // 11. Section 10 Rule: Provider NOW receives the confirmed order
  console.log('👉 [TEST 11] Verification: Provider KDS receives the confirmed order after payment...');
  const provPaidOrdersRes = await req('/orders/provider', {
    headers: { Authorization: `Bearer ${providerToken}` },
  });
  const foundInKdsPaid = provPaidOrdersRes.data.data.find((o: any) => o.id === orderId);
  if (!foundInKdsPaid) {
    throw new Error('Order missing from provider dashboard after successful payment!');
  }
  console.log(`   Found confirmed order ${foundInKdsPaid.orderNumber} in Provider queue with status: ${foundInKdsPaid.status}`);
  console.log('   ✅ PASS: Confirmed order delivered to provider.\n');

  // 12. Security Test: Unauthorized access to payment status
  console.log('👉 [TEST 12] Security: Verify unauthorized user cannot access payment details...');
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
  console.log('ALL CASHFREE UPI INTEGRATION TESTS PASSED 100%');
  console.log('=====================================================');
}

runPaymentSuite()
  .catch((err) => {
    console.error('❌ PAYMENT TEST FAILED:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
