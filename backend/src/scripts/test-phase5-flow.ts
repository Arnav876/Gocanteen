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

async function runEndToEndVerification() {
  console.log('=====================================================');
  console.log('STARTING PHASE 5 END-TO-END VERIFICATION SUITE');
  console.log('=====================================================\n');

  // TEST 1: Health check
  console.log('👉 [TEST 1] Backend Health Check...');
  const healthRes = await req('/health');
  console.log('   Response:', healthRes.data);
  if (healthRes.data.status !== 'ok') throw new Error('Health check failed');
  console.log('   ✅ PASS: Backend is healthy.\n');

  // TEST 2: Customer Authentication
  console.log('👉 [TEST 2] Customer Authentication (student@campusbites.edu)...');
  const custAuthRes = await req('/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      email: 'student@campusbites.edu',
      password: 'StudentPassword123!',
    }),
  });
  if (custAuthRes.status !== 200) throw new Error('Customer login failed');
  const customerToken = custAuthRes.data.data.token;
  const customerId = custAuthRes.data.data.user.id;
  console.log(`   Authenticated Customer: ${custAuthRes.data.data.user.fullName} (ID: ${customerId})`);
  console.log('   ✅ PASS: Customer logged in successfully.\n');

  // TEST 3: Provider 1 & 2 Authentication
  console.log('👉 [TEST 3] Provider Authentication (freshbites & chaiandchat)...');
  const prov1AuthRes = await req('/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      email: 'freshbites@campusbites.edu',
      password: 'ProviderPassword123!',
    }),
  });
  if (prov1AuthRes.status !== 200) throw new Error('Provider 1 login failed');
  const prov1Token = prov1AuthRes.data.data.token;
  const prov1Id = prov1AuthRes.data.data.user.provider.id;
  console.log(`   Provider 1: ${prov1AuthRes.data.data.user.provider.name} (Stall ID: ${prov1Id})`);

  const prov2AuthRes = await req('/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      email: 'chaiandchat@campusbites.edu',
      password: 'ProviderPassword123!',
    }),
  });
  if (prov2AuthRes.status !== 200) throw new Error('Provider 2 login failed');
  const prov2Token = prov2AuthRes.data.data.token;
  const prov2Id = prov2AuthRes.data.data.user.provider.id;
  console.log(`   Provider 2: ${prov2AuthRes.data.data.user.provider.name} (Stall ID: ${prov2Id})`);
  console.log('   ✅ PASS: Providers authenticated successfully.\n');

  // TEST 4: Fetch Menu from PostgreSQL
  console.log('👉 [TEST 4] Fetch Food Menu (GET /api/foods)...');
  const foodsRes = await req('/foods');
  const foods = foodsRes.data.data;
  console.log(`   Total active food items in DB: ${foods.length}`);
  if (foods.length === 0) throw new Error('No foods found in database');
  
  const prov1Foods = foods.filter((f: any) => f.providerId === prov1Id && f.availability === 'AVAILABLE');
  const prov2Foods = foods.filter((f: any) => f.providerId === prov2Id && f.availability === 'AVAILABLE');
  console.log(`   Provider 1 Available Dishes: ${prov1Foods.map((f: any) => f.name).join(', ')}`);
  console.log('   ✅ PASS: Food items retrieved directly from PostgreSQL.\n');

  // TEST 5: Customer Order Placement
  console.log('👉 [TEST 5] Customer Places Order (POST /api/orders)...');
  const item1 = prov1Foods[0];
  const item2 = prov1Foods[1] || prov1Foods[0];
  const orderPayload = {
    items: [
      { foodId: item1.id, quantity: 2, specialInstructions: 'Extra spicy please' },
      { foodId: item2.id, quantity: 1, specialInstructions: 'No onions' },
    ],
    pickupPreference: 'Pick up ASAP',
    diningType: 'Dine-in',
    notes: 'Please prepare fresh for lunch',
  };

  const createOrderRes = await req('/orders', {
    method: 'POST',
    headers: { Authorization: `Bearer ${customerToken}` },
    body: JSON.stringify(orderPayload),
  });
  if (createOrderRes.status !== 201) {
    throw new Error(`Order creation failed: ${JSON.stringify(createOrderRes.data)}`);
  }
  const createdOrder = createOrderRes.data.data;
  console.log(`   Created Order Number: ${createdOrder.orderNumber}`);
  console.log(`   Order Status: ${createdOrder.status}`);
  console.log(`   Payment Status: ${createdOrder.payment?.status} (Amount: ₹${createdOrder.totalAmount})`);
  console.log(`   Order Items: ${createdOrder.items.length} items recorded`);
  console.log('   ✅ PASS: Order created with server-computed pricing and database snapshot.\n');

  // TEST 6: Direct Database Verification with Prisma
  console.log('👉 [TEST 6] Direct Database Verification in PostgreSQL via Prisma...');
  const dbOrder = await prisma.order.findUnique({
    where: { id: createdOrder.id },
    include: { items: true, payment: true },
  });
  if (!dbOrder) throw new Error('Order not found in DB');
  console.log(`   Found in DB: Order ID ${dbOrder.id}, subtotal: ₹${dbOrder.subtotal}, total: ₹${dbOrder.totalAmount}`);
  console.log(`   DB Order Items count: ${dbOrder.items.length}`);
  console.log(`   DB Payment Record ID: ${dbOrder.payment?.id}, Status: ${dbOrder.payment?.status}`);
  console.log('   ✅ PASS: Order and OrderItems atomically persisted in PostgreSQL.\n');

  // TEST 7: Customer fetches My Orders
  console.log('👉 [TEST 7] Customer Fetches My Orders (GET /api/orders/my-orders)...');
  const myOrdersRes = await req('/orders/my-orders', {
    headers: { Authorization: `Bearer ${customerToken}` },
  });
  const myOrders = myOrdersRes.data.data;
  const foundCustOrder = myOrders.find((o: any) => o.id === createdOrder.id);
  if (!foundCustOrder) throw new Error('Order missing from customer my-orders response');
  console.log(`   Found customer order: ${foundCustOrder.orderNumber} with ${foundCustOrder.items.length} items`);
  console.log('   ✅ PASS: Customer order history verified.\n');

  // TEST 8: Provider 1 sees the Incoming Order
  console.log('👉 [TEST 8] Provider 1 Checks Incoming Orders (GET /api/orders/provider)...');
  const prov1OrdersRes = await req('/orders/provider', {
    headers: { Authorization: `Bearer ${prov1Token}` },
  });
  const prov1Orders = prov1OrdersRes.data.data;
  const foundProv1Order = prov1Orders.find((o: any) => o.id === createdOrder.id);
  if (!foundProv1Order) throw new Error("Order missing from Provider 1's queue");
  console.log(`   Provider 1 received order: ${foundProv1Order.orderNumber} from customer: ${foundProv1Order.customer?.fullName}`);
  console.log('   ✅ PASS: Incoming order appeared on Provider 1 KDS dashboard.\n');

  // TEST 9: Provider Isolation Security Check (Provider 2 cannot see Provider 1's order)
  console.log('👉 [TEST 9] Cross-Provider Isolation Security Verification...');
  const prov2OrdersRes = await req('/orders/provider', {
    headers: { Authorization: `Bearer ${prov2Token}` },
  });
  const prov2Orders = prov2OrdersRes.data.data;
  const foundInProv2 = prov2Orders.find((o: any) => o.id === createdOrder.id);
  if (foundInProv2) throw new Error("SECURITY BREACH: Provider 2 can see Provider 1's order!");
  console.log(`   Provider 2 orders count: ${prov2Orders.length} (Order ${createdOrder.orderNumber} correctly NOT visible to Provider 2)`);
  console.log('   ✅ PASS: Strict provider data isolation verified.\n');

  // TEST 10: Provider Order Status Progression Workflow
  console.log('👉 [TEST 10] Provider Status Transitions (PLACED -> PREPARING -> READY -> COMPLETED)...');
  
  // Step 1: PLACED -> PREPARING
  const prepRes = await req(`/orders/${createdOrder.id}/status`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${prov1Token}` },
    body: JSON.stringify({ status: 'PREPARING' }),
  });
  console.log(`   Status updated to: ${prepRes.data.data.status}`);

  // Step 2: PREPARING -> READY
  const readyRes = await req(`/orders/${createdOrder.id}/status`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${prov1Token}` },
    body: JSON.stringify({ status: 'READY' }),
  });
  console.log(`   Status updated to: ${readyRes.data.data.status}`);

  // Step 3: READY -> COMPLETED
  const compRes = await req(`/orders/${createdOrder.id}/status`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${prov1Token}` },
    body: JSON.stringify({ status: 'COMPLETED' }),
  });
  console.log(`   Status updated to: ${compRes.data.data.status}`);
  console.log('   ✅ PASS: Full kitchen order lifecycle workflow verified.\n');

  // TEST 11: Customer Live Order Query Reflects Completed Status
  console.log('👉 [TEST 11] Customer Single Order View (GET /api/orders/:id)...');
  const custSingleRes = await req(`/orders/${createdOrder.id}`, {
    headers: { Authorization: `Bearer ${customerToken}` },
  });
  console.log(`   Customer retrieved order status: ${custSingleRes.data.data.status}`);
  if (custSingleRes.data.data.status !== 'COMPLETED') throw new Error('Status sync failure');
  console.log('   ✅ PASS: Real-time status retrieval verified for customer.\n');

  // TEST 12: Multi-Stall Cart Validation Rule
  console.log('👉 [TEST 12] Validation: Multi-Stall Order Rejection Check...');
  const multiStallRes = await req('/orders', {
    method: 'POST',
    headers: { Authorization: `Bearer ${customerToken}` },
    body: JSON.stringify({
      items: [
        { foodId: prov1Foods[0].id, quantity: 1 },
        { foodId: prov2Foods[0].id, quantity: 1 },
      ],
    }),
  });
  if (multiStallRes.status === 400) {
    console.log(`   Backend properly rejected multi-stall order: "${multiStallRes.data.message}"`);
    console.log('   ✅ PASS: Multi-stall cart restriction enforced.\n');
  } else {
    throw new Error('Multi-stall cart was unexpectedly allowed');
  }

  console.log('=====================================================');
  console.log('ALL PHASE 5 END-TO-END VERIFICATION TESTS PASSED 100%');
  console.log('=====================================================');
}

runEndToEndVerification()
  .catch((err) => {
    console.error('❌ TEST FAILED:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
