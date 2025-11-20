// Invoice and billing related types

export interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  userId: string;
  transactionId: string;
  amount: number;
  tax: number;
  total: number;
  dueDate: Date;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  items: InvoiceItem[];
  createdAt: Date;
  updatedAt: Date;
}

export interface InvoiceData {
  invoice: Invoice;
  company: {
    name: string;
    address: string;
    phone: string;
    email: string;
    taxId?: string;
  };
}
