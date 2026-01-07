/// <reference types="vitest" />

declare global {
  interface ImportMetaEnv {
    readonly PUBLIC_SUPABASE_URL: string;
    readonly PUBLIC_SUPABASE_ANON_KEY: string;
    readonly SUPABASE_SERVICE_ROLE_KEY: string;
    readonly OPENAI_API_KEY: string;
    readonly SENDGRID_API_KEY: string;
    readonly EMAIL_FROM: string;
    readonly STRIPE_SECRET_KEY: string;
    readonly STRIPE_WEBHOOK_SECRET: string;
    readonly CLOUDFLARE_API_TOKEN: string;
    readonly CLOUDFLARE_ACCOUNT_ID: string;
    readonly DATABASE_URL: string;
    readonly JWT_SECRET: string;
    readonly RESEND_API_KEY: string;
    readonly VITE_PUBLIC_SUPABASE_URL: string;
    readonly VITE_PUBLIC_SUPABASE_ANON_KEY: string;
  }

  interface ImportMeta {
    readonly env: ImportMetaEnv;
  }
}

export {};