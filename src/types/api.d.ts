import type { APIContext } from 'astro';

// Generic type for validated API data
export interface ValidatedData<T = unknown> {
  [key: string]: T;
}

declare module 'astro' {
  interface APIContext {
    validatedData?: Record<string, unknown>;
    requestId?: string;
  }
}
