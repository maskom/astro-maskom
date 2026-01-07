import { supabase } from '../../../../lib/supabase.ts';
import {
  authenticateRequest,
  logError,
  type APIContext,
} from '../../../../lib/utils/api';

interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unit_price: number;
  total: number;
}

interface Invoice {
  id: string;
  user_id: string;
  invoice_number: string;
  created_at: string;
  due_date: string;
  status: string;
  amount: number;
  tax: number;
  total: number;
  transaction_id: string | null;
  payment_transactions?: Array<{ order_id?: string }>;
  invoice_items?: InvoiceItem[];
}

export async function GET({ params, request }: APIContext) {
  try {
    if (!supabase) {
      return new Response('Database connection unavailable', { status: 503 });
    }

    const user = await authenticateRequest(request);
    if (!user) {
      return new Response('Unauthorized', { status: 401 });
    }

    const invoiceId = params?.id;

    // Get invoice with items
    const { data: invoice, error } = await supabase
      .from('invoices')
      .select(
        `
        *,
        invoice_items (
          id,
          description,
          quantity,
          unit_price,
          total
        ),
        payment_transactions (
          order_id,
          payment_method
        )
      `
      )
      .eq('id', invoiceId)
      .eq('user_id', user.id)
      .single();

    if (error || !invoice) {
      logError('Error fetching invoice for download', user.id, error);
      return new Response('Invoice not found', { status: 404 });
    }

    // Generate HTML content for PDF
    const htmlContent = generateInvoiceHTML(invoice);

    // For now, return HTML. In production, you'd use a PDF library like Puppeteer
    return new Response(htmlContent, {
      headers: {
        'Content-Type': 'text/html',
        'Content-Disposition': `attachment; filename="invoice-${invoice.invoice_number}.html"`,
      },
    });
  } catch (error) {
    logError('Invoice download error', 'unknown', error);
    return new Response('Internal server error', { status: 500 });
  }
}

function generateInvoiceHTML(invoice: Invoice): string {
  const items = invoice.invoice_items || [];

  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Invoice ${invoice.invoice_number}</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 20px;
            background-color: #f5f5f5;
        }
        .invoice-container {
            max-width: 800px;
            margin: 0 auto;
            background: white;
            padding: 40px;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 40px;
            border-bottom: 2px solid #3b82f6;
            padding-bottom: 20px;
        }
        .logo {
            font-size: 24px;
            font-weight: bold;
            color: #3b82f6;
        }
        .invoice-details {
            text-align: right;
        }
        .invoice-number {
            font-size: 18px;
            font-weight: bold;
            margin-bottom: 5px;
        }
        .status {
            display: inline-block;
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: bold;
            text-transform: uppercase;
        }
        .status.paid { background: #10b981; color: white; }
        .status.sent { background: #3b82f6; color: white; }
        .status.overdue { background: #ef4444; color: white; }
        .status.draft { background: #6b7280; color: white; }
        
        .info-section {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 40px;
            margin-bottom: 30px;
        }
        .info-block h3 {
            margin: 0 0 15px 0;
            color: #374151;
            font-size: 14px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        .info-block p {
            margin: 5px 0;
            color: #6b7280;
        }
        
        .items-table {
            width: 100%;
            border-collapse: collapse;
            margin: 30px 0;
        }
        .items-table th {
            background: #f9fafb;
            padding: 12px;
            text-align: left;
            font-weight: 600;
            color: #374151;
            border-bottom: 2px solid #e5e7eb;
        }
        .items-table td {
            padding: 12px;
            border-bottom: 1px solid #e5e7eb;
        }
        .items-table .text-right {
            text-align: right;
        }
        
        .totals {
            margin-top: 20px;
            text-align: right;
        }
        .totals-row {
            display: flex;
            justify-content: flex-end;
            margin-bottom: 8px;
        }
        .totals-label {
            width: 120px;
            padding-right: 20px;
            text-align: right;
            color: #6b7280;
        }
        .totals-value {
            width: 120px;
            text-align: right;
            font-weight: 600;
        }
        .totals-row.grand-total {
            border-top: 2px solid #374151;
            padding-top: 8px;
            margin-top: 8px;
        }
        .totals-row.grand-total .totals-label,
        .totals-row.grand-total .totals-value {
            font-size: 18px;
            color: #111827;
        }
        
        .footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #e5e7eb;
            text-align: center;
            color: #6b7280;
            font-size: 12px;
        }
    </style>
</head>
<body>
    <div class="invoice-container">
        <div class="header">
            <div class="logo">
                <h1>Maskom Network</h1>
                <p style="margin: 5px 0; color: #6b7280; font-size: 14px;">Internet Service Provider</p>
            </div>
            <div class="invoice-details">
                <div class="invoice-number">Invoice ${invoice.invoice_number}</div>
                <span class="status ${invoice.status}">${invoice.status}</span>
            </div>
        </div>

        <div class="info-section">
            <div class="info-block">
                <h3>Invoice Details</h3>
                <p><strong>Issue Date:</strong> ${new Date(invoice.created_at).toLocaleDateString('id-ID')}</p>
                <p><strong>Due Date:</strong> ${new Date(invoice.due_date).toLocaleDateString('id-ID')}</p>
                ${invoice.transaction_id ? `<p><strong>Transaction ID:</strong> ${invoice.transaction_id}</p>` : ''}
                ${invoice.payment_transactions?.[0]?.order_id ? `<p><strong>Order ID:</strong> ${invoice.payment_transactions[0].order_id}</p>` : ''}
            </div>
            <div class="info-block">
                <h3>Bill To</h3>
                <p><strong>Customer ID:</strong> ${invoice.user_id}</p>
                <p><strong>Email:</strong> customer@example.com</p>
                <p><strong>Phone:</strong> +62-XXX-XXXX-XXXX</p>
            </div>
        </div>

        <table class="items-table">
            <thead>
                <tr>
                    <th>Description</th>
                    <th class="text-right">Quantity</th>
                    <th class="text-right">Unit Price</th>
                    <th class="text-right">Total</th>
                </tr>
            </thead>
            <tbody>
                ${items
                  .map(
                    (item: InvoiceItem) => `
                    <tr>
                        <td>${item.description}</td>
                        <td class="text-right">${item.quantity}</td>
                        <td class="text-right">Rp ${Number(item.unit_price).toLocaleString('id-ID')}</td>
                        <td class="text-right">Rp ${Number(item.total).toLocaleString('id-ID')}</td>
                    </tr>
                `
                  )
                  .join('')}
            </tbody>
        </table>

        <div class="totals">
            <div class="totals-row">
                <div class="totals-label">Subtotal:</div>
                <div class="totals-value">Rp ${Number(invoice.amount).toLocaleString('id-ID')}</div>
            </div>
            <div class="totals-row">
                <div class="totals-label">Tax (11%):</div>
                <div class="totals-value">Rp ${Number(invoice.tax).toLocaleString('id-ID')}</div>
            </div>
            <div class="totals-row grand-total">
                <div class="totals-label">Total:</div>
                <div class="totals-value">Rp ${Number(invoice.total).toLocaleString('id-ID')}</div>
            </div>
        </div>

        <div class="footer">
            <p>Thank you for your business! This is a computer-generated invoice and requires no signature.</p>
            <p>For questions about this invoice, please contact our billing department at billing@maskom.co.id</p>
            <p>Maskom Network - Jl. Example No. 123, Jakarta, Indonesia 12345</p>
        </div>
    </div>
</body>
</html>
  `;
}
