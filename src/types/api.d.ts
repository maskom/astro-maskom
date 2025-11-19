import type { APIContext } from 'astro';

declare module 'astro' {
  interface APIContext {
    validatedData?: any;
    requestId?: string;
  }
}
