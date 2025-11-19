import { MidtransGateway } from './gateway';
import { PaymentService } from './service';
import { logger } from '../logger';
import type {
  PaymentGatewayConfig,
  PaymentRequest,
  PaymentTransaction,
  WebhookNotification,
} from './types';
import type { SupabaseClient } from '@supabase/supabase-js';

export class PaymentManager {
  private gateway: MidtransGateway;
  private service: PaymentService;

  constructor(supabaseClient: SupabaseClient, config: PaymentGatewayConfig) {
    this.gateway = new MidtransGateway(config);
    this.service = new PaymentService(supabaseClient);
  }

  async processPayment(paymentRequest: PaymentRequest, userId: string) {
    try {
      const transaction = await this.service.createTransaction({
        orderId: paymentRequest.orderId,
        userId,
        amount: paymentRequest.amount,
        currency: 'IDR',
        status: 'pending',
        paymentMethod: {
          id: 'temp',
          type: 'credit_card',
          name: 'Pending',
          provider: 'Midtrans',
          isActive: true,
        },
      });

      const paymentResponse =
        await this.gateway.createTransaction(paymentRequest);

      await this.service.updateTransactionStatus(
        transaction.id,
        this.mapMidtransStatus(paymentResponse.transactionStatus),
        {
          gatewayResponse: JSON.stringify(paymentResponse),
          paymentType: paymentResponse.paymentType,
        }
      );

      return {
        transaction,
        paymentResponse,
      };
    } catch (error) {
      logger.error('Error processing payment', error instanceof Error ? error : new Error(String(error)), {
        module: 'payments',
        submodule: 'manager',
        operation: 'processPayment',
        userId,
        orderId: paymentRequest.orderId,
        amount: paymentRequest.amount,
      });
      throw error;
    }
  }

  async handleWebhook(notification: WebhookNotification) {
    try {
      const isValid = this.gateway.verifyWebhookSignature(notification);
      if (!isValid) {
        throw new Error('Invalid webhook signature');
      }

      const transaction = await this.getTransactionByOrderId(
        notification.order_id
      );
      if (!transaction) {
        throw new Error('Transaction not found');
      }

      const newStatus = this.mapMidtransStatus(notification.transaction_status);

      await this.service.updateTransactionStatus(transaction.id, newStatus, {
        webhookNotification: JSON.stringify(notification),
        fraudStatus: notification.fraud_status,
      });

      if (newStatus === 'success') {
        await this.generateInvoiceForTransaction(transaction);
      }

      return { success: true, transactionId: transaction.id };
    } catch (error) {
      logger.error('Error handling webhook', error instanceof Error ? error : new Error(String(error)), {
        module: 'payments',
        submodule: 'manager',
        operation: 'handleWebhook',
        orderId: notification.order_id,
        transactionStatus: notification.transaction_status,
      });
      throw error;
    }
  }

  async getPaymentMethods() {
    return [
      {
        id: 'credit_card',
        type: 'credit_card' as const,
        name: 'Credit Card',
        provider: 'Midtrans',
        isActive: true,
      },
      {
        id: 'bank_transfer',
        type: 'bank_transfer' as const,
        name: 'Bank Transfer',
        provider: 'Midtrans',
        isActive: true,
      },
      {
        id: 'gopay',
        type: 'ewallet' as const,
        name: 'GoPay',
        provider: 'Midtrans',
        isActive: true,
      },
      {
        id: 'shopeepay',
        type: 'ewallet' as const,
        name: 'ShopeePay',
        provider: 'Midtrans',
        isActive: true,
      },
      {
        id: 'qris',
        type: 'ewallet' as const,
        name: 'QRIS',
        provider: 'Midtrans',
        isActive: true,
      },
    ];
  }

