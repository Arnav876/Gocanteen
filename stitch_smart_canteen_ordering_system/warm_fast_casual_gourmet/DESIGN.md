---
name: Warm Fast-Casual Gourmet
colors:
  surface: '#faf8ff'
  surface-dim: '#d2d9f4'
  surface-bright: '#faf8ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f2f3ff'
  surface-container: '#eaedff'
  surface-container-high: '#e2e7ff'
  surface-container-highest: '#dae2fd'
  on-surface: '#131b2e'
  on-surface-variant: '#5a4138'
  inverse-surface: '#283044'
  inverse-on-surface: '#eef0ff'
  outline: '#8e7166'
  outline-variant: '#e2bfb2'
  surface-tint: '#a73a00'
  primary: '#a33900'
  on-primary: '#ffffff'
  primary-container: '#cc4900'
  on-primary-container: '#fffbff'
  inverse-primary: '#ffb599'
  secondary: '#855300'
  on-secondary: '#ffffff'
  secondary-container: '#fea619'
  on-secondary-container: '#684000'
  tertiary: '#006947'
  on-tertiary: '#ffffff'
  tertiary-container: '#00855b'
  on-tertiary-container: '#f5fff6'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#ffdbce'
  primary-fixed-dim: '#ffb599'
  on-primary-fixed: '#370e00'
  on-primary-fixed-variant: '#7f2b00'
  secondary-fixed: '#ffddb8'
  secondary-fixed-dim: '#ffb95f'
  on-secondary-fixed: '#2a1700'
  on-secondary-fixed-variant: '#653e00'
  tertiary-fixed: '#6ffbbe'
  tertiary-fixed-dim: '#4edea3'
  on-tertiary-fixed: '#002113'
  on-tertiary-fixed-variant: '#005236'
  background: '#faf8ff'
  on-background: '#131b2e'
  surface-variant: '#dae2fd'
typography:
  headline-xl:
    fontFamily: Plus Jakarta Sans
    fontSize: 40px
    fontWeight: '800'
    lineHeight: 48px
    letterSpacing: -0.03em
  headline-xl-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 30px
    fontWeight: '800'
    lineHeight: 38px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-lg-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 26px
  body-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 22px
  body-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 18px
  label-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: 0.01em
  label-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.02em
  label-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 11px
    fontWeight: '700'
    lineHeight: 14px
    letterSpacing: 0.04em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1rem
  gutter-md: 1.5rem
  gutter-lg: 2rem
  margin: 1rem
  margin-md: 1.5rem
  margin-lg: 3rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2rem
---

## Brand & Style

The design system establishes a premium, fast-casual culinary presence for fast-paced campus environments. It bridges the gap between chaotic institutional dining and polished artisanal hospitality. The audience encompasses students ordering during short class transitions, faculty desiring reliable pre-orders, and kitchen staff managing high-throughput order queues.

The visual style blends modern corporate clarity with warm, tactile fast-casual hospitality:
- **Atmosphere:** Appetizing, prompt, reliable, and vibrant.
- **Visual Mechanics:** Rich saffron and fired-terracotta accents ground the interface, contrasted against deep slate surfaces and buttery cream backdrops. Tactile surface layering, soft amber-tinted diffused shadows, and micro-delights (such as satisfying checkout pulses and instant order-state pills) give the application immediate physical credibility.
- **Operational Clarity:** High-contrast, color-coded functional tags separate kitchen states unambiguously while maintaining strict WCAG AAA legibility for high-stress scanning.

## Colors

The palette leverages psychological appetite stimulation balanced by systematic clarity:
- **Primary (`#EA580C` - Spiced Terracotta):** Used for critical conversion paths, primary CTAs, active cart badges, and the "Order Prepping" kitchen state.
- **Secondary (`#F59E0B` - Saffron Amber):** Used for highlights, promotional hero badges, ratings, and active tab indicators.
- **Tertiary (`#10B981` - Herbal Emerald):** Dedicated strictly to positive confirmation, vegetarian/vegan diet markers, organic sourcing indicators, and the "Order Ready" operational signal.
- **Neutral (`#0F172A` - Deep Mineral Slate):** Anchors headlines, primary text, high-emphasis icons, and kitchen display headers. Supporting slate tints (`#334155`, `#64748B`, `#94A3B8`) handle secondary information and structural borders.
- **Backgrounds & Canvas:** Surfaces sit on warm cream canvases (`#FAF9F6`), avoiding clinical stark white to maintain food appeal and lower visual fatigue under varied campus lighting conditions.
- **System States:**
  - *New / Placed:* `#3B82F6` (Electric Blue)
  - *Prepping:* `#EA580C` (Terracotta)
  - *Ready for Pickup:* `#10B981` (Emerald)
  - *Picked Up / Closed:* `#64748B` (Muted Slate)

## Typography

The design system relies entirely on Plus Jakarta Sans across all roles to ensure geometric clarity, contemporary warmth, and swift legibility on mobile viewports and kitchen status boards. 

