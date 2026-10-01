import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../../context/CartContext';
import { api, parseApiError } from '../../lib/api';
import { launchCashfreeUPIPayment } from '../../lib/cashfree';
import type { Order } from '../../types';

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOrderSuccess: (order: Order) => void;
}

export const CheckoutModal: React.FC<CheckoutModalProps> = ({
  isOpen,
  onClose,
  onOrderSuccess,
}) => {
  const { items, subtotal, clearCart, updateQuantity } = useCart();
  const navigate = useNavigate();

  const [pickupPreference, setPickupPreference] = useState<'asap' | 'break'>('asap');
  const [diningType, setDiningType] = useState<'DINE_IN' | 'TAKEAWAY'>('DINE_IN');
  const [paymentMethod, setPaymentMethod] = useState<'UPI' | 'MEAL_CARD'>('UPI');
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || items.length === 0) return null;

  const stallName = items[0]?.foodItem?.provider?.name || 'Campus Canteen';
  const counterNumber = items[0]?.foodItem?.provider?.counterNumber || 'Counter 01';

  // Display fees & taxes calculation
  const tax = Number((subtotal * 0.05).toFixed(2));
  const packagingFee = diningType === 'TAKEAWAY' ? 10 : 0;
  const discount = Number((subtotal * 0.1).toFixed(2)); // 10% Campus student perk
  const finalTotal = Math.max(1, Number((subtotal + tax + packagingFee - discount).toFixed(2)));

  const handlePlaceOrderAndPay = async () => {
    setIsSubmitting(true);
    setError(null);

    const payload = {
      items: items.map((item) => ({
        foodId: item.foodItem.id,
        quantity: item.quantity,
        specialInstructions: item.specialInstructions || undefined,
      })),
      pickupPreference: pickupPreference === 'asap' ? 'Pick up ASAP' : 'Class Break Slot',
      diningType: diningType === 'DINE_IN' ? 'Dine-in' : 'Takeaway',
      notes: notes.trim() || undefined,
    };

    try {
      if (paymentMethod === 'UPI') {
        // 1. Create Cashfree payment session via backend
        const res = await api.payments.createOrder(payload);
        const { paymentSessionId, paymentMode, orderId, isLiveEnvironment } = res;

        if (isLiveEnvironment) {
          // Launch official Cashfree UPI modal / Intent checkout
          await launchCashfreeUPIPayment(paymentSessionId, paymentMode, '_modal');
        }

        // On return or simulation: navigate to payment verification screen
        clearCart();
        onClose();
        navigate(`/payment/status?order_id=${orderId}`);
      } else {
        // Campus Meal Card (Direct 1-Tap)
        const response = await api.orders.create(payload);
        clearCart();
        onOrderSuccess(response);
      }
    } catch (err) {
      setError(parseApiError(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-on-background/60 backdrop-blur-sm overflow-y-auto">
      <div className="bg-surface-container-lowest rounded-3xl w-full max-w-xl border border-outline-variant/40 shadow-2xl overflow-hidden my-6 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-4 sm:p-6 bg-surface-container-low/60 border-b border-outline-variant/30 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-primary text-on-primary flex items-center justify-center shadow-sm">
              <span className="material-symbols-outlined text-2xl">shopping_cart_checkout</span>
            </div>
            <div>
              <h2 className="text-headline-sm font-bold text-on-surface">Order Summary & Pickup</h2>
              <p className="text-body-sm text-on-surface-variant flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-tertiary"></span>
                <span>{stallName} • {counterNumber}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="p-2 rounded-full hover:bg-surface-container text-on-surface-variant transition"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="p-4 sm:p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {/* Error Banner */}
          {error && (
            <div className="p-3.5 rounded-xl bg-error-container text-on-error-container border border-error/30 text-body-sm flex items-center gap-2">
              <span className="material-symbols-outlined text-lg">error</span>
              <span className="font-medium">{error}</span>
            </div>
          )}

          {/* Pickup Preference */}
          <div>
            <span className="text-label-sm font-bold text-on-surface-variant uppercase tracking-wider block mb-2">
              Pickup Slot Preference
            </span>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setPickupPreference('asap')}
                className={`flex flex-col items-start p-3 rounded-2xl border-2 transition-all text-left ${
                  pickupPreference === 'asap'
                    ? 'border-primary bg-primary-fixed/20 text-on-surface shadow-xs'
                    : 'border-outline-variant/50 bg-surface-container-lowest text-on-surface hover:border-outline'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <span className="text-label-md font-bold text-primary flex items-center gap-1">
                    <span className="material-symbols-outlined text-base">bolt</span>
                    <span>Pick up ASAP</span>
                  </span>
                  <span className="material-symbols-outlined text-primary text-base">
                    {pickupPreference === 'asap' ? 'check_circle' : 'radio_button_unchecked'}
                  </span>
                </div>
                <span className="text-body-sm text-on-surface-variant mt-1">Ready in ~8-12 mins</span>
              </button>

              <button
                type="button"
                onClick={() => setPickupPreference('break')}
                className={`flex flex-col items-start p-3 rounded-2xl border-2 transition-all text-left ${
                  pickupPreference === 'break'
                    ? 'border-primary bg-primary-fixed/20 text-on-surface shadow-xs'
                    : 'border-outline-variant/50 bg-surface-container-lowest text-on-surface hover:border-outline'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <span className="text-label-md font-bold text-primary flex items-center gap-1">
                    <span className="material-symbols-outlined text-base">notifications_paused</span>
                    <span>Next Class Break</span>
                  </span>
                  <span className="material-symbols-outlined text-primary text-base">
                    {pickupPreference === 'break' ? 'check_circle' : 'radio_button_unchecked'}
                  </span>
                </div>
                <span className="text-body-sm text-on-surface-variant mt-1">Scheduled for next bell</span>
              </button>
            </div>
          </div>

          {/* Dining Type */}
          <div>
            <span className="text-label-sm font-bold text-on-surface-variant uppercase tracking-wider block mb-2">
              Dining Preference
            </span>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setDiningType('DINE_IN')}
                className={`p-3 rounded-2xl border text-center font-bold text-label-md flex items-center justify-center gap-2 transition ${
                  diningType === 'DINE_IN'
                    ? 'bg-secondary-container text-on-secondary-container border-secondary-container'
                    : 'bg-surface-container border-outline-variant/40 text-on-surface hover:bg-surface-container-high'
                }`}
              >
                <span className="material-symbols-outlined text-lg">restaurant</span>
                <span>Dine-In (Tray)</span>
              </button>
              <button
                type="button"
                onClick={() => setDiningType('TAKEAWAY')}
                className={`p-3 rounded-2xl border text-center font-bold text-label-md flex items-center justify-center gap-2 transition ${
                  diningType === 'TAKEAWAY'
                    ? 'bg-secondary-container text-on-secondary-container border-secondary-container'
                    : 'bg-surface-container border-outline-variant/40 text-on-surface hover:bg-surface-container-high'
                }`}
              >
                <span className="material-symbols-outlined text-lg">takeout_dining</span>
                <span>Takeaway (Eco Box)</span>
              </button>
            </div>
          </div>

          {/* Cart Items List */}
          <div className="bg-surface-container-low/50 rounded-2xl p-4 border border-outline-variant/30 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-outline-variant/20">
              <span className="text-label-md font-bold text-on-surface">Order Items ({items.length})</span>
              <span className="text-label-sm text-tertiary font-bold bg-on-tertiary-container px-2 py-0.5 rounded">
                Express Prep
              </span>
            </div>

            <div className="divide-y divide-outline-variant/20 space-y-2">
              {items.map((item) => (
                <div key={item.foodItem.id} className="pt-2 flex items-center justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-label-md text-primary">
                        {item.foodItem.isVeg ? '🟢' : '🔴'}
                      </span>
                      <span className="font-bold text-body-md text-on-surface">{item.foodItem.name}</span>
                    </div>
                    {item.specialInstructions && (
                      <p className="text-body-sm text-outline italic ml-6">
                        "{item.specialInstructions}"
                      </p>
                    )}
                    <span className="text-body-sm text-on-surface-variant ml-6">
                      ₹{Number(item.foodItem.price).toFixed(0)} each
                    </span>
                  </div>

                  {/* Quantity Stepper */}
                  <div className="flex items-center bg-surface-container-lowest rounded-full p-1 border border-outline-variant/40">
                    <button
                      type="button"
                      onClick={() => updateQuantity(item.foodItem.id, item.quantity - 1)}
                      className="w-7 h-7 rounded-full bg-surface-container-low hover:bg-surface-container text-on-surface flex items-center justify-center active:scale-90 transition"
                    >
                      <span className="material-symbols-outlined text-xs">
                        {item.quantity === 1 ? 'delete' : 'remove'}
                      </span>
                    </button>
                    <span className="w-7 text-center text-label-md font-bold text-on-surface">
                      {item.quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => updateQuantity(item.foodItem.id, item.quantity + 1)}
                      className="w-7 h-7 rounded-full bg-primary text-on-primary flex items-center justify-center active:scale-90 transition"
                    >
                      <span className="material-symbols-outlined text-xs">add</span>
                    </button>
                  </div>

                  <span className="text-label-md font-bold text-on-surface w-16 text-right">
                    ₹{(Number(item.foodItem.price) * item.quantity).toFixed(0)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Special Cooking Instructions Note */}
          <div>
            <label className="text-label-sm font-bold text-on-surface-variant uppercase tracking-wider block mb-1.5">
              Order Notes / Allergies (Optional)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Less spicy, separate sauce, extra napkins..."
              className="w-full px-4 py-2.5 rounded-xl border border-outline-variant/60 bg-surface-bright text-on-surface text-body-md placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          {/* Payment Method Selector (Cashfree UPI vs Meal Card) */}
          <div className="space-y-3">
            <span className="text-label-sm font-bold text-on-surface-variant uppercase tracking-wider block">
              Choose Payment Method
            </span>

            {/* Option 1: Cashfree UPI (Primary & Recommended) */}
            <div
              onClick={() => setPaymentMethod('UPI')}
              className={`p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                paymentMethod === 'UPI'
                  ? 'border-primary bg-primary-fixed/15 shadow-sm'
                  : 'border-outline-variant/40 bg-surface-container-lowest hover:border-outline'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-primary text-on-primary flex items-center justify-center shadow-xs">
                    <span className="material-symbols-outlined text-2xl">account_balance_wallet</span>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-label-lg font-bold text-on-surface">UPI & Instant Redirection</span>
                      <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-extrabold border border-emerald-300">
                        Recommended
                      </span>
                    </div>
                    <p className="text-body-sm text-on-surface-variant">
                      Google Pay, PhonePe, Paytm, BHIM, QR or UPI Intent
                    </p>
                  </div>
                </div>

                <span
                  className={`material-symbols-outlined text-xl ${
                    paymentMethod === 'UPI' ? 'text-primary' : 'text-outline-variant'
                  }`}
                  data-weight={paymentMethod === 'UPI' ? 'fill' : 'normal'}
                >
                  {paymentMethod === 'UPI' ? 'check_circle' : 'radio_button_unchecked'}
                </span>
              </div>

              {/* UPI App Badges Bar */}
              <div className="mt-3 pt-2.5 border-t border-outline-variant/20 flex items-center gap-2 overflow-x-auto text-label-sm font-bold text-on-surface-variant">
                <span className="px-2 py-0.5 bg-surface-container rounded-md text-xs">GPay</span>
                <span className="px-2 py-0.5 bg-surface-container rounded-md text-xs">PhonePe</span>
                <span className="px-2 py-0.5 bg-surface-container rounded-md text-xs">Paytm</span>
                <span className="px-2 py-0.5 bg-surface-container rounded-md text-xs">BHIM</span>
                <span className="px-2 py-0.5 bg-surface-container rounded-md text-xs">UPI QR</span>
                <span className="text-[11px] text-tertiary ml-auto font-semibold">Instant App Redirect</span>
              </div>
            </div>

            {/* Option 2: Campus Meal Card */}
            <div
              onClick={() => setPaymentMethod('MEAL_CARD')}
              className={`p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                paymentMethod === 'MEAL_CARD'
                  ? 'border-primary bg-primary-fixed/15 shadow-sm'
                  : 'border-outline-variant/40 bg-surface-container-lowest hover:border-outline'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-secondary-container text-on-secondary-container flex items-center justify-center shadow-xs">
                    <span className="material-symbols-outlined text-2xl">badge</span>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-label-lg font-bold text-on-surface">Campus Meal Card</span>
                      <span className="px-2 py-0.5 rounded-full bg-surface-container text-on-surface text-[10px] font-extrabold">
                        1-Tap Auto
                      </span>
                    </div>
                    <p className="text-body-sm text-on-surface-variant">Student ID Card balance</p>
                  </div>
                </div>

                <span
                  className={`material-symbols-outlined text-xl ${
                    paymentMethod === 'MEAL_CARD' ? 'text-primary' : 'text-outline-variant'
                  }`}
                  data-weight={paymentMethod === 'MEAL_CARD' ? 'fill' : 'normal'}
                >
                  {paymentMethod === 'MEAL_CARD' ? 'check_circle' : 'radio_button_unchecked'}
                </span>
              </div>
            </div>
          </div>

          {/* Bill Calculation Summary */}
          <div className="p-4 rounded-2xl bg-surface-container-low border border-outline-variant/30 space-y-2">
            <div className="flex justify-between text-body-md text-on-surface-variant">
              <span>Items Subtotal</span>
              <span className="font-semibold text-on-surface">₹{subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-body-md text-tertiary">
              <span className="flex items-center gap-1">
                <span className="material-symbols-outlined text-sm">local_offer</span>
                <span>Campus Student Perk (10%)</span>
              </span>
              <span className="font-bold">-₹{discount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-body-md text-on-surface-variant">
              <span>GST / Campus Dining Tax (5%)</span>
              <span className="font-semibold text-on-surface">₹{tax.toFixed(2)}</span>
            </div>
            {packagingFee > 0 && (
              <div className="flex justify-between text-body-md text-on-surface-variant">
                <span>Eco-Packaging Fee</span>
                <span className="font-semibold text-on-surface">₹{packagingFee.toFixed(2)}</span>
              </div>
            )}
            <div className="pt-2 border-t border-outline-variant/30 flex justify-between items-baseline">
              <div>
                <span className="text-headline-sm font-bold text-on-surface">Total Payable</span>
                <span className="block text-body-sm text-on-surface-variant">Verified by Cashfree & Bank</span>
              </div>
              <span className="text-headline-md font-extrabold text-primary">₹{finalTotal.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Action Button Footer */}
        <div className="p-4 sm:p-6 bg-surface-container-lowest border-t border-outline-variant/30 flex items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="flex-1 py-3 px-4 rounded-xl border border-outline-variant/60 hover:bg-surface-container text-label-lg font-bold text-on-surface transition"
          >
            Back to Menu
          </button>
          <button
            type="button"
            onClick={handlePlaceOrderAndPay}
            disabled={isSubmitting}
            className="flex-[2] py-3 px-4 rounded-xl bg-primary hover:bg-primary-container text-on-primary font-bold text-label-lg shadow-lg active:scale-98 transition-all flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <span className="animate-spin rounded-full h-5 w-5 border-2 border-on-primary border-t-transparent"></span>
                <span>Connecting to UPI...</span>
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-xl">payments</span>
                <span>
                  {paymentMethod === 'UPI' ? `Pay with UPI • ₹${finalTotal.toFixed(0)}` : `Place Order • ₹${finalTotal.toFixed(0)}`}
                </span>
                <span className="material-symbols-outlined text-lg">arrow_forward</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
