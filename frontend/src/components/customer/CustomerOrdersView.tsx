import React, { useState, useEffect } from 'react';
import { api, parseApiError } from '../../lib/api';
import type { Order, OrderStatus } from '../../types';

interface CustomerOrdersViewProps {
  onBackToMenu: () => void;
}

const statusConfig: Record<OrderStatus, { label: string; bg: string; text: string; icon: string; step: number }> = {
  PLACED: { label: 'Order Received', bg: 'bg-primary-fixed', text: 'text-on-primary-fixed-variant', icon: 'receipt_long', step: 1 },
  ACCEPTED: { label: 'Accepted by Kitchen', bg: 'bg-secondary-fixed', text: 'text-on-secondary-fixed', icon: 'check_circle', step: 2 },
  PREPARING: { label: 'Cooking & Prepping', bg: 'bg-secondary-container', text: 'text-on-secondary-container', icon: 'soup_kitchen', step: 3 },
  READY: { label: 'Ready for Pickup!', bg: 'bg-tertiary-container', text: 'text-on-tertiary-container', icon: 'notifications_active', step: 4 },
  COMPLETED: { label: 'Completed', bg: 'bg-surface-container-high', text: 'text-on-surface-variant', icon: 'done_all', step: 5 },
  REJECTED: { label: 'Rejected', bg: 'bg-error-container', text: 'text-on-error-container', icon: 'cancel', step: 0 },
  CANCELLED: { label: 'Cancelled', bg: 'bg-surface-container', text: 'text-outline', icon: 'block', step: 0 },
};

