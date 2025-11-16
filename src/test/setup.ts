import '@testing-library/jest-dom';

// Mock environment variables
process.env.LOG_LEVEL = 'debug';

// Mock Supabase environment variables for testing
process.env.SUPABASE_URL = 'https://test.supabase.co';
process.env.SUPABASE_KEY = 'test-anon-key';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key';

// Mock other required environment variables
process.env.PUBLIC_SITE_URL = 'http://localhost:4321';
