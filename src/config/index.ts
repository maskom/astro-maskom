export interface AppConfig {
  // Supabase Configuration
  supabaseUrl: string;
  supabaseAnonKey: string;
  
  // API Keys
  openaiApiKey: string;
  
  // Payment Configuration
  midtransServerKey: string;
  midtransClientKey: string;
  midtransEnvironment: string;
  midtransMerchantId: string;
  
  // Security Configuration
  encryptionPassword: string;
  
  // Application Configuration
  logLevel: string;
  nodeEnv: string;
}

export const config: AppConfig = {
  supabaseUrl: process.env.SUPABASE_URL || '',
  supabaseAnonKey: process.env.SUPABASE_ANON_KEY || '',
  openaiApiKey: process.env.OPENAI_API_KEY || '',
  midtransServerKey: process.env.MIDTRANS_SERVER_KEY || '',
  midtransClientKey: process.env.MIDTRANS_CLIENT_KEY || '',
  midtransEnvironment: process.env.MIDTRANS_ENVIRONMENT || 'sandbox',
  midtransMerchantId: process.env.MIDTRANS_MERCHANT_ID || '',
  encryptionPassword: process.env.ENCRYPTION_PASSWORD || '',
  logLevel: process.env.LOG_LEVEL || 'info',
  nodeEnv: process.env.NODE_ENV || 'development',
};

export function validateConfig(): void {
  const requiredFields = [
    'supabaseUrl',
    'supabaseAnonKey',
    'encryptionPassword',
  ];

  const missingFields = requiredFields.filter(field => !config[field as keyof AppConfig]);

  if (missingFields.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missingFields.join(', ')}`
    );
  }

  // Validate URL format
  try {
    new URL(config.supabaseUrl);
  } catch {
    throw new Error('Invalid SUPABASE_URL format');
  }

  // Validate log level
  const validLogLevels = ['error', 'warn', 'info', 'debug'];
  if (!validLogLevels.includes(config.logLevel)) {
    throw new Error(`Invalid LOG_LEVEL: ${config.logLevel}. Must be one of: ${validLogLevels.join(', ')}`);
  }

  // Validate environment
  const validEnvironments = ['development', 'production', 'test'];
  if (!validEnvironments.includes(config.nodeEnv)) {
    throw new Error(`Invalid NODE_ENV: ${config.nodeEnv}. Must be one of: ${validEnvironments.join(', ')}`);
  }

  // Production-specific validations
  if (config.nodeEnv === 'production') {
    const productionRequired = [
      'openaiApiKey',
      'midtransServerKey',
      'midtransClientKey',
      'midtransMerchantId',
    ];

    const missingProduction = productionRequired.filter(field => !config[field as keyof AppConfig]);
    
    if (missingProduction.length > 0) {
      console.warn(`Warning: Missing production environment variables: ${missingProduction.join(', ')}`);
    }
  }
}

// Auto-validate config when module is imported
if (typeof window === 'undefined') {
  validateConfig();
}