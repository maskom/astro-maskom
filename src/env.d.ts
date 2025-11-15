/// <reference types="astro/client" />

interface ImportMetaEnv {
  // ===========================================
  // SUPABASE CONFIGURATION
  // ===========================================
  readonly PUBLIC_SUPABASE_URL: string
  readonly PUBLIC_SUPABASE_ANON_KEY: string
  readonly SUPABASE_SERVICE_ROLE_KEY: string

  // ===========================================
  // OPENAI CONFIGURATION (Optional)
  // ===========================================
  readonly OPENAI_API_KEY?: string
  readonly OPENAI_ORG_ID?: string

  // ===========================================
  // SITE CONFIGURATION
  // ===========================================
  readonly SITE_URL: string
  readonly SITE_NAME: string
  readonly SITE_DESCRIPTION: string
  readonly SITE_AUTHOR: string

  // ===========================================
  // SOCIAL MEDIA & CONTACT
  // ===========================================
  readonly WHATSAPP_NUMBER: string
  readonly FACEBOOK_URL?: string
  readonly TWITTER_URL?: string
  readonly INSTAGRAM_URL?: string
  readonly LINKEDIN_URL?: string
  readonly CONTACT_EMAIL?: string
  readonly CONTACT_PHONE?: string
  readonly CONTACT_ADDRESS?: string

  // ===========================================
  // ANALYTICS & MONITORING
  // ===========================================
  readonly GOOGLE_ANALYTICS_ID?: string
  readonly SENTRY_DSN?: string

  // ===========================================
  // DEVELOPMENT CONFIGURATION
  // ===========================================
  readonly NODE_ENV?: 'development' | 'production' | 'test'
  readonly LOG_LEVEL?: 'debug' | 'info' | 'warn' | 'error'

  // Feature flags
  readonly ENABLE_CHATBOT?: string
  readonly ENABLE_ANALYTICS?: string
  readonly ENABLE_ERROR_REPORTING?: string

  // ===========================================
  // PAYMENT GATEWAY (Future)
  // ===========================================
  readonly MIDTRANS_CLIENT_KEY?: string
  readonly MIDTRANS_SERVER_KEY?: string
  readonly XENDIT_API_KEY?: string

  // ===========================================
  // EMAIL SERVICE (Future)
  // ===========================================
  readonly SENDGRID_API_KEY?: string
  readonly FROM_EMAIL?: string

  // ===========================================
  // SECURITY
  // ===========================================
  readonly JWT_SECRET?: string
  readonly JWT_EXPIRES_IN?: string
  readonly CORS_ORIGIN?: string

  // ===========================================
  // CACHE CONFIGURATION
  // ===========================================
  readonly REDIS_URL?: string
  readonly REDIS_PASSWORD?: string

  // ===========================================
  // EXTERNAL APIS
  // ===========================================
  readonly GEOCODING_API_KEY?: string
  readonly WEATHER_API_KEY?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}