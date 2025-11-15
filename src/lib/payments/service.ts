import type {
  PaymentTransaction,
  Invoice,
  PaymentMethod,
  InvoiceItem,
} from './types';
import type { SupabaseClient } from '@supabase/supabase-js';

export class PaymentService {
  private supabase: SupabaseClient;

  constructor(supabaseClient: SupabaseClient) {
    this.supabase = supabaseClient;
  }

  async createTransaction(
    transactionData: Omit<PaymentTransaction, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<PaymentTransaction> {
    try {
      const { data, error } = await this.supabase
        .from('payment_transactions')
        .insert({
          ...transactionData,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;
      return this.transformTransactionData(data);
    } catch (error) {
      console.error('Error creating payment transaction:', error);
      throw error;
    }
  }

  async updateTransactionStatus(
    transactionId: string,
    status: PaymentTransaction['status'],
    metadata?: Record<string, unknown>
  ): Promise<PaymentTransaction> {
    try {
      const { data, error } = await this.supabase
        .from('payment_transactions')
        .update({
          status,
          metadata: metadata || {},
          updated_at: new Date().toISOString(),
        })
        .eq('id', transactionId)
        .select()
        .single();

      if (error) throw error;
      return this.transformTransactionData(data);
    } catch (error) {
      console.error('Error updating transaction status:', error);
      throw error;
    }
  }

  async getTransactionById(
    transactionId: string
  ): Promise<PaymentTransaction | null> {
    try {
      const { data, error } = await this.supabase
        .from('payment_transactions')
        .select('*')
        .eq('id', transactionId)
        .single();

      if (error) return null;
      return this.transformTransactionData(data);
    } catch (error) {
      console.error('Error getting transaction:', error);
      throw error;
    }
  }

  async getTransactionByOrderId(
    orderId: string
  ): Promise<PaymentTransaction | null> {
    try {
      const { data, error } = await this.supabase
        .from('payment_transactions')
        .select('*')
        .eq('order_id', orderId)
        .single();

      if (error) return null;
      return this.transformTransactionData(data);
    } catch (error) {
      console.error('Error getting transaction by order ID:', error);
      throw error;
    }
  }

  async getTransactionsByUserId(
    userId: string,
    limit = 20,
    offset = 0
  ): Promise<PaymentTransaction[]> {
    try {
      const { data, error } = await this.supabase
        .from('payment_transactions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) throw error;
      return data.map(this.transformTransactionData);
    } catch (error) {
      console.error('Error getting user transactions:', error);
      throw error;
    }
  }

  async createInvoice(
    invoiceData: Omit<Invoice, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<Invoice> {
    try {
      const { data, error } = await this.supabase
        .from('invoices')
        .insert({
          ...invoiceData,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;
      return this.transformInvoiceData(data);
    } catch (error) {
      console.error('Error creating invoice:', error);
      throw error;
    }
  }

  async updateInvoiceStatus(
    invoiceId: string,
    status: Invoice['status']
  ): Promise<Invoice> {
    try {
      const { data, error } = await this.supabase
        .from('invoices')
        .update({
          status,
          updated_at: new Date().toISOString(),
        })
        .eq('id', invoiceId)
        .select()
        .single();

      if (error) throw error;
      return this.transformInvoiceData(data);
    } catch (error) {
      console.error('Error updating invoice status:', error);
      throw error;
    }
  }

  async getInvoiceById(invoiceId: string): Promise<Invoice | null> {
    try {
      const { data, error } = await this.supabase
        .from('invoices')
        .select(
          `
          *,
          invoice_items (*)
        `
        )
        .eq('id', invoiceId)
        .single();

      if (error) return null;
      return this.transformInvoiceData(data);
    } catch (error) {
      console.error('Error getting invoice:', error);
      throw error;
    }
  }

  async getInvoicesByUserId(
    userId: string,
    limit = 20,
    offset = 0
  ): Promise<Invoice[]> {
    try {
      const { data, error } = await this.supabase
        .from('invoices')
        .select(
          `
          *,
          invoice_items (*)
        `
        )
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) throw error;
      return data.map(this.transformInvoiceData);
    } catch (error) {
      console.error('Error getting user invoices:', error);
      throw error;
    }
  }

  async generateInvoiceNumber(): Promise<string> {
    try {
      const prefix = 'INV';
      const year = new Date().getFullYear();
      const month = String(new Date().getMonth() + 1).padStart(2, '0');

      const { data, error } = await this.supabase
        .from('invoices')
        .select('invoice_number')
        .like('invoice_number', `${prefix}${year}${month}%`)
        .order('invoice_number', { ascending: false })
        .limit(1);

      if (error) throw error;

      let sequence = 1;
      if (data && data.length > 0) {
        const lastInvoice = data[0].invoice_number;
        const lastSequence = parseInt(lastInvoice.slice(-4));
        sequence = lastSequence + 1;
      }

      return `${prefix}${year}${month}${String(sequence).padStart(4, '0')}`;
    } catch (error) {
      console.error('Error generating invoice number:', error);
      throw error;
    }
  }

  private transformTransactionData(
    data: Record<string, unknown>
  ): PaymentTransaction {
    return {
      id: data.id as string,
      orderId: data.order_id as string,
      userId: data.user_id as string,
      amount: data.amount as number,
      currency: data.currency as string,
      status: data.status as PaymentTransaction['status'],
      paymentMethod: data.payment_method as PaymentMethod,
      createdAt: new Date(data.created_at as string),
      updatedAt: new Date(data.updated_at as string),
      metadata: data.metadata as Record<string, unknown> | undefined,
    };
  }

  private transformInvoiceData(data: Record<string, unknown>): Invoice {
    return {
      id: data.id as string,
      invoiceNumber: data.invoice_number as string,
      userId: data.user_id as string,
      transactionId: data.transaction_id as string,
      amount: data.amount as number,
      tax: data.tax as number,
      total: data.total as number,
      dueDate: new Date(data.due_date as string),
      status: data.status as Invoice['status'],
      items: (data.invoice_items as InvoiceItem[]) || [],
      createdAt: new Date(data.created_at as string),
      updatedAt: new Date(data.updated_at as string),
    };
  }
}
