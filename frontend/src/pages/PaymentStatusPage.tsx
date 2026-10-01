import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useSearchParams, useParams, useNavigate } from 'react-router-dom';
import { api, parseApiError } from '../lib/api';
import { useCart } from '../context/CartContext';
import type { PaymentStatusResponse, PaymentProcessState } from '../types';

export const PaymentStatusPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const params = useParams<{ orderId?: string }>();
  const navigate = useNavigate();
  const { clearCart } = useCart();

  const orderId = params.orderId || searchParams.get('order_id') || searchParams.get('orderId');

  const [paymentState, setPaymentState] = useState<PaymentProcessState>('PAYMENT_PROCESSING');
  const [paymentData, setPaymentData] = useState<PaymentStatusResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [pollCount, setPollCount] = useState<number>(0);

  const isPollingRef = useRef<boolean>(true);

  const checkStatus = useCallback(async () => {
    if (!orderId) {
      setPaymentState('PAYMENT_FAILED');
      setErrorMessage('No valid order ID was provided in the payment callback.');
      return;
    }

    try {
      // Query backend status endpoint (which synchronizes with Cashfree)
      const data = await api.payments.getStatus(orderId);
      setPaymentData(data);

      if (data.paymentStatus === 'PAID') {
        setPaymentState('PAYMENT_SUCCESS');
        clearCart();
        isPollingRef.current = false;
      } else if (data.paymentStatus === 'FAILED') {
        setPaymentState('PAYMENT_FAILED');
        setErrorMessage('The payment was declined or failed by the UPI issuing bank.');
        isPollingRef.current = false;
      } else {
        // Still pending
        setPaymentState('PAYMENT_PROCESSING');
      }
    } catch (err) {
      const msg = parseApiError(err);
      setErrorMessage(msg);
      // Don't stop immediately on intermittent network glitches
    }
  }, [orderId, clearCart]);

  useEffect(() => {
    isPollingRef.current = true;
    checkStatus();

    // Poll every 2.5 seconds up to 10 attempts (25 seconds)
    const interval = setInterval(() => {
      if (!isPollingRef.current) {
        clearInterval(interval);
        return;
      }

      setPollCount((prev) => {
        if (prev >= 10) {
          isPollingRef.current = false;
          clearInterval(interval);
          setPaymentState((currentState) =>
            currentState === 'PAYMENT_PROCESSING' ? 'PAYMENT_UNKNOWN' : currentState
          );
          return prev;
        }
        checkStatus();
        return prev + 1;
      });
    }, 2500);

    return () => {
      isPollingRef.current = false;
      clearInterval(interval);
    };
  }, [checkStatus]);

  return (
    <div className="min-h-screen bg-background text-on-surface antialiased font-sans flex flex-col justify-between p-4 sm:p-6">
      {/* Top Brand Header */}
      <header className="max-w-xl mx-auto w-full pt-4 pb-2 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="w-10 h-10 rounded-xl bg-primary-container text-on-primary-container flex items-center justify-center shadow-sm">
            <span className="material-symbols-outlined text-2xl">restaurant</span>
          </div>
          <span className="text-headline-md font-bold text-primary tracking-tight">CampusBites</span>
        </div>

        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-container border border-outline-variant/30 text-label-sm font-bold text-on-surface">
          <span className="material-symbols-outlined text-primary text-base">payments</span>
          <span>Cashfree UPI Gateway</span>
        </div>
      </header>

      {/* Main Status Container */}
      <main className="max-w-xl mx-auto w-full my-auto py-6">
        <div className="bg-surface-container-lowest rounded-3xl border border-outline-variant/40 shadow-2xl p-6 sm:p-8 space-y-6 animate-in fade-in zoom-in-95 duration-200">
          
          {/* STATE 1: PAYMENT PROCESSING / VERIFYING */}
          {paymentState === 'PAYMENT_PROCESSING' && (
            <div className="text-center space-y-6 py-6">
              <div className="relative w-24 h-24 mx-auto flex items-center justify-center">
                <span className="animate-spin rounded-full h-20 w-20 border-4 border-primary border-t-transparent inline-block"></span>
                <span className="material-symbols-outlined absolute text-primary text-3xl animate-pulse">
                  currency_rupee
                </span>
              </div>

              <div className="space-y-2">
                <span className="px-3.5 py-1 rounded-full bg-primary-fixed text-on-primary-fixed text-label-sm font-extrabold uppercase tracking-wide inline-block">
                  Verifying UPI Transaction
                </span>
                <h1 className="text-headline-md font-bold text-on-surface tracking-tight">
                  Confirming Your Payment...
                </h1>
                <p className="text-body-md text-on-surface-variant max-w-md mx-auto">
                  We are securely communicating with your UPI app and Cashfree to confirm payment authorization.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-surface-container-low border border-outline-variant/30 text-body-sm text-on-surface-variant flex items-center justify-center gap-2">
                <span className="material-symbols-outlined text-tertiary animate-spin text-lg">sync</span>
                <span>Checking bank settlement (Attempt {pollCount + 1}/10)...</span>
              </div>
            </div>
          )}

          {/* STATE 2: PAYMENT SUCCESS */}
          {paymentState === 'PAYMENT_SUCCESS' && (
            <div className="text-center space-y-6">
              {/* Success Badge */}
              <div className="w-20 h-20 rounded-3xl bg-tertiary-container text-on-tertiary-container flex items-center justify-center mx-auto shadow-lg">
                <span className="material-symbols-outlined text-5xl" data-weight="fill">
                  check_circle
                </span>
              </div>

              <div className="space-y-1.5">
                <span className="px-3.5 py-1 rounded-full bg-tertiary-container/20 text-tertiary text-label-sm font-extrabold uppercase tracking-wide inline-block">
                  Payment Verified • Order Placed
                </span>
                <h1 className="text-headline-lg font-extrabold text-on-surface tracking-tight">
                  ₹{Number(paymentData?.paymentAmount || paymentData?.order?.totalAmount || 0).toFixed(0)} Paid Successfully!
                </h1>
                <p className="text-body-md text-on-surface-variant">
                  Your payment has been settled. The canteen kitchen has received your order ticket!
                </p>
              </div>

              {/* Order Receipt Details Card */}
              <div className="p-5 rounded-2xl bg-surface-container-low border border-outline-variant/30 text-left space-y-3.5">
                <div className="flex items-center justify-between pb-3 border-b border-outline-variant/20">
                  <div>
                    <span className="text-label-sm text-on-surface-variant block">Order Number</span>
                    <span className="text-headline-sm font-extrabold text-primary">
                      {paymentData?.orderNumber || paymentData?.order?.orderNumber}
                    </span>
                  </div>
                  <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-label-sm font-bold border border-emerald-300">
                    Paid via UPI
                  </span>
                </div>

                <div className="space-y-1.5 text-body-sm">
                  <div className="flex justify-between text-on-surface-variant">
                    <span>Canteen Stall:</span>
                    <span className="font-bold text-on-surface">
                      {paymentData?.order?.provider?.name || 'Campus Canteen'}
                    </span>
                  </div>
                  <div className="flex justify-between text-on-surface-variant">
                    <span>Pickup Counter:</span>
                    <span className="font-semibold text-on-surface">
                      {paymentData?.order?.provider?.counterNumber || 'Counter 01'}
                    </span>
                  </div>
                  <div className="flex justify-between text-on-surface-variant">
                    <span>Pickup Slot:</span>
                    <span className="font-semibold text-on-surface">
                      {paymentData?.order?.pickupPreference || 'Pick up ASAP'}
                    </span>
                  </div>
                  <div className="flex justify-between text-on-surface-variant">
                    <span>Dining Type:</span>
                    <span className="font-semibold text-on-surface">
                      {paymentData?.order?.diningType || 'Takeaway'}
                    </span>
                  </div>
                  {paymentData?.gatewayPaymentId && (
                    <div className="flex justify-between text-on-surface-variant">
                      <span>Gateway Ref:</span>
                      <span className="font-mono text-xs text-outline">{paymentData.gatewayPaymentId}</span>
                    </div>
                  )}
                </div>

                {/* Items Preview */}
                {paymentData?.order?.items && paymentData.order.items.length > 0 && (
                  <div className="pt-3 border-t border-outline-variant/20 space-y-1.5">
                    <span className="text-label-sm font-bold text-on-surface-variant block">Ordered Items:</span>
                    {paymentData.order.items.map((it) => (
                      <div key={it.id} className="flex justify-between text-body-sm">
                        <span className="text-on-surface font-medium">
                          {it.quantity}x {it.itemName}
                        </span>
                        <span className="font-semibold text-on-surface">
                          ₹{(Number(it.price) * it.quantity).toFixed(0)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="space-y-3 pt-2">
                <button
                  type="button"
                  onClick={() => navigate('/customer')}
                  className="w-full py-3.5 px-4 rounded-xl bg-primary hover:bg-primary-container text-on-primary font-bold text-label-lg shadow-lg active:scale-98 transition flex items-center justify-center gap-2"
                >
                  <span className="material-symbols-outlined text-xl">receipt_long</span>
                  <span>Track in My Orders</span>
                </button>

                <button
                  type="button"
                  onClick={() => navigate('/customer')}
                  className="w-full py-2.5 px-4 rounded-xl border border-outline-variant/50 hover:bg-surface-container text-label-md font-semibold text-on-surface-variant transition"
                >
                  Back to Food Menu
                </button>
              </div>
            </div>
          )}

          {/* STATE 3: PAYMENT FAILED */}
          {paymentState === 'PAYMENT_FAILED' && (
            <div className="text-center space-y-6">
              <div className="w-20 h-20 rounded-3xl bg-error-container text-on-error-container flex items-center justify-center mx-auto shadow-md">
                <span className="material-symbols-outlined text-5xl">cancel</span>
              </div>

              <div className="space-y-2">
                <span className="px-3.5 py-1 rounded-full bg-error-container text-on-error-container text-label-sm font-extrabold uppercase tracking-wide inline-block">
                  Payment Unsuccessful
                </span>
                <h1 className="text-headline-md font-bold text-on-surface tracking-tight">
                  Payment Could Not Be Completed
                </h1>
                <p className="text-body-md text-on-surface-variant max-w-md mx-auto">
                  {errorMessage || 'The transaction was cancelled in the UPI app or could not be verified by the gateway.'}
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-surface-container-low border border-outline-variant/30 text-body-sm text-left space-y-1.5">
                <div className="flex items-center gap-2 text-primary font-bold">
                  <span className="material-symbols-outlined text-base">info</span>
                  <span>No Money Deducted?</span>
                </div>
                <p className="text-on-surface-variant">
                  If money was deducted from your bank account, Cashfree will automatically reconcile and confirm the order within a few minutes.
                </p>
              </div>

              <div className="space-y-3 pt-2">
                <button
                  type="button"
                  onClick={() => navigate('/customer')}
                  className="w-full py-3.5 px-4 rounded-xl bg-primary hover:bg-primary-container text-on-primary font-bold text-label-lg shadow-md active:scale-98 transition flex items-center justify-center gap-2"
                >
                  <span className="material-symbols-outlined text-xl">refresh</span>
                  <span>Try Payment Again</span>
                </button>

                <button
                  type="button"
                  onClick={() => navigate('/customer')}
                  className="w-full py-2.5 px-4 rounded-xl border border-outline-variant/50 hover:bg-surface-container text-label-md font-semibold text-on-surface-variant transition"
                >
                  Return to Canteen Menu
                </button>
              </div>
            </div>
          )}

          {/* STATE 4: TIMEOUT / UNKNOWN VERIFICATION */}
          {paymentState === 'PAYMENT_UNKNOWN' && (
            <div className="text-center space-y-6">
              <div className="w-20 h-20 rounded-3xl bg-secondary-fixed text-on-secondary-fixed flex items-center justify-center mx-auto shadow-md">
                <span className="material-symbols-outlined text-5xl">hourglass_top</span>
              </div>

              <div className="space-y-2">
                <span className="px-3.5 py-1 rounded-full bg-secondary-fixed text-on-secondary-fixed text-label-sm font-extrabold uppercase tracking-wide inline-block">
                  Verification In Progress
                </span>
                <h1 className="text-headline-md font-bold text-on-surface tracking-tight">
                  Bank Confirmation Pending
                </h1>
                <p className="text-body-md text-on-surface-variant max-w-md mx-auto">
                  Your UPI app is processing the payment. As soon as the webhook arrives from Cashfree, your order will automatically be confirmed.
                </p>
              </div>

              <div className="space-y-3 pt-2">
                <button
                  type="button"
                  onClick={checkStatus}
                  className="w-full py-3.5 px-4 rounded-xl bg-primary hover:bg-primary-container text-on-primary font-bold text-label-lg shadow-md active:scale-98 transition flex items-center justify-center gap-2"
                >
                  <span className="material-symbols-outlined text-xl">sync</span>
                  <span>Re-check Payment Status</span>
                </button>

                <button
                  type="button"
                  onClick={() => navigate('/customer')}
                  className="w-full py-2.5 px-4 rounded-xl border border-outline-variant/50 hover:bg-surface-container text-label-md font-semibold text-on-surface-variant transition"
                >
                  View My Orders
                </button>
              </div>
            </div>
          )}

        </div>
      </main>

      {/* Footer Security Badge */}
      <footer className="max-w-xl mx-auto w-full py-3 text-center text-body-sm text-on-surface-variant flex items-center justify-center gap-1.5">
        <span className="material-symbols-outlined text-sm text-tertiary">lock</span>
        <span>256-Bit Encrypted Payments Powered by Cashfree Payments</span>
      </footer>
    </div>
  );
};
