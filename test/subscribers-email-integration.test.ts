import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '../src/pages/api/subscribers';
import { createServiceClient } from '../src/lib/supabase';
import { emailService } from '../src/lib/email/service';

// Mock dependencies
vi.mock('../src/lib/supabase');
vi.mock('../src/lib/email/service');
vi.mock('../src/lib/logger', () => ({
  logger: {
    apiError: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
  },
}));

const mockSupabase = {
  from: vi.fn(() => mockSupabase),
  select: vi.fn(() => mockSupabase),
  order: vi.fn(() => mockSupabase),
  eq: vi.fn(() => mockSupabase),
  single: vi.fn(() => mockSupabase),
  insert: vi.fn(() => mockSupabase),
  data: null,
  error: null,
};

describe('Subscribers API - Email Service Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(createServiceClient).mockReturnValue(mockSupabase as any);
    vi.mocked(emailService.sendCustomEmail).mockResolvedValue('email-id');
  });

  it('should send confirmation email when new subscriber is created', async () => {
    // Mock database responses
    mockSupabase.single.mockResolvedValueOnce({
      data: { id: 'subscriber-123', email: 'test@example.com' },
      error: null,
    } as any);

    const request = new Request('http://localhost:4321/api/subscribers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'test@example.com' }),
    });

    const response = await POST({
      request,
      params: {},
      props: {},
      url: new URL('http://localhost:4321/api/subscribers'),
      site: {},
      generator: {},
      redirect: () => {},
      clientAddress: '127.0.0.1',
      locals: {},
      getStaticPaths: () => [],
      route: '',
      origin: '',
      pathname: '',
      search: '',
      searchParams: new URLSearchParams(),
    } as any);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.email).toBe('test@example.com');
    expect(emailService.sendCustomEmail).toHaveBeenCalledWith({
      to: 'test@example.com',
      subject: 'Confirm Your Subscription to Maskom Network',
      html: expect.stringContaining('Confirm Your Subscription'),
      text: expect.stringContaining('Welcome to Maskom Network!'),
      priority: 3,
      metadata: {
        type: 'subscription_confirmation',
        subscriber_id: 'subscriber-123',
      },
    });
  });

  it('should handle email service failure gracefully', async () => {
    // Mock database responses
    mockSupabase.single.mockResolvedValueOnce({
      data: { id: 'subscriber-123', email: 'test@example.com' },
      error: null,
    } as any);

    // Mock email service failure
    vi.mocked(emailService.sendCustomEmail).mockRejectedValueOnce(
      new Error('Email service down')
    );

    const request = new Request('http://localhost:4321/api/subscribers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'test@example.com' }),
    });

    const response = await POST({
      request,
      params: {},
      props: {},
      url: new URL('http://localhost:4321/api/subscribers'),
      site: {},
      generator: {},
      redirect: () => {},
      clientAddress: '127.0.0.1',
      locals: {},
      getStaticPaths: () => [],
      route: '',
      origin: '',
      pathname: '',
      search: '',
      searchParams: new URLSearchParams(),
    } as any);
    const data = await response.json();

    // Should still succeed despite email failure
    expect(response.status).toBe(200);
    expect(data.email).toBe('test@example.com');
    expect(emailService.sendCustomEmail).toHaveBeenCalled();
  });

  it('should include correct confirmation URL in email', async () => {
    // Set environment variable
    const originalSiteUrl = process.env.SITE_URL;
    process.env.SITE_URL = 'https://maskom.co.id';

    // Mock database responses
    mockSupabase.single.mockResolvedValueOnce({
      data: null,
      error: { message: 'Not found' },
    } as any); // Email not found
    mockSupabase.insert.mockReturnValueOnce(mockSupabase);
    mockSupabase.select.mockReturnValueOnce(mockSupabase);
    mockSupabase.single.mockResolvedValueOnce({
      data: null,
      error: { message: 'Already exists' },
    } as any);

    const request = new Request('http://localhost:4321/api/subscribers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'user@example.com' }),
    });

    await POST({ request } as any);

    const emailCall = vi.mocked(emailService.sendCustomEmail).mock.calls[0][0];
    expect(emailCall.html).toContain(
      'https://maskom.co.id/confirm-subscription'
    );
    expect(emailCall.html).toContain('subscriber-456');
    expect(emailCall.text).toContain(
      'https://maskom.co.id/confirm-subscription'
    );

    // Restore environment variable
    process.env.SITE_URL = originalSiteUrl;
  });
});
