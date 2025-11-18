import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '../src/pages/api/payments/webhook';
import { logger } from '../src/lib/logger';

// Mock the logger
vi.mock('../src/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock the payment manager
vi.mock('../src/lib/payments', () => ({
  getPaymentManager: () => ({
    handleWebhook: vi.fn(),
  }),
}));

describe('Payment Webhook Security', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should not log sensitive payment data', async () => {
    const sensitiveWebhookData = {
      event_type: 'payment.success',
      transaction_id: 'txn_123456',
      order_id: 'order_789',
      payment_type: 'credit_card',
      gross_amount: 150000,
      currency: 'IDR',
      card_number: '4111111111111111',
      card_expiry: '12/25',
      card_cvv: '123',
      customer_name: 'John Doe',
      customer_email: 'john@example.com',
      customer_phone: '+628123456789',
      billing_address: {
        address: '123 Main St',
        city: 'Jakarta',
        postal_code: '12345',
      },
    };

    const mockRequest = {
      json: vi.fn().mockResolvedValue(sensitiveWebhookData),
    };

    const mockContext = {
      request: mockRequest,
      site: new URL('https://example.com'),
      generator: 'static',
      url: new URL('https://example.com/api/payments/webhook'),
      params: {},
      props: {},
      redirect: vi.fn(),
      response: vi.fn(),
      getStaticPaths: vi.fn(),
      getActionResult: vi.fn(),
      callAction: vi.fn(),
    } as unknown;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await POST(mockContext as any);

    // Verify logger.info was called with safe metadata only
    expect(logger.info).toHaveBeenCalledWith('Payment webhook received', {
      eventType: 'payment.success',
      transactionId: 'txn_123456',
      timestamp: expect.any(String),
      paymentType: 'credit_card',
      statusCode: undefined,
    });

    // Verify sensitive data is NOT in the logs
    const infoCall = vi.mocked(logger.info).mock.calls[0];
    const loggedContext = infoCall[1];

    expect(loggedContext).not.toHaveProperty('gross_amount');
    expect(loggedContext).not.toHaveProperty('card_number');
    expect(loggedContext).not.toHaveProperty('card_expiry');
    expect(loggedContext).not.toHaveProperty('card_cvv');
    expect(loggedContext).not.toHaveProperty('customer_name');
    expect(loggedContext).not.toHaveProperty('customer_email');
    expect(loggedContext).not.toHaveProperty('customer_phone');
    expect(loggedContext).not.toHaveProperty('billing_address');
  });

  it('should handle webhook processing errors without exposing sensitive data', async () => {
    const { getPaymentManager } = await import('../src/lib/payments');
    const mockPaymentManager = getPaymentManager();

    // Mock webhook processing to throw an error
    vi.mocked(mockPaymentManager.handleWebhook).mockRejectedValue(
      new Error('Payment processing failed')
    );

    const webhookData = {
      event_type: 'payment.failed',
      transaction_id: 'txn_failed_123',
      order_id: 'order_failed_456',
      gross_amount: 75000,
      customer_email: 'sensitive@example.com',
    };

    const mockRequest = {
      json: vi.fn().mockResolvedValue(webhookData),
    };

    const mockContext = {
      request: mockRequest,
      site: new URL('https://example.com'),
      generator: 'static',
      url: new URL('https://example.com/api/payments/webhook'),
      params: {},
      props: {},
      redirect: vi.fn(),
      response: vi.fn(),
      getStaticPaths: vi.fn(),
      getActionResult: vi.fn(),
      callAction: vi.fn(),
    } as unknown;

    const response = // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await POST(mockContext as any);

    // Verify error logging includes only safe metadata
    expect(logger.error).toHaveBeenCalledWith(
      'Webhook processing error',
      expect.any(Error),
      {
        eventType: 'payment.failed',
        transactionId: 'txn_failed_123',
      }
    );

    // Verify sensitive data is NOT in error logs
    const errorCall = vi.mocked(logger.error).mock.calls[0];
    const loggedContext = errorCall[2];

    expect(loggedContext).not.toHaveProperty('gross_amount');
    expect(loggedContext).not.toHaveProperty('customer_email');

    // Verify response is appropriate
    expect(response.status).toBe(400);
    const responseData = await response.json();
    expect(responseData.success).toBe(false);
  });

  it('should handle malformed requests without exposing data', async () => {
    const mockRequest = {
      json: vi.fn().mockRejectedValue(new Error('Invalid JSON')),
    };

    const mockContext = {
      request: mockRequest,
      site: new URL('https://example.com'),
      generator: 'static',
      url: new URL('https://example.com/api/payments/webhook'),
      params: {},
      props: {},
      redirect: vi.fn(),
      response: vi.fn(),
      getStaticPaths: vi.fn(),
      getActionResult: vi.fn(),
      callAction: vi.fn(),
    } as unknown;

    const response = // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await POST(mockContext as any);

    // Verify error logging for malformed requests
    expect(logger.error).toHaveBeenCalledWith(
      'Webhook handler error',
      expect.any(Error),
      {
        endpoint: '/api/payments/webhook',
      }
    );

    // Verify response is appropriate
    expect(response.status).toBe(500);
    const responseData = await response.json();
    expect(responseData.success).toBe(false);
  });

  it('should log different event types safely', async () => {
    const testCases = [
      { event_type: 'payment.success', transaction_id: 'txn_success' },
      { event: 'payment.pending', order_id: 'order_pending' },
      { event_type: 'payment.cancel', transaction_id: 'txn_cancel' },
    ];

    for (const webhookData of testCases) {
      const mockRequest = {
        json: vi.fn().mockResolvedValue(webhookData),
      };

      const mockContext = {
        request: mockRequest,
        site: new URL('https://example.com'),
        generator: 'static',
        url: new URL('https://example.com/api/payments/webhook'),
        params: {},
        props: {},
        redirect: vi.fn(),
        response: vi.fn(),
        getStaticPaths: vi.fn(),
        getActionResult: vi.fn(),
        callAction: vi.fn(),
      } as unknown;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await POST(mockContext as any);

      // Verify safe logging for each event type
      expect(logger.info).toHaveBeenCalledWith('Payment webhook received', {
        eventType: webhookData.event_type || webhookData.event,
        transactionId: webhookData.transaction_id || webhookData.order_id,
        timestamp: expect.any(String),
        paymentType: undefined,
        statusCode: undefined,
      });
    }
  });
});
