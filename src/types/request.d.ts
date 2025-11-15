import type { SecurityContext } from './security/types';

declare global {
  interface Request {
    securityContext?: SecurityContext;
  }
}

export {};
