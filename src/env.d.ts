/// <reference types="astro/client" />

interface ImportMetaEnv {
  readonly SUPABASE_URL: string;
  readonly SUPABASE_ANON_KEY: string;
  readonly SUPABASE_SERVICE_ROLE_KEY: string;
  readonly OPENAI_API_KEY: string;
  readonly MIDTRANS_SERVER_KEY: string;
  readonly MIDTRANS_CLIENT_KEY: string;
  readonly MIDTRANS_ENVIRONMENT: string;
  readonly MIDTRANS_MERCHANT_ID: string;
  readonly ENCRYPTION_PASSWORD: string;
  readonly DEV: string;
  readonly LOG_LEVEL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

// Astro types
declare global {
  interface AstroCookies {
    get(name: string): AstroCookie | undefined;
    set(name: string, value: string, options?: CookieOptions): void;
    delete(name: string): void;
    has(name: string): boolean;
  }

  interface AstroCookie {
    value: string;
    path?: string;
    expires?: Date;
    maxAge?: number;
    domain?: string;
    secure?: boolean;
    httpOnly?: boolean;
    sameSite?: 'strict' | 'lax' | 'none';
  }

  interface CookieOptions {
    path?: string;
    expires?: Date;
    maxAge?: number;
    domain?: string;
    secure?: boolean;
    httpOnly?: boolean;
    sameSite?: 'strict' | 'lax' | 'none';
  }

  interface APIContext {
    request: Request;
    cookies: AstroCookies;
    url: URL;
    clientAddress: string;
    locals: Record<string, any>;
    site?: string;
    generator?: string;
    props: Record<string, any>;
    route: RouteData;
    redirect(path: string, status?: number): Response;
  }

  interface RouteData {
    path: string;
    pattern: URLPattern;
    params: Record<string, string>;
    component: any;
    type: 'page' | 'endpoint';
  }
}

export {};
