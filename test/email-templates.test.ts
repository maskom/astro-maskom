import { describe, it, expect } from 'vitest';
import { emailTemplateService } from '../src/lib/email-templates';

describe('EmailTemplateService', () => {
  describe('getAvailableTemplates', () => {
    it('should return all available template types', () => {
      const templates = emailTemplateService.getAvailableTemplates();

      expect(templates).toContain('welcome');
      expect(templates).toContain('installation');
      expect(templates).toContain('billing');
      expect(templates).toContain('password-reset');
      expect(templates).toContain('status-update');
      expect(templates).toContain('appointment');
      expect(templates).toHaveLength(6);
    });
  });

  describe('validateTemplateData', () => {
    it('should validate welcome template data correctly', () => {
      const validData = {
        userName: 'John Doe',
        userEmail: 'john@example.com',
      };

      const result = emailTemplateService.validateTemplateData(
        'welcome',
        validData
      );
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject invalid welcome template data', () => {
      const invalidData = {
        userName: 'John Doe',
        // Missing userEmail
      };

      const result = emailTemplateService.validateTemplateData(
        'welcome',
        invalidData
      );
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('userEmail is required');
    });
  });

  describe('getSampleData', () => {
    it('should return sample data for welcome template in Indonesian', () => {
      const sampleData = emailTemplateService.getSampleData('welcome', 'id');

      expect(sampleData.userName).toBe('Budi Santoso');
      expect(sampleData.userEmail).toBe('user@example.com');
      expect(sampleData.packageName).toBe('Paket Home Pro');
    });

    it('should return sample data for welcome template in English', () => {
      const sampleData = emailTemplateService.getSampleData('welcome', 'en');

      expect(sampleData.userName).toBe('John Doe');
      expect(sampleData.userEmail).toBe('user@example.com');
      expect(sampleData.packageName).toBe('Home Pro Package');
    });
  });

  describe('renderTemplate', () => {
    it('should render welcome template successfully', async () => {
      const template = {
        type: 'welcome' as const,
        language: 'id' as const,
        data: {
          userName: 'Test User',
          userEmail: 'test@example.com',
          packageName: 'Paket Home Pro',
        },
      };

      const result = await emailTemplateService.renderTemplate(template);

      expect(result.html).toBeDefined();
      expect(result.html).toContain('Test User');
      expect(result.html).toContain('welcome');
      expect(result.subject).toBeDefined();
      expect(result.previewText).toBeDefined();
      expect(result.language).toBe('id');
      expect(result.type).toBe('welcome');
    });

    it('should render template in English', async () => {
      const template = {
        type: 'welcome' as const,
        language: 'en' as const,
        data: {
          userName: 'Test User',
          userEmail: 'test@example.com',
        },
      };

      const result = await emailTemplateService.renderTemplate(template);

      expect(result.html).toContain('Test User');
      expect(result.html).toContain('en');
      expect(result.language).toBe('en');
    });

    it('should throw error for unknown template type', async () => {
      const template = {
        type: 'unknown' as any,
        language: 'id' as const,
        data: {},
      };

      await expect(
        emailTemplateService.renderTemplate(template)
      ).rejects.toThrow('Template not found');
    });
  });
});
