import { getPaymentManager } from '../../../lib/payments';
import { supabase } from '../../../lib/supabase';
import type { APIRoute } from 'astro';
import type { Invoice } from '../../../lib/payments/types';

export const GET: APIRoute = async ({ request }) => {
  try {
    const url = new URL(request.url);
    const invoiceId = url.searchParams.get('id');

    if (!invoiceId) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invoice ID is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Get authenticated user
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ success: false, error: 'Authentication required' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.split(' ')[1];
    const {
      data: { user },
      error: authError,
    } = await (supabase?.auth.getUser(token) ||
      Promise.resolve({
        data: { user: null },
        error: new Error('Supabase not available'),
      }));

    if (authError || !user || !supabase) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Invalid authentication token',
        }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const paymentManager = getPaymentManager();
    const invoice: Invoice | null =
      await paymentManager.getInvoiceById(invoiceId);

    if (!invoice) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invoice not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Check if user owns this invoice
    if ((invoice as any).userId !== user.id) {
      return new Response(
        JSON.stringify({ success: false, error: 'Access denied' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Generate PDF invoice (simplified HTML to PDF conversion)
    const htmlContent = generateInvoiceHTML(invoice);

    return new Response(htmlContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Content-Disposition': `inline; filename="invoice-${invoice.invoiceNumber}.html"`,
      },
    });
  } catch (error) {
    console.error('Invoice download error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error:
          error instanceof Error ? error.message : 'Failed to download invoice',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

function generateInvoiceHTML(invoice: {
  invoiceNumber: string;
  dueDate: Date;
  amount: number;
  tax: number;
  total: number;
  status: string;
  items: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }>;
}): string {
  const itemsHTML = invoice.items
    .map(
      item => `
    <tr>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${item.description}</td>
      <td style="padding: 12px; text-align: right; border-bottom: 1px solid #e5e7eb;">${item.quantity}</td>
      <td style="padding: 12px; text-align: right; border-bottom: 1px solid #e5e7eb;">Rp ${item.unitPrice.toLocaleString('id-ID')}</td>
      <td style="padding: 12px; text-align: right; border-bottom: 1px solid #e5e7eb;">Rp ${item.total.toLocaleString('id-ID')}</td>
    </tr>
  `
    )
    .join('');

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Invoice ${invoice.invoiceNumber}</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f9fafb; }
        .container { max-width: 800px; margin: 0 auto; background: white; padding: 40px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { border-bottom: 2px solid #3b82f6; padding-bottom: 20px; margin-bottom: 30px; }
        .logo { font-size: 24px; font-weight: bold; color: #3b82f6; }
        .invoice-info { display: flex; justify-content: space-between; margin-bottom: 30px; }
        .info-section { flex: 1; }
        .info-section h3 { margin: 0 0 10px 0; color: #374151; }
        .info-section p { margin: 5px 0; color: #6b7280; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
        th { background-color: #f3f4f6; padding: 12px; text-align: left; font-weight: 600; color: #374151; }
        .totals { display: flex; justify-content: flex-end; margin-top: 20px; }
        .totals-table { width: 300px; }
        .totals-table td { padding: 8px 12px; }
        .totals-table .total-row { font-weight: bold; border-top: 2px solid #374151; }
        .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center; color: #6b7280; font-size: 14px; }
        .status { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; text-transform: uppercase; }
        .status.paid { background-color: #d1fae5; color: #065f46; }
        .status.pending { background-color: #fed7aa; color: #92400e; }
        .status.overdue { background-color: #fee2e2; color: #991b1b; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo">Maskom Network</div>
          <p style="margin: 5px 0; color: #6b7280;">Internet Service Provider</p>
        </div>

        <div class="invoice-info">
          <div class="info-section">
            <h3>Invoice</h3>
            <p><strong>Number:</strong> ${invoice.invoiceNumber}</p>
            <p><strong>Date:</strong> ${(invoice as any).createdAt.toLocaleDateString('id-ID')}</p>
            <p><strong>Due Date:</strong> ${invoice.dueDate.toLocaleDateString('id-ID')}</p>
            <p><strong>Status:</strong> <span class="status ${invoice.status}">${invoice.status}</span></p>
          </div>
          <div class="info-section" style="text-align: right;">
            <h3>Bill To</h3>
            <p>Customer ID: ${(invoice as any).userId}</p>
            <p>Payment Method: Online Payment</p>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Description</th>
              <th style="text-align: right;">Quantity</th>
              <th style="text-align: right;">Unit Price</th>
              <th style="text-align: right;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHTML}
          </tbody>
        </table>

        <div class="totals">
          <table class="totals-table">
            <tr>
              <td>Subtotal:</td>
              <td style="text-align: right;">Rp ${invoice.amount.toLocaleString('id-ID')}</td>
            </tr>
            <tr>
              <td>Tax (11%):</td>
              <td style="text-align: right;">Rp ${invoice.tax.toLocaleString('id-ID')}</td>
            </tr>
            <tr class="total-row">
              <td>Total:</td>
              <td style="text-align: right;">Rp ${invoice.total.toLocaleString('id-ID')}</td>
            </tr>
          </table>
        </div>

        <div class="footer">
          <p>Thank you for your business!</p>
          <p>For questions, contact us at support@maskom.co.id or +62-21-1234-5678</p>
          <p>This is a computer-generated invoice and requires no signature.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}
