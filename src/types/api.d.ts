import type { APIContext } from 'astro';

declare module 'astro' {
  interface APIContext {
    validatedData?: any; // eslint-disable-line @typescript-eslint/no-explicit-any
    requestId?: string;
  }
}
