import { env } from '../lib/env.js';

// This file ensures environment validation happens at startup
// By importing the env module, we trigger validation immediately

console.log(`✅ Environment validated for ${env.NODE_ENV}`);
console.log(`🌐 Site: ${env.SITE_NAME} (${env.SITE_URL})`);
console.log(`📊 Log level: ${env.LOG_LEVEL}`);

// Export for use in other modules
export { env };