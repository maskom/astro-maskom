import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ValidationEngine, ValidationSchema } from '../src/lib/validation';

// Mock the logger
vi.mock('../src/lib/logger', () => ({
  logger: {
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe('ValidationEngine Extended Tests', () => {
  let validationEngine: ValidationEngine;

  beforeEach(() => {
    vi.clearAllMocks();
    validationEngine = new ValidationEngine({
      requestId: 'test-123',
      endpoint: '/api/test',
    });
  });

  describe('Complex validation scenarios', () => {
    it('should validate nested object structures', () => {
      const schema: ValidationSchema = {
        user: {
          type: 'object',
          required: true,
          custom: value => {
            if (typeof value !== 'object' || value === null) {
              return 'User must be an object';
            }
            if (!('name' in value) || !('email' in value)) {
              return 'User must have name and email';
            }
            return true;
          },
        },
      };

      const validData = { user: { name: 'John', email: 'john@example.com' } };
      const result = validationEngine.validate(validData, schema);

      expect(result.isValid).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data!).toEqual(validData);
    });

    it('should validate array types with constraints', () => {
      const schema: ValidationSchema = {
        tags: {
          type: 'array',
          required: true,
          custom: value => {
            if (!Array.isArray(value)) {
              return 'Tags must be an array';
            }
            if (value.length < 1) {
              return 'At least one tag is required';
            }
            if (value.length > 5) {
              return 'Maximum 5 tags allowed';
            }
            if (!value.every(tag => typeof tag === 'string')) {
              return 'All tags must be strings';
            }
            return true;
          },
        },
      };

      const validData = { tags: ['tag1', 'tag2', 'tag3'] };
      const result = validationEngine.validate(validData, schema);

      expect(result.isValid).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data!).toEqual(validData);
    });

    it('should reject invalid array data', () => {
      const schema: ValidationSchema = {
        tags: {
          type: 'array',
          required: true,
          custom: value => {
            if (!Array.isArray(value)) {
              return 'Tags must be an array';
            }
            return true;
          },
        },
      };

      const invalidData = { tags: 'not-an-array' };
      const result = validationEngine.validate(invalidData, schema);

      expect(result.isValid).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors!).toHaveLength(1);
      expect(result.errors![0].message).toContain('must be an array');
    });

    it('should validate URL patterns', () => {
      const schema: ValidationSchema = {
        website: {
          type: 'url',
          required: false,
          pattern: /^https?:\/\/.+/,
        },
      };

      const validData = { website: 'https://example.com' };
      const result = validationEngine.validate(validData, schema);

      expect(result.isValid).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data!).toEqual(validData);
    });

    it('should reject invalid URLs', () => {
      const schema: ValidationSchema = {
        website: {
          type: 'url',
          required: false,
          pattern: /^https?:\/\/.+/,
        },
      };

      const invalidData = { website: 'not-a-url' };
      const result = validationEngine.validate(invalidData, schema);

      expect(result.isValid).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors!).toHaveLength(1);
    });

    it('should handle conditional validation', () => {
      const schema: ValidationSchema = {
        type: {
          type: 'string',
          required: true,
          enum: ['user', 'admin'],
        },
        permissions: {
          type: 'array',
          required: false,
          custom: (value, data) => {
            if (
              (data as Record<string, unknown>).type === 'admin' &&
              (!Array.isArray(value) || value.length === 0)
            ) {
              return 'Admin users must have permissions';
            }
            return true;
          },
        },
      };

      const adminWithoutPermissions = {
        type: 'admin',
        permissions: [],
      };
      const result = validationEngine.validate(adminWithoutPermissions, schema);

      expect(result.isValid).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors!).toHaveLength(1);
      expect(result.errors![0].message).toContain('permissions');
    });

    it('should validate complex number ranges', () => {
      const schema: ValidationSchema = {
        age: {
          type: 'number',
          required: true,
          min: 18,
          max: 120,
          custom: value => {
            if (!Number.isInteger(value)) {
              return 'Age must be an integer';
            }
            return true;
          },
        },
      };

      const validData = { age: 25 };
      const result = validationEngine.validate(validData, schema);

      expect(result.isValid).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data!).toEqual(validData);
    });

    it('should reject numbers outside range', () => {
      const schema: ValidationSchema = {
        age: {
          type: 'number',
          required: true,
          min: 18,
          max: 120,
        },
      };

      const invalidData = { age: 15 };
      const result = validationEngine.validate(invalidData, schema);

      expect(result.isValid).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors!).toHaveLength(1);
      expect(result.errors![0].message).toContain('at least 18');
    });

    it('should handle string sanitization', () => {
      const schema: ValidationSchema = {
        comment: {
          type: 'string',
          required: true,
          sanitize: true,
          maxLength: 100,
          custom: value => {
            if (typeof value === 'string' && value.includes('<script>')) {
              return 'HTML tags not allowed';
            }
            return true;
          },
        },
      };

      const validData = { comment: 'This is a valid comment' };
      const result = validationEngine.validate(validData, schema);

      expect(result.isValid).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data!).toEqual(validData);
    });

    it('should validate boolean fields', () => {
      const schema: ValidationSchema = {
        isActive: {
          type: 'boolean',
          required: true,
        },
        notifications: {
          type: 'boolean',
          required: false,
        },
      };

      const validData = { isActive: true, notifications: false };
      const result = validationEngine.validate(validData, schema);

      expect(result.isValid).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data!).toEqual(validData);
    });

    it('should reject invalid boolean values', () => {
      const schema: ValidationSchema = {
        isActive: {
          type: 'boolean',
          required: true,
        },
      };

      const invalidData = { isActive: 'true' }; // string instead of boolean
      const result = validationEngine.validate(invalidData, schema);

      expect(result.isValid).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors!).toHaveLength(1);
    });

    it('should handle multiple validation errors', () => {
      const schema: ValidationSchema = {
        email: {
          type: 'email',
          required: true,
        },
        age: {
          type: 'number',
          required: true,
          min: 18,
        },
        name: {
          type: 'string',
          required: true,
          minLength: 2,
        },
      };

      const invalidData = {
        email: 'invalid-email',
        age: 15,
        name: 'A',
      };

      const result = validationEngine.validate(invalidData, schema);

      expect(result.isValid).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors!).toHaveLength(3);
      expect(result.errors!.map(e => e.field)).toEqual([
        'email',
        'age',
        'name',
      ]);
    });

    it('should validate optional fields with valid data', () => {
      const schema: ValidationSchema = {
        required: {
          type: 'string',
          required: true,
        },
        optional: {
          type: 'string',
          required: false,
          maxLength: 10,
        },
      };

      const data = { required: 'value' };
      const result = validationEngine.validate(data, schema);

      expect(result.isValid).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data!).toEqual(data);
    });

    it('should validate optional fields when provided', () => {
      const schema: ValidationSchema = {
        required: {
          type: 'string',
          required: true,
        },
        optional: {
          type: 'string',
          required: false,
          maxLength: 10,
        },
      };

      const data = { required: 'value', optional: 'too-long-optional-value' };
      const result = validationEngine.validate(data, schema);

      expect(result.isValid).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors!).toHaveLength(1);
      expect(result.errors![0].field).toBe('optional');
    });

    it('should handle cross-field validation', () => {
      const schema: ValidationSchema = {
        password: {
          type: 'string',
          required: true,
          minLength: 8,
        },
        confirmPassword: {
          type: 'string',
          required: true,
          custom: (value, data) => {
            if (value !== (data as Record<string, unknown>).password) {
              return 'Passwords do not match';
            }
            return true;
          },
        },
      };

      const invalidData = {
        password: 'password123',
        confirmPassword: 'different-password',
      };

      const result = validationEngine.validate(invalidData, schema);

      expect(result.isValid).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors!).toHaveLength(1);
      expect(result.errors![0].message).toContain('validation failed');
    });

    it('should validate enum values correctly', () => {
      const schema: ValidationSchema = {
        status: {
          type: 'string',
          required: true,
          enum: ['active', 'inactive', 'pending'],
        },
      };

      const validData = { status: 'active' };
      const result = validationEngine.validate(validData, schema);

      expect(result.isValid).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data!).toEqual(validData);
    });

    it('should reject invalid enum values', () => {
      const schema: ValidationSchema = {
        status: {
          type: 'string',
          required: true,
          enum: ['active', 'inactive', 'pending'],
        },
      };

      const invalidData = { status: 'invalid-status' };
      const result = validationEngine.validate(invalidData, schema);

      expect(result.isValid).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors!).toHaveLength(1);
      expect(result.errors![0].message).toContain('must be one of');
    });

    it('should handle numeric enum values', () => {
      const schema: ValidationSchema = {
        priority: {
          type: 'number',
          required: true,
          enum: [1, 2, 3, 4, 5],
        },
      };

      const validData = { priority: 3 };
      const result = validationEngine.validate(validData, schema);

      expect(result.isValid).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data!).toEqual(validData);
    });

    it('should reject invalid numeric enum values', () => {
      const schema: ValidationSchema = {
        priority: {
          type: 'number',
          required: true,
          enum: [1, 2, 3, 4, 5],
        },
      };

      const invalidData = { priority: 6 };
      const result = validationEngine.validate(invalidData, schema);

      expect(result.isValid).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors!).toHaveLength(1);
    });
  });

  describe('Edge cases and error handling', () => {
    it('should handle null and undefined values', () => {
      const schema: ValidationSchema = {
        field: {
          type: 'string',
          required: false,
        },
      };

      const result1 = validationEngine.validate({ field: null }, schema);
      const result2 = validationEngine.validate({ field: undefined }, schema);
      const result3 = validationEngine.validate({}, schema);

      expect(result1.isValid).toBe(true);
      expect(result2.isValid).toBe(true);
      expect(result3.isValid).toBe(true);
    });

    it('should handle empty objects and arrays', () => {
      const schema: ValidationSchema = {
        metadata: {
          type: 'object',
          required: false,
        },
        tags: {
          type: 'array',
          required: false,
        },
      };

      const data = { metadata: {}, tags: [] };
      const result = validationEngine.validate(data, schema);

      expect(result.isValid).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data!).toEqual(data);
    });

    it('should handle validation context', () => {
      const context = {
        requestId: 'req-123',
        userId: 'user-456',
        endpoint: '/api/users',
        method: 'POST',
      };

      const engineWithContext = new ValidationEngine(context);
      const schema: ValidationSchema = {
        name: { type: 'string', required: true },
      };

      const data = { name: 'Test User' };
      const result = engineWithContext.validate(data, schema);

      expect(result.isValid).toBe(true);

      // Logger is mocked, so we just verify the validation succeeded
    });
  });
});
