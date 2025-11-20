import { describe, it, expect } from 'vitest';
import { ValidationEngine, CommonSchemas } from '../../src/lib/validation';

describe('ValidationEngine', () => {
  it('should validate valid email', () => {
    const validator = new ValidationEngine();
    const schema = {
      email: CommonSchemas.email,
    };

    const result = validator.validate({ email: 'test@example.com' }, schema);

    expect(result.isValid).toBe(true);
    expect(result.data).toEqual({ email: 'test@example.com' });
  });

  it('should reject invalid email', () => {
    const validator = new ValidationEngine();
    const schema = {
      email: CommonSchemas.email,
    };

    const result = validator.validate({ email: 'invalid-email' }, schema);

    expect(result.isValid).toBe(false);
    expect(result.errors).toBeDefined();
    expect(result.errors?.[0]?.field).toBe('email');
  });

  it('should validate positive amount', () => {
    const validator = new ValidationEngine();
    const schema = {
      amount: CommonSchemas.positiveAmount,
    };

    const result = validator.validate({ amount: 100.5 }, schema);

    expect(result.isValid).toBe(true);
    expect(result.data).toEqual({ amount: 100.5 });
  });

  it('should reject zero or negative amount', () => {
    const validator = new ValidationEngine();
    const schema = {
      amount: CommonSchemas.positiveAmount,
    };

    const result1 = validator.validate({ amount: 0 }, schema);
    const result2 = validator.validate({ amount: -10 }, schema);

    expect(result1.isValid).toBe(false);
    expect(result2.isValid).toBe(false);
  });

  it('should validate UUID', () => {
    const validator = new ValidationEngine();
    const schema = {
      id: CommonSchemas.uuid,
    };

    const validUuid = '123e4567-e89b-12d3-a456-426614174000';
    const result = validator.validate({ id: validUuid }, schema);

    expect(result.isValid).toBe(true);
    expect(result.data).toEqual({ id: validUuid });
  });

  it('should reject invalid UUID', () => {
    const validator = new ValidationEngine();
    const schema = {
      id: CommonSchemas.uuid,
    };

    const result = validator.validate({ id: 'invalid-uuid' }, schema);

    expect(result.isValid).toBe(false);
    expect(result.errors?.[0]?.field).toBe('id');
  });

  it('should sanitize string values', () => {
    const validator = new ValidationEngine();
    const schema = {
      message: {
        type: 'string' as const,
        required: true,
        sanitize: true,
      },
    };

    const maliciousInput = '<script>alert("xss")</script>Hello World';
    const result = validator.validate({ message: maliciousInput }, schema);

    expect(result.isValid).toBe(true);
    expect(result.data?.message).not.toContain('<script>');
    expect(result.data?.message).toBe('Hello World');
  });

  it('should validate custom rules', () => {
    const validator = new ValidationEngine();
    const schema = {
      password: {
        type: 'string' as const,
        required: true,
        custom: (value: unknown) => {
          return (
            (typeof value === 'string' && value.length >= 8) ||
            'Password must be at least 8 characters'
          );
        },
      },
    };

    const validResult = validator.validate(
      { password: 'strongpassword' },
      schema
    );
    const invalidResult = validator.validate({ password: 'weak' }, schema);

    expect(validResult.isValid).toBe(true);
    expect(invalidResult.isValid).toBe(false);
    expect(invalidResult.errors?.[0]?.message).toBe(
      'Password must be at least 8 characters'
    );
  });

  it('should handle optional fields', () => {
    const validator = new ValidationEngine();
    const schema = {
      required: {
        type: 'string' as const,
        required: true,
      },
      optional: {
        type: 'string' as const,
        required: false,
      },
    };

    const result = validator.validate({ required: 'value' }, schema);

    expect(result.isValid).toBe(true);
    expect(result.data).toEqual({ required: 'value' });
  });

  it('should validate enum values', () => {
    const validator = new ValidationEngine();
    const schema = {
      status: {
        type: 'string' as const,
        required: true,
        enum: ['active', 'inactive', 'pending'],
      },
    };

    const validResult = validator.validate({ status: 'active' }, schema);
    const invalidResult = validator.validate({ status: 'invalid' }, schema);

    expect(validResult.isValid).toBe(true);
    expect(invalidResult.isValid).toBe(false);
  });
});
