// Database type definitions for Supabase
// This file now serves as a compatibility layer for existing imports
// New code should import from '@/lib/types' instead

// Re-export from the new type structure for backward compatibility
export * from './types';

// Legacy exports - these will be deprecated in future versions
export type { Database } from './types/database.manual';
export type { SubscriberPreferences } from './types/database.manual';

// Note: This file is maintained for backward compatibility.
// Please update imports to use '@/lib/types' for new development.
