import crypto from 'node:crypto';
import type {
  PaymentGatewayConfig,
  PaymentRequest,
  PaymentResponse,
  WebhookNotification,
} from './types';
import { logger } from '../logger';

// Midtrans API response interface
interface MidtransApiResponse {
  transaction_id?: string;
  order_id: string;
  status_code: string;
  status_message: string;
  payment_type?: string;
  transaction_status: string;
  fraud_status?: string;
  redirect_url?: string;
  token?: string;
  approval_code?: string;
  gross_amount: string;
  [key: string]: string | number | boolean | undefined;
}

export class MidtransGateway {
  private config: PaymentGatewayConfig;
  private apiUrl: string;

  constructor(config: PaymentGatewayConfig) {
    this.config = config;
    this.apiUrl =
      config.environment === 'production'
        ? 'https://api.midtrans.com/v2'
        : 'https://api.sandbox.midtrans.com/v2';
  }

  private getAuthHeader(): string {
    const authString = Buffer.from(`${this.config.serverKey}:`).toString(
      'base64'
    );
    return `Basic ${authString}`;
  }

  private createSignature(
    orderId: string,
    statusCode: string,
    grossAmount: string
  ): string {
    const input = `${orderId}${statusCode}${grossAmount}${this.config.serverKey}`;
    return crypto.createHash('sha512').update(input).digest('hex');
  }

  async createTransaction(
    paymentRequest: PaymentRequest
  ): Promise<PaymentResponse> {
    try {
      const payload = {
        transaction_details: {
          order_id: paymentRequest.orderId,
          gross_amount: paymentRequest.amount,
        },
        customer_details: {
          first_name: paymentRequest.customerDetails.firstName,
          last_name: paymentRequest.customerDetails.lastName,
          email: paymentRequest.customerDetails.email,
          phone: paymentRequest.customerDetails.phone,
          billing_address: paymentRequest.customerDetails.billingAddress,
          shipping_address: paymentRequest.customerDetails.shippingAddress,
        },
        item_details: paymentRequest.itemDetails,
        enabled_payments: this.getEnabledPaymentMethods(
          paymentRequest.paymentMethod
        ),
        callbacks: {
          finish: `${process.env.SITE_URL}/payment/finish`,
          error: `${process.env.SITE_URL}/payment/error`,
          pending: `${process.env.SITE_URL}/payment/pending`,
        },
        expiry: {
          unit: 'minutes',
          duration: 60,
        },
      };

      const response = await fetch(`${this.apiUrl}/charge`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: this.getAuthHeader(),
          Accept: 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Midtrans API error: ${response.status} - ${error}`);
      }

      const data = await response.json();
      return this.transformResponse(data);
    } catch (error) {
      logger.apiError('Error creating Midtrans transaction:', error, {
        module: 'gateway',
        operation: 'unknown',
      });
      throw error;
    }
  }

  async getTransactionStatus(orderId: string): Promise<PaymentResponse> {
    try {
      const response = await fetch(`${this.apiUrl}/${orderId}/status`, {
        method: 'GET',
        headers: {
          Authorization: this.getAuthHeader(),
          Accept: 'application/json',
        },
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Midtrans API error: ${response.status} - ${error}`);
      }

      const data = await response.json();
      return this.transformResponse(data);
    } catch (error) {
      logger.apiError('Error getting transaction status:', error, {
        module: 'gateway',
        operation: 'get',
      });
      throw error;
    }
  }

  async cancelTransaction(orderId: string): Promise<PaymentResponse> {
    try {
      const response = await fetch(`${this.apiUrl}/${orderId}/cancel`, {
        method: 'POST',
        headers: {
          Authorization: this.getAuthHeader(),
          Accept: 'application/json',
        },
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Midtrans API error: ${response.status} - ${error}`);
      }

      const data = await response.json();
      return this.transformResponse(data);
    } catch (error) {
      logger.apiError('Error cancelling transaction:', error, {
        module: 'gateway',
        operation: 'unknown',
      });
      throw error;
    }
  }

  async refundTransaction(
    orderId: string,
    amount?: number
  ): Promise<PaymentResponse> {
    try {
      const payload = amount ? { amount } : {};

      const response = await fetch(`${this.apiUrl}/${orderId}/refund`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: this.getAuthHeader(),
          Accept: 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Midtrans API error: ${response.status} - ${error}`);
      }

      const data = await response.json();
      return this.transformResponse(data);
    } catch (error) {
      logger.apiError('Error refunding transaction:', error, {
        module: 'gateway',
        operation: 'unknown',
      });
      throw error;
    }
  }

  verifyWebhookSignature(notification: WebhookNotification): boolean {
    const expectedSignature = this.createSignature(
      notification.order_id,
      notification.status_code,
      notification.gross_amount
    );

    return notification.signature_key === expectedSignature;
  }

  private getEnabledPaymentMethods(method?: string): string[] {
    if (method) {
      return [method];
    }

    return [
      'credit_card',
      'bank_transfer',
      'echannel',
      'permata_va',
      'bca_va',
      'bni_va',
      'bri_va',
      'cimb_va',
      'other_va',
      'gopay',
      'shopeepay',
      'qris',
    ];
  }

  private transformResponse(data: MidtransApiResponse): PaymentResponse {
    return {
      transactionId: data.transaction_id || data.order_id,
      orderId: data.order_id,
      statusCode: data.status_code,
      statusMessage: data.status_message,
      paymentType: data.payment_type,
      transactionStatus: data.transaction_status,
      fraudStatus: data.fraud_status,
      redirectUrl: data.redirect_url,
      token: data.token,
      approvalCode: data.approval_code,
      grossAmount: parseInt(data.gross_amount),
    };
  }

  getClientConfig(): { clientKey: string; environment: string } {
    return {
      clientKey: this.config.clientKey,
      environment: this.config.environment,
    };
  }
}
