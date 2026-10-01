# 💳 CampusBites / Gocanteen — Razorpay UPI Payment Integration Guide

This guide details the end-to-end setup and configuration of the production-ready **Razorpay UPI & Standard Checkout** system for the CampusBites Canteen Web Application.

---

## 1. Architecture & Payment Flow

```mermaid
sequenceDiagram
    autonumber
    actor Student as 🎓 Student (Customer)
    participant App as 💻 React Frontend
    participant API as ⚙️ Express Backend
    participant RZP as 🛡️ Razorpay PG Gateway
    participant DB as 🐘 PostgreSQL Database
    actor Provider as 👨‍🍳 Canteen Provider

    Student->>App: Add food dishes to cart
    Student->>App: Click "Pay with UPI" in Checkout
    App->>API: POST /api/payments/create-order { items, ... }
    API->>DB: Fetch prices & calculate final amount server-side
    API->>DB: Create Order (status: PLACED, payment: PENDING)
    API->>RZP: orders.create({ amount: amountInPaise, currency: 'INR', receipt })
    RZP-->>API: Returns Razorpay order_id (e.g. order_XXXXX)
    API-->>App: Returns { razorpayOrderId, razorpayKeyId, amountInPaise, orderId }
    App->>RZP: Launch Razorpay Standard Checkout Modal
    RZP->>Student: Opens UPI (GPay / PhonePe / Paytm / BHIM / QR)
    Student->>RZP: Authorizes payment via UPI app / test simulator
    RZP-->>App: Checkout returns { razorpay_payment_id, razorpay_order_id, razorpay_signature }
    App->>API: POST /api/payments/verify (cryptographic signature verification)
    API->>API: Verify HMAC_SHA256(order_id + "|" + payment_id, RAZORPAY_KEY_SECRET)
    API->>DB: Updates Payment to PAID & stores transaction ID
    API-->>App: Confirms Payment (Status: PAID)
    App-->>Student: Redirects to /payment/status?order_id=... & displays "✓ Payment Successful" receipt
    RZP->>API: POST /api/payments/webhook (Instant webhook notification)
    API->>DB: Webhook reconciles payment status idempotently
    Provider->>API: GET /api/orders/provider
    API-->>Provider: Returns PAID orders to Kitchen KDS queue
```

---

## 2. Environment Variables

### Backend Configuration (`backend/.env`)

```env
PORT=5001
NODE_ENV=development
DATABASE_URL="postgresql://username:password@localhost:5432/gocanteen_dev?schema=public"
JWT_SECRET="your-jwt-secret-key"
CLIENT_URL="http://localhost:5173"
FRONTEND_URL="http://localhost:5173"
BACKEND_URL="http://localhost:5001"

# ===============================================
# Razorpay Payments Gateway Configuration (Test Mode)
# ===============================================
RAZORPAY_KEY_ID="rzp_test_..."
RAZORPAY_KEY_SECRET="your_razorpay_key_secret"
RAZORPAY_WEBHOOK_SECRET="your_razorpay_webhook_secret"
```

### Security Rule:
- `RAZORPAY_KEY_SECRET` is kept strictly on the backend server and never sent to the client.
- The React frontend receives only the public `RAZORPAY_KEY_ID` along with server-generated `order_id` and server-calculated amount.

---

## 3. How to Obtain & Configure Razorpay Credentials