  async getTransactionStatus(orderId: string) {
    try {
      const paymentResponse = await this.gateway.getTransactionStatus(orderId);
      const transaction = await this.getTransactionByOrderId(orderId);

      if (transaction) {
        const newStatus = this.mapMidtransStatus(
          paymentResponse.transactionStatus
        );
        if (transaction.status !== newStatus) {
          await this.service.updateTransactionStatus(
            transaction.id,
            newStatus,
            {
              gatewayResponse: JSON.stringify(paymentResponse),
            }
          );
        }
      }

      return paymentResponse;
    } catch (error) {
      logger.error('Error getting transaction status', error instanceof Error ? error : new Error(String(error)), {
        module: 'payments',
        submodule: 'manager',
        operation: 'getTransactionStatus',
        orderId,
      });
      throw error;
    }
  }

  async cancelPayment(orderId: string) {
    try {
      const paymentResponse = await this.gateway.cancelTransaction(orderId);
      const transaction = await this.getTransactionByOrderId(orderId);

      if (transaction) {
        await this.service.updateTransactionStatus(
          transaction.id,
          'cancelled',
          {
            gatewayResponse: JSON.stringify(paymentResponse),
          }
        );
      }

      return paymentResponse;
    } catch (error) {
      logger.error('Error cancelling payment', error instanceof Error ? error : new Error(String(error)), {
        module: 'payments',
        submodule: 'manager',
        operation: 'cancelPayment',
        orderId,
      });
      throw error;
    }
  }

  async refundPayment(orderId: string, amount?: number) {
    try {
      const paymentResponse = await this.gateway.refundTransaction(
        orderId,
        amount
      );
      const transaction = await this.getTransactionByOrderId(orderId);

      if (transaction) {
        await this.service.updateTransactionStatus(transaction.id, 'refund', {
          gatewayResponse: JSON.stringify(paymentResponse),
          refundAmount: amount,
        });
      }

      return paymentResponse;
    } catch (error) {
      logger.error('Error refunding payment', error instanceof Error ? error : new Error(String(error)), {
        module: 'payments',
        submodule: 'manager',
        operation: 'refundPayment',
        orderId,
        amount,
      });
      throw error;
    }
  }

  async getUserPaymentHistory(userId: string, limit = 20, offset = 0) {
    return this.service.getTransactionsByUserId(userId, limit, offset);
  }

  async getUserInvoices(userId: string, limit = 20, offset = 0) {
    return this.service.getInvoicesByUserId(userId, limit, offset);
  }

  async getInvoiceById(invoiceId: string) {
    return this.service.getInvoiceById(invoiceId);
  }

  getClientConfig() {
    return this.gateway.getClientConfig();
  }

  private mapMidtransStatus(
    midtransStatus: string
  ): PaymentTransaction['status'] {
    const statusMap: Record<string, PaymentTransaction['status']> = {
      capture: 'success',
      settlement: 'success',
      pending: 'pending',
      deny: 'failed',
      cancel: 'cancelled',
      expire: 'failed',
      refund: 'refund',
      partial_refund: 'refund',
    };

    return statusMap[midtransStatus] || 'pending';
  }

  private async generateInvoiceForTransaction(transaction: PaymentTransaction) {
    try {
      const invoiceNumber = await this.service.generateInvoiceNumber();
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 30);

      await this.service.createInvoice({
        invoiceNumber,
        userId: transaction.userId,
        transactionId: transaction.id,
        amount: transaction.amount,
        tax: Math.round(transaction.amount * 0.11),
        total: transaction.amount + Math.round(transaction.amount * 0.11),
        dueDate,
        status: 'paid',
        items: [
          {
            id: '1',
            description: 'Internet Service Payment',
            quantity: 1,
            unitPrice: transaction.amount,
            total: transaction.amount,
          },
        ],
      });
    } catch (error) {
      logger.error('Error generating invoice', error instanceof Error ? error : new Error(String(error)), {
        module: 'payments',
        submodule: 'manager',
        operation: 'generateInvoiceForTransaction',
        transactionId: transaction.id,
        userId: transaction.userId,
        amount: transaction.amount,
      });
    }
  }

  private async getTransactionByOrderId(
    orderId: string
  ): Promise<PaymentTransaction | null> {
    return this.service.getTransactionByOrderId(orderId);
  }
}
