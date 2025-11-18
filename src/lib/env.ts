// Environment variable validation and configuration
import { logger } from './logger';

export interface EnvConfig {
  // Supabase Configuration
  SUPABASE_URL: string;
  SUPABASE_KEY: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;

  // OpenAI Configuration (Optional)
  OPENAI_API_KEY?: string;
  OPENAI_ORG_ID?: string;

  // Site Configuration
  SITE_URL: string;
  SITE_NAME: string;
  SITE_DESCRIPTION?: string;
  SITE_AUTHOR?: string;

  // Contact Information
  CONTACT_EMAIL?: string;
  CONTACT_PHONE?: string;
  WHATSAPP_NUMBER?: string;

  // Development/Production
  NODE_ENV: 'development' | 'production';
  LOG_LEVEL: 'debug' | 'info' | 'warn' | 'error';

  // Feature Flags
  ENABLE_CHATBOT?: boolean;
  ENABLE_ANALYTICS?: boolean;
  ENABLE_ERROR_REPORTING?: boolean;

  // Payment Gateway (Optional)
  MIDTRANS_CLIENT_KEY?: string;
  MIDTRANS_SERVER_KEY?: string;
  MIDTRANS_ENVIRONMENT?: 'sandbox' | 'production';
  MIDTRANS_MERCHANT_ID?: string;

  // Security
  ENCRYPTION_PASSWORD?: string;
  JWT_SECRET?: string;
  JWT_EXPIRES_IN?: string;

  // CORS
  CORS_ORIGIN?: string;
}

class EnvValidationError extends Error {
  constructor(message: string) {
    super(`Environment validation failed: ${message}`);
    this.name = 'EnvValidationError';
  }
}

export function validateEnv(): EnvConfig {
  const env = import.meta.env;

  // Required Supabase configuration
  if (!env.SUPABASE_URL) {
    throw new EnvValidationError('SUPABASE_URL is required');
  }

  if (!env.SUPABASE_KEY) {
    throw new EnvValidationError('SUPABASE_KEY is required');
  }

  // Validate Supabase URL format
  try {
    new URL(env.SUPABASE_URL);
  } catch {
    throw new EnvValidationError('SUPABASE_URL must be a valid URL');
  }

  // Validate Supabase key format (basic check)
  if (env.SUPABASE_KEY.length < 100) {
    throw new EnvValidationError(
      'SUPABASE_KEY appears to be invalid (too short)'
    );
  }

  // Site configuration with defaults
  const siteUrl = env.SITE_URL || 'http://localhost:4321';
  try {
    new URL(siteUrl);
  } catch {
    throw new EnvValidationError('SITE_URL must be a valid URL');
  }

  // Environment validation
  const nodeEnv = env.NODE_ENV || 'development';
  if (!['development', 'production'].includes(nodeEnv)) {
    throw new EnvValidationError(
      'NODE_ENV must be either "development" or "production"'
    );
  }

  // Log level validation
  const logLevel = env.LOG_LEVEL || 'info';
  if (!['debug', 'info', 'warn', 'error'].includes(logLevel)) {
    throw new EnvValidationError(
      'LOG_LEVEL must be one of: debug, info, warn, error'
    );
  }

  // Feature flags (convert string to boolean)
  const parseBool = (value?: string): boolean | undefined => {
    if (value === undefined) return undefined;
    return value.toLowerCase() === 'true';
  };

  // Optional validations with warnings
  if (env.ENABLE_CHATBOT === 'true' && !env.OPENAI_API_KEY) {
    logger.warn('ENABLE_CHATBOT is true but OPENAI_API_KEY is not set', {
      component: 'env-validation',
      feature: 'chatbot',
      missingKey: 'OPENAI_API_KEY',
    });
  }

  if (
    env.MIDTRANS_ENVIRONMENT &&
    !['sandbox', 'production'].includes(env.MIDTRANS_ENVIRONMENT)
  ) {
    throw new EnvValidationError(
      'MIDTRANS_ENVIRONMENT must be either "sandbox" or "production"'
    );
  }

  // Return validated configuration
  return {
    SUPABASE_URL: env.SUPABASE_URL,
    SUPABASE_KEY: env.SUPABASE_KEY,
    SUPABASE_SERVICE_ROLE_KEY: env.SUPABASE_SERVICE_ROLE_KEY,

    OPENAI_API_KEY: env.OPENAI_API_KEY,
    OPENAI_ORG_ID: env.OPENAI_ORG_ID,

    SITE_URL: siteUrl,
    SITE_NAME: env.SITE_NAME || 'Maskom Network',
    SITE_DESCRIPTION: env.SITE_DESCRIPTION,
    SITE_AUTHOR: env.SITE_AUTHOR,

    CONTACT_EMAIL: env.CONTACT_EMAIL,
    CONTACT_PHONE: env.CONTACT_PHONE,
    WHATSAPP_NUMBER: env.WHATSAPP_NUMBER,

    NODE_ENV: nodeEnv as 'development' | 'production',
    LOG_LEVEL: logLevel as 'debug' | 'info' | 'warn' | 'error',

    ENABLE_CHATBOT: parseBool(env.ENABLE_CHATBOT),
    ENABLE_ANALYTICS: parseBool(env.ENABLE_ANALYTICS),
    ENABLE_ERROR_REPORTING: parseBool(env.ENABLE_ERROR_REPORTING),

    MIDTRANS_CLIENT_KEY: env.MIDTRANS_CLIENT_KEY,
    MIDTRANS_SERVER_KEY: env.MIDTRANS_SERVER_KEY,
    MIDTRANS_ENVIRONMENT: env.MIDTRANS_ENVIRONMENT as
      | 'sandbox'
      | 'production'
      | undefined,
    MIDTRANS_MERCHANT_ID: env.MIDTRANS_MERCHANT_ID,

    ENCRYPTION_PASSWORD: env.ENCRYPTION_PASSWORD,
    JWT_SECRET: env.JWT_SECRET,
    JWT_EXPIRES_IN: env.JWT_EXPIRES_IN,

    CORS_ORIGIN: env.CORS_ORIGIN,
  };
}

// Cached validated environment
let validatedEnv: EnvConfig | null = null;

export function getEnv(): EnvConfig {
  if (!validatedEnv) {
    validatedEnv = validateEnv();
  }
  return validatedEnv;
}

// Helper function to check if a feature is enabled
export function isFeatureEnabled(
  feature: 'chatbot' | 'analytics' | 'error_reporting'
): boolean {
  const env = getEnv();

  switch (feature) {
    case 'chatbot':
      return env.ENABLE_CHATBOT === true && !!env.OPENAI_API_KEY;
    case 'analytics':
      return env.ENABLE_ANALYTICS === true;
    case 'error_reporting':
      return env.ENABLE_ERROR_REPORTING === true;
    default:
      return false;
  }
}

// Helper function to get Supabase configuration
export function getSupabaseConfig() {
  const env = getEnv();

  return {
    url: env.SUPABASE_URL,
    anonKey: env.SUPABASE_KEY,
    serviceRoleKey: env.SUPABASE_SERVICE_ROLE_KEY,
  };
}

// Helper function to check if we're in development
export function isDevelopment(): boolean {
  return getEnv().NODE_ENV === 'development';
}

// Helper function to check if we're in production
export function isProduction(): boolean {
  return getEnv().NODE_ENV === 'production';
}
