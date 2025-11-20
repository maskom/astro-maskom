export interface PaymentMethod {
  id: string;
  type: 'credit_card' | 'bank_transfer' | 'ewallet';
  name: string;
  provider: string;
  isActive: boolean;
}

export interface PaymentTransactionMetadata {
  gatewayResponse?: string;
  paymentMethodToken?: string;
  installmentTerm?: number;
  promoCode?: string;
  discountAmount?: number;
  refundReason?: string;
  failureReason?: string;
  [key: string]: string | number | boolean | undefined;
}

export interface PaymentTransaction {
  id: string;
  orderId: string;
  userId: string;
  amount: number;
  currency: string;
  status: 'pending' | 'success' | 'failed' | 'cancelled' | 'refund';
  paymentMethod: PaymentMethod;
  createdAt: Date;
  updatedAt: Date;
  metadata?: PaymentTransactionMetadata;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  userId: string;
  transactionId: string;
  amount: number;
  subtotal: number;
  tax: number;
  total: number;
  dueDate: Date;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  items: InvoiceItem[];
  createdAt: Date;
  updatedAt: Date;
}

export interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface PaymentGatewayConfig {
  serverKey: string;
  clientKey: string;
  environment: 'sandbox' | 'production';
  merchantId: string;
}

export interface PaymentRequest {
  amount: number;
  orderId: string;
  customerDetails: CustomerDetails;
  itemDetails: ItemDetails[];
  paymentMethod?: string;
}

export interface CustomerDetails {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  billingAddress?: Address;
  shippingAddress?: Address;
}

export interface Address {
  firstName: string;
  lastName: string;
  address: string;
  city: string;
  postalCode: string;
  phone: string;
  countryCode: string;
}

export interface ItemDetails {
  id: string;
  price: number;
  quantity: number;
  name: string;
  category?: string;
  merchant_name?: string;
}

export interface PaymentResponse {
  transactionId: string;
  orderId: string;
  statusCode: string;
  statusMessage: string;
  paymentType?: string;
  transactionStatus: string;
  fraudStatus?: string;
  redirectUrl?: string;
  token?: string;
  approvalCode?: string;
  grossAmount: number;
}

export interface WebhookNotification {
  uuid: string;
  transaction_status: string;
  fraud_status?: string;
  transaction_id: string;
  order_id: string;
  payment_type: string;
  signature_key: string;
  gross_amount: string;
  status_code: string;
}