export const CustomerOrdersView: React.FC<CustomerOrdersViewProps> = ({ onBackToMenu }) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [filterTab, setFilterTab] = useState<'ACTIVE' | 'HISTORY'>('ACTIVE');

  const fetchOrders = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await api.orders.getMyOrders();
      setOrders(data);
    } catch (err) {
      setError(parseApiError(err));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const activeOrders = orders.filter((o) => ['PLACED', 'ACCEPTED', 'PREPARING', 'READY'].includes(o.status));
  const pastOrders = orders.filter((o) => ['COMPLETED', 'REJECTED', 'CANCELLED'].includes(o.status));

  const displayOrders = filterTab === 'ACTIVE' ? activeOrders : pastOrders;

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-headline-sm font-bold text-on-surface">My Canteen Orders</h2>
          <p className="text-body-sm text-on-surface-variant">
            Live order tracking and pickup status.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={fetchOrders}
            className="p-2 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface transition flex items-center gap-1.5 text-label-sm font-semibold"
            title="Refresh Orders"
          >
            <span className="material-symbols-outlined text-base">refresh</span>
            <span className="hidden sm:inline">Refresh</span>
          </button>
          <button
            type="button"
            onClick={onBackToMenu}
            className="px-4 py-2 rounded-xl bg-primary text-on-primary font-bold text-label-sm hover:bg-primary-container transition"
          >
            Browse Menu
          </button>
        </div>
      </div>

      {/* Segment Tabs */}
      <div className="flex border-b border-outline-variant/30 gap-2">
        <button
          type="button"
          onClick={() => setFilterTab('ACTIVE')}
          className={`pb-3 px-4 font-bold text-label-lg transition-all relative ${
            filterTab === 'ACTIVE'
              ? 'text-primary'
              : 'text-on-surface-variant hover:text-on-surface'
          }`}
        >
          <span>Active Orders ({activeOrders.length})</span>
          {filterTab === 'ACTIVE' && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full"></span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setFilterTab('HISTORY')}
          className={`pb-3 px-4 font-bold text-label-lg transition-all relative ${
            filterTab === 'HISTORY'
              ? 'text-primary'
              : 'text-on-surface-variant hover:text-on-surface'
          }`}
        >
          <span>Order History ({pastOrders.length})</span>
          {filterTab === 'HISTORY' && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full"></span>
          )}
        </button>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="p-4 rounded-xl bg-error-container text-on-error-container border border-error/40 flex items-center gap-2 text-body-sm">
          <span className="material-symbols-outlined text-lg">error</span>
          <span>{error}</span>
        </div>
      )}

      {/* Orders List Content */}
      {isLoading ? (
        <div className="p-12 text-center bg-surface-container-lowest rounded-2xl border border-outline-variant/30">
          <span className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent inline-block mb-3"></span>
          <p className="text-body-md text-on-surface-variant font-medium">Fetching your orders...</p>
        </div>
      ) : displayOrders.length === 0 ? (
        <div className="p-12 text-center bg-surface-container-lowest rounded-2xl border border-outline-variant/30 space-y-3">
          <div className="w-16 h-16 rounded-2xl bg-surface-container mx-auto flex items-center justify-center text-outline">
            <span className="material-symbols-outlined text-3xl">receipt_long</span>
          </div>
          <h3 className="text-headline-sm font-bold text-on-surface">
            {filterTab === 'ACTIVE' ? 'No Active Orders' : 'No Previous Orders'}
          </h3>
          <p className="text-body-sm text-on-surface-variant max-w-sm mx-auto">
            {filterTab === 'ACTIVE'
              ? "You don't have any ongoing canteen orders right now. Explore today's specials and place an order!"
              : "You haven't completed any previous orders yet."}
          </p>
          {filterTab === 'ACTIVE' && (
            <button
              type="button"
              onClick={onBackToMenu}
              className="px-5 py-2.5 rounded-xl bg-primary text-on-primary font-bold text-label-md shadow-md inline-flex items-center gap-2 hover:bg-primary-container transition"
            >
              <span className="material-symbols-outlined text-lg">restaurant_menu</span>
              <span>Go to Menu</span>
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {displayOrders.map((order) => {
            const config = statusConfig[order.status] || statusConfig.PLACED;
            const dateStr = new Date(order.createdAt).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            });

            return (
              <article
                key={order.id}
                className="bg-surface-container-lowest rounded-2xl border border-outline-variant/30 card-shadow overflow-hidden p-5 space-y-4"
              >
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-outline-variant/20">
                  <div className="flex items-center gap-2.5">
                    <span className="text-headline-md font-extrabold text-primary">{order.orderNumber}</span>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-label-sm font-bold flex items-center gap-1 ${config.bg} ${config.text}`}
                    >
                      <span className="material-symbols-outlined text-sm">{config.icon}</span>
                      <span>{config.label}</span>
                    </span>
                  </div>

                  <div className="text-right sm:text-right">
                    <span className="text-body-sm text-on-surface-variant block font-medium">Placed at {dateStr}</span>
                    <span className="text-label-sm font-bold text-on-surface">
                      {order.provider?.name || 'Stall'} • {order.provider?.counterNumber || 'Counter'}
                    </span>
                  </div>
                </div>

                {/* Status Stepper Progress Bar (for Active Orders) */}
                {['PLACED', 'ACCEPTED', 'PREPARING', 'READY'].includes(order.status) && (
                  <div className="bg-surface-container-low p-3 rounded-xl space-y-2">
                    <div className="flex items-center justify-between text-label-sm font-bold text-on-surface">
                      <span className={order.status === 'PLACED' ? 'text-primary' : ''}>1. Received</span>
                      <span className={order.status === 'ACCEPTED' ? 'text-secondary' : ''}>2. Accepted</span>
                      <span className={order.status === 'PREPARING' ? 'text-secondary' : ''}>3. Preparing</span>
                      <span className={order.status === 'READY' ? 'text-tertiary font-extrabold' : ''}>4. Ready!</span>
                    </div>
                    <div className="w-full bg-surface-container-highest h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-primary h-full transition-all duration-500 rounded-full"
                        style={{
                          width:
                            order.status === 'PLACED'
                              ? '25%'
                              : order.status === 'ACCEPTED'
                              ? '50%'
                              : order.status === 'PREPARING'
                              ? '75%'
                              : '100%',
                        }}
                      ></div>
                    </div>
                  </div>
                )}

                {/* Items List */}
                <div className="space-y-2">
                  <span className="text-label-sm font-bold text-on-surface-variant uppercase tracking-wide block">
                    Ordered Items:
                  </span>
                  <div className="divide-y divide-outline-variant/15">
                    {order.items?.map((item) => (
                      <div key={item.id} className="pt-2 pb-1 flex justify-between items-center text-body-sm">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-on-surface bg-surface-container px-2 py-0.5 rounded text-label-sm">
                            {item.quantity}x
                          </span>
                          <span className="text-on-surface font-medium">{item.itemName}</span>
                          {item.specialInstructions && (
                            <span className="text-outline text-xs italic">("{item.specialInstructions}")</span>
                          )}
                        </div>
                        <span className="font-semibold text-on-surface">
                          ₹{(Number(item.price) * item.quantity).toFixed(0)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Footer / Total & Preferences */}
                <div className="pt-3 border-t border-outline-variant/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-body-sm">
                  <div className="flex items-center gap-3 text-on-surface-variant">
                    <span className="flex items-center gap-1 bg-surface-container px-2.5 py-1 rounded-lg font-medium">
                      <span className="material-symbols-outlined text-sm">schedule</span>
                      <span>{order.pickupPreference}</span>
                    </span>
                    <span className="flex items-center gap-1 bg-surface-container px-2.5 py-1 rounded-lg font-medium">
                      <span className="material-symbols-outlined text-sm">lunch_dining</span>
                      <span>{order.diningType}</span>
                    </span>
                  </div>

                  <div className="flex items-baseline gap-1.5 justify-end">
                    <span className="text-label-md text-on-surface-variant">Grand Total:</span>
                    <span className="text-headline-sm font-extrabold text-primary">
                      ₹{Number(order.totalAmount).toFixed(2)}
                    </span>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
};
