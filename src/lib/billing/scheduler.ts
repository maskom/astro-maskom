import { supabase } from '../../lib/supabase.ts';
import { PaymentService } from '../../lib/payments/service.ts';
import { logger } from '../../lib/logger.ts';

interface ServiceSubscription {
  id: string;
  user_id: string;
  package_id: string;
  monthly_amount: number;
  billing_day: number;
  is_active: boolean;
  next_billing_date: string;
}

interface ScheduledEvent {
  cron: string;
  scheduledTime: number;
  noRetry: () => void;
}

export class BillingScheduler {
  private paymentService: PaymentService;

  constructor() {
    if (!supabase) {
      throw new Error('Supabase client is not available');
    }
    this.paymentService = new PaymentService(supabase);
  }

  async generateMonthlyInvoices(): Promise<{
    success: boolean;
    processed: number;
    errors: string[];
  }> {
    const result = { success: true, processed: 0, errors: [] as string[] };

    try {
      logger.info('Starting monthly invoice generation');

      // Get active subscriptions that need billing
      const today = new Date();

      const { data: subscriptions, error } = await supabase
        .from('service_subscriptions')
        .select('*')
        .eq('is_active', true)
        .lte('next_billing_date', today.toISOString());

      if (error) {
        throw new Error(`Failed to fetch subscriptions: ${error.message}`);
      }

      if (!subscriptions || subscriptions.length === 0) {
        logger.info('No subscriptions require billing today');
        return result;
      }

      logger.info(`Found ${subscriptions.length} subscriptions to process`);

      for (const subscription of subscriptions as ServiceSubscription[]) {
        try {
          await this.generateInvoiceForSubscription(subscription);
          result.processed++;

          // Update next billing date
          await this.updateNextBillingDate(subscription);

          logger.info(`Generated invoice for subscription ${subscription.id}`);
        } catch (error) {
          const errorMsg = `Failed to generate invoice for subscription ${subscription.id}: ${error instanceof Error ? error.message : 'Unknown error'}`;
          result.errors.push(errorMsg);
          logger.error(errorMsg);
        }
      }

      logger.info(
        `Monthly invoice generation completed. Processed: ${result.processed}, Errors: ${result.errors.length}`
      );

      return result;
    } catch (error) {
      result.success = false;
      result.errors.push(
        `Scheduler error: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
      logger.error('Monthly invoice generation failed', error);
      return result;
    }
  }

  private async generateInvoiceForSubscription(
    subscription: ServiceSubscription
  ): Promise<void> {
    // Get package details
    const { data: packageData, error: packageError } = await supabase
      .from('packages')
      .select('*')
      .eq('id', subscription.package_id)
      .single();

    if (packageError || !packageData) {
      throw new Error(`Package not found: ${subscription.package_id}`);
    }

    // Generate invoice number
    const invoiceNumber = await this.paymentService.generateInvoiceNumber();

    // Calculate amounts
    const amount = subscription.monthly_amount;
    const tax = Math.round(amount * 0.11); // 11% tax
    const total = amount + tax;

    // Set due date (30 days from now)
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 30);

    // Create invoice
    const invoice = await this.paymentService.createInvoice({
      invoiceNumber,
      userId: subscription.user_id,
      transactionId: null, // Will be set when payment is made
      amount,
      tax,
      total,
      dueDate,
      status: 'sent',
      items: [
        {
          id: '1',
          description: `${packageData.name} - Monthly Subscription`,
          quantity: 1,
          unitPrice: amount,
          total: amount,
        },
        {
          id: '2',
          description: 'Tax (11%)',
          quantity: 1,
          unitPrice: tax,
          total: tax,
        },
      ],
    });

    logger.info(
      `Created invoice ${invoice.invoiceNumber} for user ${subscription.user_id}`
    );
  }

  private async updateNextBillingDate(
    subscription: ServiceSubscription
  ): Promise<void> {
    const nextBillingDate = new Date();
    nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);
    nextBillingDate.setDate(subscription.billing_day);

    const { error } = await supabase
      .from('service_subscriptions')
      .update({
        next_billing_date: nextBillingDate.toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', subscription.id);

    if (error) {
      throw new Error(`Failed to update next billing date: ${error.message}`);
    }
  }

  async checkOverdueInvoices(): Promise<{
    success: boolean;
    processed: number;
    errors: string[];
  }> {
    const result = { success: true, processed: 0, errors: [] as string[] };

    try {
      logger.info('Checking for overdue invoices');

      const today = new Date();

      // Get invoices that are past due but not marked as overdue
      const { data: invoices, error } = await supabase
        .from('invoices')
        .select('*')
        .in('status', ['sent'])
        .lt('due_date', today.toISOString());

      if (error) {
        throw new Error(`Failed to fetch invoices: ${error.message}`);
      }

      if (!invoices || invoices.length === 0) {
        logger.info('No overdue invoices found');
        return result;
      }

      logger.info(`Found ${invoices.length} overdue invoices`);

      for (const invoice of invoices) {
        try {
          await this.paymentService.updateInvoiceStatus(invoice.id, 'overdue');
          result.processed++;

          // Send overdue notification (would integrate with notification service)
          await this.sendOverdueNotification(invoice);

          logger.info(`Marked invoice ${invoice.invoice_number} as overdue`);
        } catch (error) {
          const errorMsg = `Failed to process overdue invoice ${invoice.id}: ${error instanceof Error ? error.message : 'Unknown error'}`;
          result.errors.push(errorMsg);
          logger.error(errorMsg);
        }
      }

      logger.info(
        `Overdue invoice check completed. Processed: ${result.processed}, Errors: ${result.errors.length}`
      );

      return result;
    } catch (error) {
      result.success = false;
      result.errors.push(
        `Overdue check error: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
      logger.error('Overdue invoice check failed', error);
      return result;
    }
  }

  private async sendOverdueNotification(invoice: {
    id: string;
    user_id: string;
    invoice_number: string;
  }): Promise<void> {
    // Get user's billing preferences
    const { data: preferences, error } = await supabase
      .from('billing_preferences')
      .select('*')
      .eq('user_id', invoice.user_id)
      .single();

    if (error || !preferences?.overdue_reminders) {
      return; // User doesn't want overdue notifications
    }

    // Get user details
    const { data: user, error: userError } =
      await supabase.auth.admin.getUserById(invoice.user_id);

    if (userError || !user.user) {
      return;
    }

    // Send notification (this would integrate with your email/SMS service)
    logger.info(
      `Overdue notification sent to user ${invoice.user_id} for invoice ${invoice.invoice_number}`
    );

    // For now, just log - in production you'd send actual email/SMS
    if (preferences.email_notifications && user.user.email) {
      // TODO: Send email notification
      logger.info(
        `Email overdue notification would be sent to ${user.user.email}`
      );
    }

    if (preferences.sms_notifications) {
      // TODO: Send SMS notification
      logger.info(
        `SMS overdue notification would be sent to user ${invoice.user_id}`
      );
    }
  }
}

// Scheduled job handler for Cloudflare Workers
export async function handleScheduled(_event: ScheduledEvent): Promise<void> {
  try {
    const scheduler = new BillingScheduler();

    // Generate monthly invoices
    const invoiceResult = await scheduler.generateMonthlyInvoices();

    // Check for overdue invoices
    const overdueResult = await scheduler.checkOverdueInvoices();

    logger.info('Scheduled billing tasks completed', {
      invoices: invoiceResult,
      overdue: overdueResult,
    });
  } catch (error) {
    logger.error('Scheduled billing tasks failed', error);
  }
}
