/**
 * Input sanitization utilities for security
 */

/**
 * Sanitize HTML content to prevent XSS attacks
 */
export function sanitizeHTML(str: string): string {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

/**
 * Sanitize string input by removing potentially dangerous characters
 */
export function sanitizeString(str: string): string {
  if (typeof str !== 'string') return '';
  
  return str
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, '') // Remove event handlers
    .trim();
}

/**
 * Validate and sanitize email input
 */
export function sanitizeEmail(email: string): string {
  if (typeof email !== 'string') return '';
  
  const sanitized = email.toLowerCase().trim();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  
  return emailRegex.test(sanitized) ? sanitized : '';
}

/**
 * Validate and sanitize numeric input
 */
export function sanitizeNumber(str: string, defaultValue: number = 0): number {
  if (typeof str !== 'string') return defaultValue;
  
  const num = parseInt(str.replace(/[^\d-]/g, ''), 10);
  return isNaN(num) ? defaultValue : num;
}

/**
 * Sanitize object by recursively cleaning all string values
 */
export function sanitizeObject(obj: any): any {
  if (typeof obj !== 'object' || obj === null) {
    return sanitizeString(String(obj));
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item));
  }
  
  const sanitized: any = {};
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      sanitized[key] = sanitizeString(value);
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeObject(value);
    } else {
      sanitized[key] = value;
    }
  }
  
  return sanitized;
}

/**
 * Validate request body for API endpoints
 */
export function validateRequestBody(body: any, requiredFields: string[] = []): { isValid: boolean; sanitized: any; errors: string[] } {
  const errors: string[] = [];
  const sanitized = sanitizeObject(body);
  
  // Check required fields
  for (const field of requiredFields) {
    if (!sanitized[field] || sanitized[field] === '') {
      errors.push(`Missing required field: ${field}`);
    }
  }
  
  return {
    isValid: errors.length === 0,
    sanitized,
    errors
  };
}