- **Display & Headings:** Tighter letter tracking (`-0.03em` to `-0.01em`) paired with heavy font weights (700 and 800) anchors food item names, kitchen order codes, and banner headings.
- **Order Numbers & Price Callouts:** Utilize tabular numbers (`tnum`) in `headline-md` and `headline-lg` to prevent visual shifting during real-time checkout updates and queue counters.
- **Labels & Badges:** Utilize uppercase micro-weights (`label-sm` with `0.04em` tracking) for dietary badges (VEG, GF, HALAL) and kitchen fulfillment stages to provide high legibility at a glance.

## Layout & Spacing

The layout model implements a fluid responsive structure adhering to an 8-point base cadence:
- **Mobile (< 768px):** 4-column layout, 1rem margin, 1rem gutter. Bottom-anchored sticky actions (cart summary, order checkout) ensure single-thumb operation while students navigate crowded dining halls.
- **Tablet (768px - 1024px):** 8-column layout, 1.5rem margins and gutters. Suited for POS tablets and kitchen prep displays (KDS), partitioning order intake on the left and order preparation stations on the right.
- **Desktop (> 1024px):** 12-column layout capped at 1280px max-width, 3rem margins, 2rem gutters. Presents category navigation, rich menu grids (3 or 4 columns), and an accessible persistent order drawer.

## Elevation & Depth

Visual hierarchy pairs clean tonal surfaces with food-warmed ambient shadows to create tactile depth:

- **Level 0 (Flat):** Base canvas background (`#FAF9F6`).
- **Level 1 (Card Default):** `#FFFFFF` surfaces with a fine border (`rgba(15, 23, 42, 0.06)`) and soft warm ambient shadow: `box-shadow: 0 2px 8px -2px rgba(234, 88, 12, 0.04), 0 4px 16px -4px rgba(15, 23, 42, 0.06)`.
- **Level 2 (Interactive Hover / Floating Sheets):** Slightly raised item cards and active modals: `box-shadow: 0 8px 24px -4px rgba(234, 88, 12, 0.08), 0 6px 12px -4px rgba(15, 23, 42, 0.04)`.
- **Level 3 (Sticky Trays & Popovers):** Mobile persistent bottom cart bars and kitchen alert toasts: `box-shadow: 0 12px 32px -4px rgba(15, 23, 42, 0.12), 0 2px 6px 0 rgba(15, 23, 42, 0.04)`.
- **Level 4 (Modals & Overlays):** Semi-opaque tinted backing (`rgba(15, 23, 42, 0.45)` with `backdrop-filter: blur(4px)`).

## Shapes

The design system implements level 2 roundedness (`0.5rem` / `8px` default radius) to convey approachable craftsmanship while remaining functional for data-heavy kitchen displays.

- **Base Containers & Inputs:** `0.5rem` (`rounded`) for menu text areas, form inputs, and order row items.
- **Cards & Surfaces:** `1rem` (`rounded-lg`) for meal cards, station queue panels, and modal containers, giving meals an appetizing, frame-like appearance.
- **Interactive Badges & Pills:** `9999px` (Full Pill) for dietary markers, operational status pills, quantity steppers, and floating chip filters.

## Components

### Buttons
- **Primary:** High-touch, 48px minimum height. Solid `#EA580C` background, white text, bold font (`label-lg`), pill or 12px rounded corner. Tactile depression effect on active (`scale(0.98)`).
- **Secondary / Ghost:** Soft cream background (`#F1EFEA`) or warm tinted outline with `#0F172A` text.
- **Floating Cart Button:** Persistent bottom button on mobile with total item pill counter, bold label, and current subtotal aligned right.

### Chips & Filter Pills
- Fully rounded pills (`padding: 6px 16px`).
- Inactive: `#FFFFFF` border `1px solid rgba(15, 23, 42, 0.08)`, slate text.
- Active: `#0F172A` fill with white text, or `#EA580C` fill with subtle warm glow.

### Cards (Menu Items & Orders)
- **Menu Card:** White background, 16px radius, overflow hidden. Top section hosts aspect-ratio 4:3 culinary photography. Absolute-positioned badges on top corners (Dietary tag left, prep time right). Card body includes bold dish title, ingredient summary, dynamic price, and a quick-add `+` button.
- **Kitchen Order Ticket Card:** Bordered panel with colored vertical left stripe signaling the state (`#3B82F6` New, `#EA580C` Prepping, `#10B981` Ready). Large legible pickup code (e.g., `#B-104`) in `headline-md`, elapsed timer, item checklist, and complete CTA.

### Status Badges (Kitchen & Logistics)
- Pill format with leading status dot:
  - *New:* `#EFF6FF` background, `#1D4ED8` text.
  - *Prepping:* `#FFF7ED` background, `#C2410C` text.
  - *Ready:* `#ECFDF5` background, `#047857` text.
  - *Dietary (Veg/Vegan):* `#ECFDF5` background, `#047857` border and text with leaf icon.

### Form Inputs & Steppers
- **Inputs:** 48px height, 8px radius, border `1.5px solid #E2E8F0`, focus state uses `#EA580C` outline with warm shadow halo (`0 0 0 3px rgba(234, 88, 12, 0.15)`).
- **Quantity Stepper:** Pill enclosure containing `-` and `+` tactile circular buttons flanking bold center text, optimized for fast touch manipulation.

### Lists
- Spaced out with subtle dividers (`rgba(15, 23, 42, 0.06)`). Order customizer lists include clear pricing modifiers right-aligned with interactive radio buttons or check pills.