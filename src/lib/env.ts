import { z } from 'zod';
import { config } from 'dotenv';

// Load environment variables from .env file
config();

// Environment variable validation schema
const envSchema = z.object({
  // ===========================================
  // SUPABASE CONFIGURATION
  // ===========================================
  SUPABASE_URL: z.string().url().min(1, "SUPABASE_URL is required"),
  SUPABASE_ANON_KEY: z.string().min(1, "SUPABASE_ANON_KEY is required"),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, "SUPABASE_SERVICE_ROLE_KEY is required"),

  // ===========================================
  // OPENAI CONFIGURATION (Optional)
  // ===========================================
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_ORG_ID: z.string().optional(),

  // ===========================================
  // SITE CONFIGURATION
  // ===========================================
  SITE_URL: z.string().url().min(1, "SITE_URL is required"),
  SITE_NAME: z.string().min(1, "SITE_NAME is required"),
  SITE_DESCRIPTION: z.string().min(1, "SITE_DESCRIPTION is required"),
  SITE_AUTHOR: z.string().min(1, "SITE_AUTHOR is required"),

  // ===========================================
  // SOCIAL MEDIA & CONTACT
  // ===========================================
  WHATSAPP_NUMBER: z.string().min(1, "WHATSAPP_NUMBER is required"),
  FACEBOOK_URL: z.string().url().optional(),
  TWITTER_URL: z.string().url().optional(),
  INSTAGRAM_URL: z.string().url().optional(),
  LINKEDIN_URL: z.string().url().optional(),
  CONTACT_EMAIL: z.string().email().optional(),
  CONTACT_PHONE: z.string().optional(),
  CONTACT_ADDRESS: z.string().optional(),

  // ===========================================
  // ANALYTICS & MONITORING
  // ===========================================
  GOOGLE_ANALYTICS_ID: z.string().optional(),
  SENTRY_DSN: z.string().url().optional(),

  // ===========================================
  // DEVELOPMENT CONFIGURATION
  // ===========================================
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),

  // Feature flags
  ENABLE_CHATBOT: z.string().transform((val) => val === 'true').default('false'),
  ENABLE_ANALYTICS: z.string().transform((val) => val === 'true').default('false'),
  ENABLE_ERROR_REPORTING: z.string().transform((val) => val === 'true').default('false'),

  // ===========================================
  // PAYMENT GATEWAY (Future)
  // ===========================================
  MIDTRANS_CLIENT_KEY: z.string().optional(),
  MIDTRANS_SERVER_KEY: z.string().optional(),
  XENDIT_API_KEY: z.string().optional(),

  // ===========================================
  // EMAIL SERVICE (Future)
  // ===========================================
  SENDGRID_API_KEY: z.string().optional(),
  FROM_EMAIL: z.string().email().optional(),

  // ===========================================
  // SECURITY
  // ===========================================
  JWT_SECRET: z.string().min(32, "JWT_SECRET must be at least 32 characters").optional(),
  JWT_EXPIRES_IN: z.string().default('24h'),
  CORS_ORIGIN: z.string().url().optional(),

  // ===========================================
  // CACHE CONFIGURATION
  // ===========================================
  REDIS_URL: z.string().url().optional(),
  REDIS_PASSWORD: z.string().optional(),

  // ===========================================
  // EXTERNAL APIS
  // ===========================================
  GEOCODING_API_KEY: z.string().optional(),
  WEATHER_API_KEY: z.string().optional(),
});

// Validate environment variables
function validateEnv() {
  try {
    const env = envSchema.parse(process.env);
    return env;
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessages = error.errors.map(
        (err) => `${err.path.join('.')}: ${err.message}`
      );
      console.error('❌ Environment validation failed:');
      console.error(errorMessages.join('\n'));
      console.error('\nPlease check your .env file and ensure all required variables are set.');
      process.exit(1);
    }
    throw error;
  }
}

// Export validated environment
export const env = validateEnv();

// Export types for TypeScript
export type Env = z.infer<typeof envSchema>;

// Helper function to get WhatsApp URL
export function getWhatsAppUrl(number: string, message?: string) {
  const cleanNumber = number.replace(/[^\d]/g, '');
  const text = message ? `?text=${encodeURIComponent(message)}` : '';
  return `https://wa.me/${cleanNumber}${text}`;
}

// Helper function to get social media URLs
export const socialUrls = {
  facebook: env.FACEBOOK_URL,
  twitter: env.TWITTER_URL,
  instagram: env.INSTAGRAM_URL,
  linkedin: env.LINKEDIN_URL,
  whatsapp: getWhatsAppUrl(env.WHATSAPP_NUMBER),
} as const;