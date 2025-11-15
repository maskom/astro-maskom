import { describe, it, expect } from 'vitest';
import { env, socialUrls } from '../lib/env.js';

describe('Environment Variables', () => {
  it('should have access to environment validation', () => {
    // Test that required variables are defined
    expect(env.SITE_NAME).toBeDefined();
    expect(env.SITE_URL).toBeDefined();
    expect(env.WHATSAPP_NUMBER).toBeDefined();
    
    // Test that helper functions work
    expect(socialUrls.whatsapp).toContain('wa.me');
  });

  it('should have proper TypeScript types', () => {
    // This test ensures TypeScript types are working
    
    // These should not cause TypeScript errors
    const siteName: string = env.SITE_NAME;
    const enableChatbot: boolean = env.ENABLE_CHATBOT;
    const nodeEnv: 'development' | 'production' | 'test' = env.NODE_ENV;
    
    expect(typeof siteName).toBe('string');
    expect(typeof enableChatbot).toBe('boolean');
    expect(['development', 'production', 'test']).toContain(nodeEnv);
  });

  it('should validate WhatsApp URL generation', () => {
    expect(socialUrls.whatsapp).toBe('https://wa.me/6283867803521');
  });

  it('should have correct feature flag values', () => {
    expect(env.ENABLE_CHATBOT).toBe(false); // default value
    expect(env.ENABLE_ANALYTICS).toBe(false); // default value
  });
});