### Step 1: Create a Razorpay Account
1. Visit [Razorpay Dashboard](https://dashboard.razorpay.com/) and sign up.
2. Sign in to your **Razorpay Merchant Dashboard**.

### Step 2: Generate Test API Keys
1. Switch to **Test Mode** using the top navigation toggle.
2. Navigate to: **Account & Settings → API Keys** (under *Developer Controls*).
3. Click **Generate Test Key** and securely note:
   - **Key ID** (`rzp_test_...`)
   - **Key Secret** (`...`)
4. Place them into `backend/.env`:
   ```env
   RAZORPAY_KEY_ID="rzp_test_..."
   RAZORPAY_KEY_SECRET="<your_test_secret>"
   ```

---

## 4. Webhook Configuration

Razorpay webhooks provide server-to-server confirmation when payments are captured or fail, ensuring payment reconciliation even if the student closes their browser.

### Local Development Webhook (Using ngrok)
1. Start an ngrok tunnel forwarding to port 5001:
   ```bash
   ngrok http 5001
   ```
2. Copy your public forwarding URL (e.g. `https://abc-123.ngrok-free.app`).
3. In the **Razorpay Dashboard → Account & Settings → Webhooks**:
   - Click **Add New Webhook**.
   - **Webhook URL**: `https://abc-123.ngrok-free.app/api/payments/webhook`
   - **Secret**: Enter a secure random string (e.g. `cb_webhook_secret_2025`).
   - **Active Events**: Select `payment.captured`, `order.paid`, `payment.failed`.
4. Add the webhook secret to `backend/.env`:
   ```env
   RAZORPAY_WEBHOOK_SECRET="cb_webhook_secret_2025"
   ```

### Webhook Security & Idempotency
- **Signature Verification**: Every incoming webhook is verified using `HMAC-SHA256(rawBody, RAZORPAY_WEBHOOK_SECRET)` matched against the `x-razorpay-signature` header.
- **Idempotency**: Duplicate webhook events check the database payment state. If the payment is already marked `PAID`, redundant notifications and status changes are skipped.

---

## 5. Running the Application

### 1. Start Backend:
```bash
cd backend
npm run dev
```
Backend runs on `http://localhost:5001`.

### 2. Start Frontend:
```bash
cd frontend
npm run dev
```
Frontend runs on `http://localhost:5173`.

---

## 6. Testing Procedure in Razorpay Test Mode

### Test Accounts
- **Customer / Student:** `student@campusbites.edu` / `StudentPassword123!`
- **Provider (Fresh Bites):** `freshbites@campusbites.edu` / `ProviderPassword123!`

### End-to-End Test Steps:
1. Open the frontend: `http://localhost:5173`.
2. Sign in as **Student / Customer**.
3. Add food items to your tray from the menu.
4. Click **"View Order"** on the floating tray bar.
5. In the Checkout modal:
   - Choose **"UPI & Instant Redirection"** (Razorpay).
   - Select dining preference (Dine-in / Takeaway) and pickup slot (Pick up ASAP / Next Class Break).
   - Click **"Pay with UPI"**.
6. The official **Razorpay Checkout Modal** opens:
   - Select **UPI**.
   - In Test Mode, choose **Success** or test UPI ID / simulation QR.
7. Upon successful payment callback:
   - The signature is verified against `POST /api/payments/verify`.
   - You are redirected to the **Payment Status Page** (`/payment/status?order_id=...`).
   - The screen renders **"✓ ₹XX Paid Successfully!"** with the receipt details and order number `#CB-XXXX`.
8. Sign in as **Provider** (`freshbites@campusbites.edu`):
   - Open the **"Incoming Orders (KDS)"** tab.
   - The paid order immediately appears in **"New Orders"**.
   - Click **"Start Cooking"** → moves to **"In Preparation"**.
   - Click **"Mark Ready for Pickup"** → moves to **"Ready"**.
   - Click **"Handed Over (Complete)"** → moves to **"Completed"**.

---

## 7. Merchant Onboarding & Production Settlement

1. **Merchant Entity**: The college or canteen contractor must complete Razorpay Business KYC, submit bank account details (Account Number, IFSC, PAN), and get approved.
2. **Bank Account Privacy**: Bank credentials and account details are managed purely inside the Razorpay Merchant Dashboard; they are never stored or exposed in application source code.
3. **Switch to Production**:
   - In Razorpay Dashboard, toggle from **Test Mode** to **Live Mode**.
   - Generate **Live API Keys**.
   - Set in production `.env`:
     ```env
     RAZORPAY_KEY_ID="rzp_live_..."
     RAZORPAY_KEY_SECRET="<your_live_secret>"
     RAZORPAY_WEBHOOK_SECRET="<your_live_webhook_secret>"
     FRONTEND_URL="https://your-canteen-domain.com"
     BACKEND_URL="https://api.your-canteen-domain.com"
     ```
   - Register your production webhook endpoint: `https://api.your-canteen-domain.com/api/payments/webhook`.

---

## 8. Troubleshooting Common Issues

| Issue | Cause | Resolution |
|---|---|---|
| `Payment signature verification failed` | Secret key mismatch or tampered response | Ensure `RAZORPAY_KEY_SECRET` in `backend/.env` matches the Key ID used in checkout. |
| `Invalid signature` on webhook | Webhook secret mismatch | Verify `RAZORPAY_WEBHOOK_SECRET` matches the secret entered in the Razorpay Webhooks tab. |
| Order not visible on Provider board | Payment is still in `PENDING` state | Provider board is gated by design. Ensure payment reaches `PAID` via verify endpoint or webhook. |
| Razorpay checkout fails to load | Network block or script load failure | Check internet connectivity and ensure `https://checkout.razorpay.com/v1/checkout.js` is not blocked by ad blockers. |
| Multi-stall tray error | Items selected from 2 different stalls | Students must place separate orders per stall to allow independent kitchen fulfillment. |
