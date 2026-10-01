# 💳 CampusBites / Gocanteen — Cashfree UPI Payment Integration Guide

This guide details the end-to-end setup and configuration of the production-ready **Cashfree Payments UPI Intent & App Redirection** system for the CampusBites Canteen Web Application.

---

## 1. Architecture & Payment Flow

```mermaid
sequenceDiagram
    autonumber
    actor Student as 🎓 Student (Customer)
    participant App as 💻 React Frontend
    participant API as ⚙️ Express Backend
    participant CF as 🛡️ Cashfree PG Gateway
    participant DB as 🐘 PostgreSQL Database
    actor Provider as 👨‍🍳 Canteen Provider

    Student->>App: Add food dishes to cart
    Student->>App: Click "Pay with UPI" in Checkout
    App->>API: POST /api/payments/create-order { items, ... }
    API->>DB: Fetch prices & calculate final amount server-side
    API->>DB: Create Order (status: PLACED, payment: PENDING)
    API->>CF: POST /pg/orders (create Cashfree order)
    CF-->>API: Returns payment_session_id & cf_order_id
    API-->>App: Returns paymentSessionId
    App->>CF: Cashfree JS SDK launch checkout (UPI / Intent)
    CF->>Student: Opens GPay / PhonePe / Paytm / BHIM / QR
    Student->>CF: Authorizes UPI PIN & completes payment
    CF-->>App: Redirects / returns to /payment/status?order_id=...
    App->>API: GET /api/payments/:orderId/status (Polls status)
    CF->>API: POST /api/payments/webhook (Instant webhook notification)
    API->>DB: Updates Payment to PAID & stores transaction ID
    API-->>App: Confirms Payment (Status: PAID)
    App-->>Student: Displays "✓ Payment Successful" receipt
    Provider->>API: GET /api/orders/provider
    API-->>Provider: Returns PAID order to Kitchen KDS queue
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
# Cashfree Payments Gateway Configuration
# ===============================================
CASHFREE_APP_ID="your_cashfree_app_id"
CASHFREE_SECRET_KEY="your_cashfree_secret_key"
CASHFREE_ENV="SANDBOX" # Switch to "PRODUCTION" when going live
CASHFREE_API_VERSION="2023-08-01"
```

### Frontend Configuration (`frontend/.env`)

```env
VITE_API_URL="http://localhost:5001"
```

---

## 3. How to Obtain Cashfree Credentials

### Step 1: Create a Cashfree Account
1. Visit [Cashfree Payments](https://www.cashfree.com/) and register for a Merchant account.
2. Sign in to the **Cashfree Merchant Dashboard**.

### Step 2: Get Sandbox / Test API Keys
1. Switch to the **Test / Sandbox Environment** from the top header switcher in your dashboard.
2. Navigate to: **Payment Gateway → Developers → API Keys**.
3. Generate and copy your:
   - **App ID / Client ID**
   - **Secret Key**
4. Paste them into `backend/.env`:
   ```env
   CASHFREE_APP_ID="<your_test_app_id>"
   CASHFREE_SECRET_KEY="<your_test_secret_key>"
   CASHFREE_ENV="SANDBOX"
   ```

---

## 4. Webhook Configuration

Cashfree automatically notifies your backend when a payment is authorized or completed.

### Local Development Webhook (Using ngrok or Localtunnel)
1. Start an ngrok tunnel to port 5001:
   ```bash
   ngrok http 5001
   ```
2. Copy your public forwarding URL (e.g. `https://abc-123.ngrok-free.app`).
3. In the **Cashfree Dashboard → Developers → Webhooks**:
   - Add Webhook URL: `https://abc-123.ngrok-free.app/api/payments/webhook`
   - Select events: `Payment Success`, `Payment Failed`, `User Dropped`.
4. Update `BACKEND_URL` in `backend/.env` with your tunnel URL.

### Webhook Security & Idempotency
- **Signature Verification**: Every incoming webhook is verified using `HMAC-SHA256(timestamp + rawBody, CASHFREE_SECRET_KEY)`.
- **Idempotency**: Duplicate webhook triggers are checked against the database; a paid order will never be duplicated or re-billed.

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
Frontend runs on `http://localhost:5173` (or the active Vite port).

---

## 6. Testing Procedure in Sandbox

### Test Accounts
- **Customer / Student:** `student@campusbites.edu` / `StudentPassword123!`
- **Provider (Fresh Bites):** `freshbites@campusbites.edu` / `ProviderPassword123!`

### End-to-End Test Steps:
1. Open the frontend: `http://localhost:5173`.
2. Sign in as **Student / Customer**.
3. Add food items to your tray from the menu.
4. Click **"View Order"** on the floating tray bar.
5. In the Checkout modal:
   - Choose **"UPI & Instant Redirection (Cashfree)"** (recommended default).
   - Select dining preference (Dine-in / Takeaway) and pickup slot (Pick up ASAP / Class Break).
   - Click **"Pay with UPI"**.
6. In Sandbox mode:
   - Cashfree checkout will open with the UPI options (Google Pay, PhonePe, Paytm, QR).
   - In Sandbox simulation mode or sandbox UI, authorize the test payment.
7. You will be redirected to the **Payment Status Page** (`/payment/status?order_id=...`):
   - You will see the animated "Verifying UPI Transaction" state.
   - Once confirmed, the screen renders **"✓ ₹XX Paid Successfully!"** with the full receipt and order number `#CB-XXXX`.
8. Sign in as **Provider** (`freshbites@campusbites.edu`):
   - Open the **"Incoming Orders (KDS)"** tab.
   - The paid order will immediately appear in **"New Orders"**.
   - Click **"Start Cooking"** → moves to **"In Preparation"**.
   - Click **"Mark Ready for Pickup"** → moves to **"Ready"**.
   - Click **"Handed Over (Complete)"** → moves to **"Completed"**.

---

## 7. Switching from SANDBOX to PRODUCTION

When you are ready to process real student UPI payments:

1. Complete KYC verification in the Cashfree Merchant Dashboard.
2. In the Cashfree dashboard, switch the environment toggle from **Test** to **Production**.
3. Go to **Developers → API Keys** and generate **Production API Keys**.
4. In your production `.env` (or cloud hosting dashboard):
   ```env
   CASHFREE_APP_ID="<your_production_app_id>"
   CASHFREE_SECRET_KEY="<your_production_secret_key>"
   CASHFREE_ENV="PRODUCTION"
   CASHFREE_API_VERSION="2023-08-01"
   FRONTEND_URL="https://your-canteen-domain.com"
   BACKEND_URL="https://api.your-canteen-domain.com"
   ```
5. Register your production webhook endpoint: `https://api.your-canteen-domain.com/api/payments/webhook`.

---

## 8. Troubleshooting Common Issues

| Issue | Cause | Resolution |
|---|---|---|
| `Invalid signature` on webhook | Secret key mismatch or modified payload | Verify `CASHFREE_SECRET_KEY` matches the environment (Sandbox vs Prod) |
| Order not visible on Provider board | Payment is still in `PENDING` state | Provider board is gated by design. Ensure payment reaches `PAID` via webhook or status query |
| `Customer phone number invalid` | Phone string is under 10 digits | Ensure user profile has a valid 10-digit Indian phone number (default fallback `9876543210` is used) |
| Multi-stall tray error | Items selected from 2 different stalls | Students must place separate orders per stall to allow independent kitchen fulfillment |
