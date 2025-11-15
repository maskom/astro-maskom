export { MidtransGateway } from './gateway';
export { PaymentService } from './service';
export { PaymentManager } from './manager';
export * from './types';

import { supabase } from '../supabase';
import type { PaymentGatewayConfig } from './types';

let paymentManager: ReturnType<typeof PaymentManager> | null = null;

export function getPaymentManager(): ReturnType<typeof PaymentManager> {
  if (!paymentManager) {
    const config: PaymentGatewayConfig = {
      serverKey: import.meta.env.MIDTRANS_SERVER_KEY || '',
      clientKey: import.meta.env.MIDTRANS_CLIENT_KEY || '',
      environment: (import.meta.env.MIDTRANS_ENVIRONMENT as 'sandbox' | 'production') || 'sandbox',
      merchantId: import.meta.env.MIDTRANS_MERCHANT_ID || '',
    };

    if (!config.serverKey || !config.clientKey) {
      throw new Error('Midtrans credentials are not configured');
    }

    paymentManager = new PaymentManager(supabase, config);
  }

  return paymentManager;
}