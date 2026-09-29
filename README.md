# CampusBites - Smart College Canteen Ordering System

An end-to-end Smart College Canteen Ordering System for campus environments. Built with modern web technologies and powered by the **Warm Fast-Casual Gourmet** visual design system.

---

## 🛠 Tech Stack

### Frontend (`/frontend`)
* **Framework:** React 19 + Vite + TypeScript
* **Styling:** Tailwind CSS v3 (`warm-fast-casual-gourmet` design tokens)
* **Icons & Typography:** Plus Jakarta Sans & Google Material Symbols Outlined
* **State & Real-Time:** React Context, Axios, Socket.IO Client, Framer Motion

### Backend (`/backend`)
* **Runtime & Server:** Node.js + Express + TypeScript
* **Database & ORM:** PostgreSQL + Prisma ORM
* **Real-Time Gateway:** Socket.IO
* **Security & Auth:** Role-Based Access Control (RBAC), JWT, bcryptjs

### Preserved Designs (`/stitch_smart_canteen_ordering_system`)
* `role_sign_in_location_selector` (Customer / Provider Auth & Campus GPS)
* `customer_menu_ordering` (Live Rush alerts, dietary filters, bento dish feed)
* `checkout_instant_payment` (1-Tap campus card, pickup slot preferences)
* `provider_kitchen_dashboard` (Real-time KDS, order tickets, 86-list toggles)
* `warm_fast_casual_gourmet/DESIGN.md` (Design system tokens & specs)

---

## 🚀 Getting Started

### 1. Backend Setup
```bash
cd backend
npm install
npx prisma generate
npm run dev
```
Backend runs on `http://localhost:5000` with live Socket.IO gateway.

### 2. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
Frontend runs on `http://localhost:5173`.
