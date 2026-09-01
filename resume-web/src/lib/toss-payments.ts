/** Toss Payments SDK v2 loader (browser only). */
type TossPayment = {
  requestPayment: (opts: Record<string, unknown>) => Promise<void>;
};

type TossPaymentsInstance = {
  payment: (opts: { customerKey: string }) => TossPayment;
};

type TossPaymentsFactory = (clientKey: string) => TossPaymentsInstance;

declare global {
  interface Window {
    TossPayments?: TossPaymentsFactory;
  }
}

const SDK_URL = 'https://js.tosspayments.com/v2/standard';

export async function loadTossPayments(clientKey: string): Promise<TossPaymentsInstance> {
  if (!clientKey) {
    throw new Error('client key missing');
  }
  if (!window.TossPayments) {
    await new Promise<void>((resolve, reject) => {
      const existing = document.querySelector<HTMLScriptElement>(`script[src="${SDK_URL}"]`);
      if (existing) {
        existing.addEventListener('load', () => resolve());
        existing.addEventListener('error', () => reject(new Error('Toss SDK load failed')));
        return;
      }
      const script = document.createElement('script');
      script.src = SDK_URL;
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Toss SDK load failed'));
      document.head.appendChild(script);
    });
  }
  if (!window.TossPayments) {
    throw new Error('TossPayments not available');
  }
  return window.TossPayments(clientKey);
}
