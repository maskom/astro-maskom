import { vi } from 'vitest';

// Mock Supabase client
export function createMockSupabase() {
  return {
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    single: vi.fn(),
    maybeSingle: vi.fn(),
    eq: vi.fn().mockReturnThis(),
    neq: vi.fn().mockReturnThis(),
    gt: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lt: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    range: vi.fn().mockReturnThis(),
    auth: {
      signUp: vi.fn(),
      signInWithPassword: vi.fn(),
      signOut: vi.fn(),
      getUser: vi.fn(),
      updateUser: vi.fn(),
      verifyOtp: vi.fn(),
      resend: vi.fn(),
    },
    storage: {
      from: vi.fn().mockReturnThis(),
      upload: vi.fn(),
      download: vi.fn(),
      remove: vi.fn(),
    },
  } as unknown;
}

// Mock request object
export function createMockRequest(options: Partial<Request> = {}) {
  const defaultOptions = {
    method: 'GET',
    headers: new Headers({
      'Content-Type': 'application/json',
      'User-Agent': 'test-agent',
      'X-Forwarded-For': '127.0.0.1',
    }),
  };

  return new Request('http://localhost:4321', {
    ...defaultOptions,
    ...options,
  });
}

// Mock form data request
export function createMockFormDataRequest(data: Record<string, string>) {
  const formData = new FormData();
  Object.entries(data).forEach(([key, value]) => {
    formData.append(key, value);
  });

  return new Request('http://localhost:4321', {
    method: 'POST',
    body: formData,
    headers: {
      'User-Agent': 'test-agent',
      'X-Forwarded-For': '127.0.0.1',
    },
  });
}

// Mock JSON request
export function createMockJSONRequest(data: unknown, method = 'POST') {
  return new Request('http://localhost:4321', {
    method,
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'test-agent',
      'X-Forwarded-For': '127.0.0.1',
    },
    body: JSON.stringify(data),
  });
}

// Mock cookies object
export function createMockCookies() {
  const cookies: Record<string, string> = {};

  return {
    get: (name: string) => cookies[name],
    set: (name: string, value: string, _options?: unknown) => {
      cookies[name] = value;
    },
    delete: (name: string) => {
      delete cookies[name];
    },
    has: (name: string) => name in cookies,
    getAll: () =>
      Object.entries(cookies).map(([name, value]) => ({ name, value })),
  };
}

// Mock redirect function
export function createMockRedirect() {
  let redirectUrl: string | null = null;

  const redirect = (url: string) => {
    redirectUrl = url;
    return new Response(null, { status: 302, headers: { Location: url } });
  };

  return { redirect, getRedirectUrl: () => redirectUrl };
}

// Mock user data
export const mockUser = {
  id: 'test-user-id',
  email: 'test@example.com',
  name: 'Test User',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
};

// Mock session data
export const mockSession = {
  user: mockUser,
  access_token: 'test-access-token',
  refresh_token: 'test-refresh-token',
  expires_in: 3600,
  expires_at: Date.now() + 3600000,
};

// Mock error responses
export const mockErrors = {
  invalidCredentials: {
    message: 'Invalid login credentials',
    status: 400,
  },
  userNotFound: {
    message: 'User not found',
    status: 404,
  },
  validationError: {
    message: 'Validation failed',
    status: 400,
  },
  internalError: {
    message: 'Internal server error',
    status: 500,
  },
} as const;

// Helper to wait for async operations
export const waitFor = (ms: number) =>
  new Promise(resolve => setTimeout(resolve, ms));

// Helper to create test response
export function createTestResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

// Helper to parse response data
export async function parseResponse(response: Response) {
  const data = await response.json();
  return { status: response.status, data };
}
