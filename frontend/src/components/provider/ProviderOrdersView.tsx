import React, { useState, useEffect } from 'react';
import { api, parseApiError } from '../../lib/api';
import type { Order, OrderStatus } from '../../types';

interface ProviderOrdersViewProps {
  providerName: string;
  counterNumber: string;
}

export const ProviderOrdersView: React.FC<ProviderOrdersViewProps> = ({
  providerName,
  counterNumber,
}) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [activeSegment, setActiveSegment] = useState<'NEW' | 'PREPARING' | 'READY' | 'COMPLETED'>('NEW');
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);
  const [audioChimeOn, setAudioChimeOn] = useState<boolean>(true);

  const fetchOrders = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await api.orders.getProviderOrders();
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

  const handleUpdateStatus = async (orderId: string, newStatus: OrderStatus) => {
    setUpdatingOrderId(orderId);
    try {
      const updated = await api.orders.updateStatus(orderId, newStatus);
      setOrders((prev) => prev.map((o) => (o.id === orderId ? updated : o)));
    } catch (err) {
      setError(parseApiError(err));
    } finally {
      setUpdatingOrderId(null);
    }
  };

  // Workflow Segments
  const newOrders = orders.filter((o) => o.status === 'PLACED');
  const preparingOrders = orders.filter((o) => ['ACCEPTED', 'PREPARING'].includes(o.status));
  const readyOrders = orders.filter((o) => o.status === 'READY');
  const completedOrders = orders.filter((o) => ['COMPLETED', 'CANCELLED', 'REJECTED'].includes(o.status));

  const currentDisplayOrders =
    activeSegment === 'NEW'
      ? newOrders
      : activeSegment === 'PREPARING'
      ? preparingOrders
      : activeSegment === 'READY'
      ? readyOrders
      : completedOrders;

  // Operational metrics
  const totalActive = newOrders.length + preparingOrders.length + readyOrders.length;
  const shiftRevenue = orders
    .filter((o) => o.status === 'COMPLETED' || o.status === 'READY' || o.status === 'PREPARING')
    .reduce((sum, o) => sum + Number(o.totalAmount), 0);

  return (
    <div className="space-y-6">
      {/* Live Operational Metrics Bento Grid */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-surface-container-lowest p-4 rounded-2xl border border-outline-variant/40 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-label-sm font-bold text-on-surface-variant uppercase tracking-wider">Live Queue</p>
            <p className="text-headline-lg font-extrabold text-primary tracking-tight">{totalActive} Active</p>
            <p className="text-body-sm text-on-surface-variant">{newOrders.length} awaiting kitchen intake</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-primary-fixed flex items-center justify-center text-on-primary-fixed">
            <span className="material-symbols-outlined text-2xl">receipt_long</span>
          </div>
        </div>

        <div className="bg-surface-container-lowest p-4 rounded-2xl border border-outline-variant/40 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-label-sm font-bold text-on-surface-variant uppercase tracking-wider">Kitchen Pace</p>
            <p className="text-headline-lg font-extrabold text-tertiary tracking-tight">Avg Prep: 8m</p>
            <p className="text-body-sm text-tertiary font-bold">⚡ Rush efficiency active</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-surface-container-high flex items-center justify-center text-tertiary">
            <span className="material-symbols-outlined text-2xl">timer</span>
          </div>
        </div>

        <div className="bg-surface-container-lowest p-4 rounded-2xl border border-outline-variant/40 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-label-sm font-bold text-on-surface-variant uppercase tracking-wider">Stall Shift Volume</p>
            <p className="text-headline-lg font-extrabold text-on-surface tracking-tight">
              ₹{shiftRevenue.toFixed(0)}
            </p>
            <p className="text-body-sm text-on-surface-variant">{orders.length} total orders recorded</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-secondary-fixed flex items-center justify-center text-on-secondary-container">
            <span className="material-symbols-outlined text-2xl">payments</span>
          </div>
        </div>
      </section>

      {/* Control Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-surface-container-lowest p-3 rounded-2xl border border-outline-variant/30">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-primary">storefront</span>
          <span className="font-bold text-label-md text-on-surface">
            {providerName} • {counterNumber}
          </span>
          <span className="px-2 py-0.5 rounded bg-tertiary-container/20 text-tertiary text-label-sm font-bold">
            Live KDS
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setAudioChimeOn((prev) => !prev)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-label-sm font-bold transition ${
              audioChimeOn
                ? 'bg-secondary-container text-on-secondary-container'
                : 'bg-surface-container text-on-surface-variant'
            }`}
          >
            <span className="material-symbols-outlined text-base">
              {audioChimeOn ? 'notifications_active' : 'notifications_off'}
            </span>
            <span>{audioChimeOn ? 'Audio Chime ON' : 'Muted'}</span>
          </button>

          <button
            type="button"
            onClick={fetchOrders}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface text-label-sm font-bold transition"
            title="Refresh Orders"
          >
            <span className="material-symbols-outlined text-base">refresh</span>
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Workflow Segmentation Tabs with Badge Counters */}
      <section className="border-b border-outline-variant/30 pb-2">
        <div className="flex space-x-2 sm:space-x-3 overflow-x-auto no-scrollbar py-1">
          <button
            type="button"
            onClick={() => setActiveSegment('NEW')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-label-lg font-bold shadow-sm whitespace-nowrap active:scale-95 transition-all ${
              activeSegment === 'NEW'
                ? 'bg-primary text-on-primary'
                : 'bg-surface-container-lowest text-on-surface hover:bg-surface-container border border-outline-variant/30'
            }`}
          >
            <span>New Orders</span>
            <span
              className={`px-2 py-0.5 rounded-full text-label-sm font-extrabold ${
                activeSegment === 'NEW' ? 'bg-on-primary text-primary' : 'bg-primary-fixed text-on-primary-fixed'
              }`}
            >
              {newOrders.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSegment('PREPARING')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-label-lg font-bold shadow-sm whitespace-nowrap active:scale-95 transition-all ${
              activeSegment === 'PREPARING'
                ? 'bg-primary text-on-primary'
                : 'bg-surface-container-lowest text-on-surface hover:bg-surface-container border border-outline-variant/30'
            }`}
          >
            <span>In Preparation</span>
            <span
              className={`px-2 py-0.5 rounded-full text-label-sm font-extrabold ${
                activeSegment === 'PREPARING'
                  ? 'bg-on-primary text-primary'
                  : 'bg-secondary-container text-on-secondary-container'
              }`}
            >
              {preparingOrders.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSegment('READY')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-label-lg font-bold shadow-sm whitespace-nowrap active:scale-95 transition-all ${
              activeSegment === 'READY'
                ? 'bg-primary text-on-primary'
                : 'bg-surface-container-lowest text-on-surface hover:bg-surface-container border border-outline-variant/30'
            }`}
          >
            <span>Ready for Pickup</span>
            <span
              className={`px-2 py-0.5 rounded-full text-label-sm font-extrabold ${
                activeSegment === 'READY'
                  ? 'bg-on-primary text-primary'
                  : 'bg-tertiary-container text-on-tertiary-container'
              }`}
            >
              {readyOrders.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSegment('COMPLETED')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-label-lg font-bold shadow-sm whitespace-nowrap active:scale-95 transition-all ${
              activeSegment === 'COMPLETED'
                ? 'bg-primary text-on-primary'
                : 'bg-surface-container-lowest text-on-surface-variant hover:bg-surface-container border border-outline-variant/30'
            }`}
          >
            <span>Completed Archive</span>
            <span className="px-2 py-0.5 rounded-full bg-surface-container-high text-on-surface-variant text-label-sm font-extrabold">
              {completedOrders.length}
            </span>
          </button>
        </div>
      </section>

      {/* Error Alert */}
      {error && (
        <div className="p-4 rounded-xl bg-error-container text-on-error-container border border-error/40 flex items-center gap-2 text-body-sm">
          <span className="material-symbols-outlined text-lg">error</span>
          <span>{error}</span>
        </div>
      )}

      {/* Tickets Workstation Grid */}
      {isLoading ? (
        <div className="p-16 text-center bg-surface-container-lowest rounded-3xl border border-outline-variant/30">
          <span className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent inline-block mb-3"></span>
          <p className="text-body-md font-medium text-on-surface-variant">Syncing live kitchen order stream...</p>
        </div>
      ) : currentDisplayOrders.length === 0 ? (
        <div className="p-16 text-center bg-surface-container-lowest rounded-3xl border border-outline-variant/30 space-y-3">
          <div className="w-16 h-16 rounded-2xl bg-surface-container mx-auto flex items-center justify-center text-outline">
            <span className="material-symbols-outlined text-3xl">soup_kitchen</span>
          </div>
          <h3 className="text-headline-sm font-bold text-on-surface">No Orders in this Section</h3>
          <p className="text-body-sm text-on-surface-variant max-w-md mx-auto">
            {activeSegment === 'NEW'
              ? 'No newly placed customer tickets at the moment. Orders will appear here in real-time!'
              : activeSegment === 'PREPARING'
              ? 'No tickets currently cooking on your workstation.'
              : activeSegment === 'READY'
              ? 'No orders waiting for customer counter pickup.'
              : 'No completed orders in the history log.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {currentDisplayOrders.map((order) => {
            const isUpdating = updatingOrderId === order.id;
            const timeAgoStr = new Date(order.createdAt).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            });

            return (
              <article
                key={order.id}
                className={`bg-surface-container-lowest rounded-2xl border shadow-sm flex flex-col justify-between overflow-hidden transition-all ${
                  order.status === 'PLACED'
                    ? 'border-l-4 border-l-primary border-outline-variant/40'
                    : order.status === 'PREPARING' || order.status === 'ACCEPTED'
                    ? 'border-l-4 border-l-secondary-container border-outline-variant/40'
                    : order.status === 'READY'
                    ? 'border-l-4 border-l-tertiary border-outline-variant/40'
                    : 'border-outline-variant/30 opacity-80'
                }`}
              >
                <div>
                  {/* Ticket Header Bar */}
                  <div className="p-4 bg-surface-container-low/50 flex justify-between items-start border-b border-outline-variant/20">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-headline-md font-extrabold text-primary">
                          {order.orderNumber}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded text-label-sm font-extrabold uppercase ${
                            order.status === 'PLACED'
                              ? 'bg-primary-fixed text-on-primary-fixed-variant'
                              : order.status === 'PREPARING'
                              ? 'bg-secondary-fixed text-on-secondary-fixed'
                              : order.status === 'READY'
                              ? 'bg-tertiary-fixed text-on-tertiary-fixed'
                              : 'bg-surface-container text-on-surface-variant'
                          }`}
                        >
                          {order.status}
                        </span>

                        {order.payment?.status === 'PAID' && (
                          <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-label-sm font-bold border border-emerald-300 flex items-center gap-1">
                            <span className="material-symbols-outlined text-xs">verified</span>
                            <span>PAID</span>
                          </span>
                        )}
                      </div>
                      <p className="text-body-md font-bold text-on-surface mt-0.5">
                        {order.customer?.fullName || 'Campus Student'}
                      </p>
                    </div>

                    <div className="text-right">
                      <div className="inline-flex items-center gap-1 text-label-sm font-bold bg-surface-container px-2 py-1 rounded-md text-on-surface">
                        <span className="material-symbols-outlined text-xs">schedule</span>
                        <span>{timeAgoStr}</span>
                      </div>
                      <p className="text-body-sm font-medium text-on-surface-variant mt-1">
                        {order.diningType}
                      </p>
                    </div>
                  </div>

                  {/* Items Checklist */}
                  <div className="p-4 space-y-3">
                    <div className="space-y-2">
                      {order.items?.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-start justify-between border-b border-outline-variant/15 pb-2.5"
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="w-5 h-5 rounded-full bg-primary-container text-on-primary-container text-label-sm flex items-center justify-center font-bold">
                                {item.quantity}
                              </span>
                              <p className="text-body-md font-bold text-on-surface">{item.itemName}</p>
                            </div>

                            {item.specialInstructions && (
                              <div className="ml-7 p-1.5 rounded-lg bg-surface-container-high border border-outline-variant/30">
                                <p className="text-label-sm font-bold text-primary flex items-center gap-1">
                                  <span className="material-symbols-outlined text-xs">warning</span>
                                  Instructions:
                                </p>
                                <p className="text-body-sm font-semibold text-on-surface">
                                  {item.specialInstructions}
                                </p>
                              </div>
                            )}
                          </div>

                          <span className="text-body-md font-bold text-on-surface">
                            ₹{(Number(item.price) * item.quantity).toFixed(0)}
                          </span>
                        </div>
                      ))}
                    </div>

                    {order.notes && (
                      <div className="p-2 bg-surface-container rounded-xl text-body-sm text-on-surface">
                        <span className="font-bold text-primary">Chef Note:</span> {order.notes}
                      </div>
                    )}
                  </div>
                </div>

                {/* Ticket Footer & Actions */}
                <div className="p-4 bg-surface-bright border-t border-outline-variant/20 space-y-2.5">
                  <div className="flex items-center justify-between text-body-sm text-on-surface-variant">
                    <span>
                      {order.items?.length || 0} Items • {order.pickupPreference}
                    </span>
                    <span className="text-headline-sm font-extrabold text-on-surface">
                      ₹{Number(order.totalAmount).toFixed(0)}
                    </span>
                  </div>

                  {/* Action Buttons based on workflow */}
                  <div className="flex items-center gap-2 pt-1">
                    {order.status === 'PLACED' && (
                      <>
                        <button
                          type="button"
                          disabled={isUpdating}
                          onClick={() => handleUpdateStatus(order.id, 'PREPARING')}
                          className="flex-1 py-2.5 px-3 rounded-xl bg-primary hover:bg-primary-container text-on-primary text-label-md font-bold active:scale-95 transition shadow-sm flex items-center justify-center gap-1.5"
                        >
                          <span className="material-symbols-outlined text-base">soup_kitchen</span>
                          <span>Start Cooking</span>
                        </button>
                        <button
                          type="button"
                          disabled={isUpdating}
                          onClick={() => handleUpdateStatus(order.id, 'CANCELLED')}
                          className="p-2.5 rounded-xl border border-outline-variant/50 hover:bg-error-container hover:text-error text-on-surface-variant transition"
                          title="Reject / Cancel"
                        >
                          <span className="material-symbols-outlined text-base">cancel</span>
                        </button>
                      </>
                    )}

                    {(order.status === 'ACCEPTED' || order.status === 'PREPARING') && (
                      <button
                        type="button"
                        disabled={isUpdating}
                        onClick={() => handleUpdateStatus(order.id, 'READY')}
                        className="w-full py-2.5 px-3 rounded-xl bg-tertiary text-on-tertiary text-label-md font-bold hover:bg-tertiary-container active:scale-95 transition shadow-sm flex items-center justify-center gap-1.5"
                      >
                        <span className="material-symbols-outlined text-base">check_circle</span>
                        <span>Mark Ready for Pickup</span>
                      </button>
                    )}

                    {order.status === 'READY' && (
                      <button
                        type="button"
                        disabled={isUpdating}
                        onClick={() => handleUpdateStatus(order.id, 'COMPLETED')}
                        className="w-full py-2.5 px-3 rounded-xl bg-inverse-surface text-inverse-on-surface text-label-md font-bold hover:opacity-90 active:scale-95 transition shadow-sm flex items-center justify-center gap-1.5"
                      >
                        <span className="material-symbols-outlined text-base">done_all</span>
                        <span>Handed Over (Complete)</span>
                      </button>
                    )}

                    {['COMPLETED', 'CANCELLED', 'REJECTED'].includes(order.status) && (
                      <div className="w-full py-1 text-center text-label-sm font-semibold text-outline">
                        Order Archived ({order.status})
                      </div>
                    )}
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
