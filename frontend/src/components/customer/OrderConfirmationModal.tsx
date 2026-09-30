import React from 'react';
import type { Order } from '../../types';

interface OrderConfirmationModalProps {
  order: Order | null;
  isOpen: boolean;
  onClose: () => void;
  onViewOrders: () => void;
}

export const OrderConfirmationModal: React.FC<OrderConfirmationModalProps> = ({
  order,
  isOpen,
  onClose,
  onViewOrders,
}) => {
  if (!isOpen || !order) return null;

  const stallName = order.provider?.name || 'Campus Canteen';
  const counterNumber = order.provider?.counterNumber || 'Counter 01';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-on-background/60 backdrop-blur-sm">
      <div className="bg-surface-container-lowest rounded-3xl w-full max-w-md border border-outline-variant/40 shadow-2xl overflow-hidden p-6 space-y-5 animate-in fade-in zoom-in-95 duration-200">
        {/* Success Icon Badge */}
        <div className="text-center space-y-3">
          <div className="w-16 h-16 rounded-3xl bg-tertiary-container text-on-tertiary-container flex items-center justify-center mx-auto shadow-md">
            <span className="material-symbols-outlined text-4xl" data-weight="fill">
              check_circle
            </span>
          </div>

          <div>
            <span className="px-3 py-1 rounded-full bg-primary-fixed text-on-primary-fixed text-label-sm font-extrabold uppercase tracking-wide">
              Order Placed Successfully
            </span>
            <h2 className="text-headline-md font-extrabold text-on-surface mt-2 tracking-tight">
              Order {order.orderNumber}
            </h2>
            <p className="text-body-md text-on-surface-variant mt-1">
              Your order ticket has been transmitted to the kitchen!
            </p>
          </div>
        </div>

        {/* Order Details Card */}
        <div className="p-4 rounded-2xl bg-surface-container-low border border-outline-variant/30 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-outline-variant/20">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">storefront</span>
              <span className="text-label-md font-bold text-on-surface">{stallName}</span>
            </div>
            <span className="text-label-sm font-bold text-primary bg-primary-fixed/50 px-2 py-0.5 rounded">
              {counterNumber}
            </span>
          </div>

          <div className="space-y-1.5 text-body-sm">
            <div className="flex justify-between text-on-surface-variant">
              <span>Status:</span>
              <span className="font-bold text-tertiary uppercase">{order.status}</span>
            </div>
            <div className="flex justify-between text-on-surface-variant">
              <span>Pickup Preference:</span>
              <span className="font-semibold text-on-surface">{order.pickupPreference}</span>
            </div>
            <div className="flex justify-between text-on-surface-variant">
              <span>Dining Type:</span>
              <span className="font-semibold text-on-surface">{order.diningType}</span>
            </div>
            <div className="flex justify-between text-on-surface-variant">
              <span>Payment Status:</span>
              <span className="font-semibold text-secondary">{order.payment?.status || 'PENDING'} (1-Tap Card)</span>
            </div>
          </div>

          {/* Items Preview */}
          <div className="pt-2 border-t border-outline-variant/20">
            <span className="text-label-sm font-bold text-on-surface-variant block mb-1">
              Items ({order.items?.length || 0}):
            </span>
            <div className="space-y-1">
              {order.items?.map((item) => (
                <div key={item.id} className="flex justify-between text-body-sm">
                  <span className="text-on-surface font-medium">
                    {item.quantity}x {item.itemName}
                  </span>
                  <span className="text-on-surface-variant font-semibold">
                    ₹{(Number(item.price) * item.quantity).toFixed(0)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-2 border-t border-outline-variant/20 flex justify-between items-baseline">
            <span className="text-label-md font-bold text-on-surface">Total Amount:</span>
            <span className="text-headline-sm font-extrabold text-primary">
              ₹{Number(order.totalAmount).toFixed(2)}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2 pt-1">
          <button
            type="button"
            onClick={onViewOrders}
            className="w-full py-3 px-4 rounded-xl bg-primary hover:bg-primary-container text-on-primary font-bold text-label-lg shadow-md active:scale-98 transition flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined text-lg">receipt_long</span>
            <span>View in My Orders</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 px-4 rounded-xl border border-outline-variant/50 hover:bg-surface-container text-label-md font-semibold text-on-surface-variant transition"
          >
            Continue Browsing Menu
          </button>
        </div>
      </div>
    </div>
  );
};
