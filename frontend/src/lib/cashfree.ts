import { load } from '@cashfreepayments/cashfree-js';

let cashfreePromise: Promise<any> | null = null;
let currentMode: string | null = null;

/**
 * Initialize or get cached Cashfree JS SDK instance
 */
export async function getCashfreeInstance(mode: 'SANDBOX' | 'PRODUCTION' = 'SANDBOX') {
  const targetMode = mode.toLowerCase() as 'sandbox' | 'production';

  if (!cashfreePromise || currentMode !== targetMode) {
    currentMode = targetMode;
    cashfreePromise = load({
      mode: targetMode,
    });
  }

  return await cashfreePromise;
}

/**
 * Trigger Cashfree UPI Checkout
 */
export async function launchCashfreeUPIPayment(
  paymentSessionId: string,
  mode: 'SANDBOX' | 'PRODUCTION' = 'SANDBOX',
  redirectTarget: '_modal' | '_self' | '_top' = '_modal'
): Promise<void> {
  const cashfree = await getCashfreeInstance(mode);

  if (!cashfree) {
    throw new Error('Cashfree Payment Gateway failed to initialize.');
  }

  return cashfree.checkout({
    paymentSessionId,
    redirectTarget,
  });
}
