import type { RazorpayOptions, RazorpayInstance } from '../types/razorpay';

let razorpayScriptLoadedPromise: Promise<boolean> | null = null;

/**
 * Dynamically load the official Razorpay Checkout SDK
 */
export function loadRazorpayScript(): Promise<boolean> {
  if (typeof window === 'undefined') return Promise.resolve(false);

  if (window.Razorpay) {
    return Promise.resolve(true);
  }

  if (razorpayScriptLoadedPromise) {
    return razorpayScriptLoadedPromise;
  }

  razorpayScriptLoadedPromise = new Promise((resolve) => {
    const existingScript = document.querySelector('script[src="https://checkout.razorpay.com/v1/checkout.js"]');
    if (existingScript) {
      existingScript.addEventListener('load', () => resolve(true));
      existingScript.addEventListener('error', () => resolve(false));
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => {
      console.error('Failed to load Razorpay Checkout SDK script.');
      resolve(false);
    };
    document.body.appendChild(script);
  });

  return razorpayScriptLoadedPromise;
}

/**
 * Launch official Razorpay Checkout modal
 */
export async function launchRazorpayPayment(options: RazorpayOptions): Promise<RazorpayInstance> {
  const isLoaded = await loadRazorpayScript();
  if (!isLoaded || !window.Razorpay) {
    throw new Error('Could not initialize Razorpay checkout. Please verify internet connection.');
  }

  const rzp = new window.Razorpay(options);
  rzp.open();
  return rzp;
}
