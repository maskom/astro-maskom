/**
 * Consolidated sanitization utilities to prevent XSS attacks and validate input
 * This module combines functionality from the previous duplicate sanitization files
 */

/**
 * Basic input sanitization - removes potentially dangerous characters
 */
export function sanitizeInput(
  input: string | number | boolean | null | undefined
): string {
  if (typeof input !== 'string') return '';

  return input
    .replace(/[<>]/g, '') // Remove basic HTML tags
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, '') // Remove event handlers
    .replace(/data:/gi, '') // Remove data: protocol
    .replace(/vbscript:/gi, '') // Remove vbscript: protocol
    .trim();
}

/**
 * Escape HTML entities in a string to prevent XSS
 */
export function escapeHtml(unsafe: string): string {
  if (typeof unsafe !== 'string') {
    return '';
  }

  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Validate and sanitize email addresses
 */
export function sanitizeEmail(email: string): string {
  if (!email || typeof email !== 'string') {
    return '';
  }

  // Basic email validation and sanitization
  const sanitized = email.trim().toLowerCase();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  return emailRegex.test(sanitized) ? sanitized : '';
}

/**
 * Sanitize text input by removing potentially dangerous characters
 */
export function sanitizeText(text: string): string {
  if (!text || typeof text !== 'string') {
    return '';
  }

  // Remove null bytes and control characters except newlines and tabs
  return text.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '').trim();
}

/**
 * Sanitize message objects for chat applications
 */
export function sanitizeMessage(message: {
  role?: string;
  content?: string;
  [key: string]: unknown;
}): {
  role: string;
  content: string;
} {
  if (!message || typeof message !== 'object') {
    return { role: 'user', content: '' };
  }

  return {
    role: sanitizeInput(message.role) || 'user',
    content: sanitizeInput(message.content) || '',
  };
}

/**
 * Validate and sanitize an array of messages
 */
export function validateMessages(
  messages: { role?: string; content?: string; [key: string]: unknown }[]
): { role: string; content: string }[] {
  if (!Array.isArray(messages)) {
    return [];
  }

  return messages
    .filter(msg => msg && typeof msg === 'object')
    .map(sanitizeMessage)
    .filter(msg => msg.content.length > 0 && msg.content.length <= 10000)
    .slice(0, 50); // Limit conversation history
}

/**
 * Sanitize response text
 */
export function sanitizeResponse(response: string): string {
  if (typeof response !== 'string') return '';

  return sanitizeInput(response);
}

/**
 * Recursively sanitize JSON input data
 */
export function sanitizeJsonInput(data: unknown): unknown {
  if (data === null || data === undefined) {
    return data;
  }

  if (typeof data === 'string') {
    return sanitizeInput(data);
  }

  if (Array.isArray(data)) {
    return data.map(item => sanitizeJsonInput(item));
  }

  if (typeof data === 'object' && data !== null) {
    const sanitized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data)) {
      const sanitizedKey = sanitizeInput(key);
      sanitized[sanitizedKey] = sanitizeJsonInput(value);
    }
    return sanitized;
  }

  return data;
}

/**
 * Validate that required fields are present in an object
 */
export function validateRequiredFields(
  data: Record<string, unknown>,
  requiredFields: string[]
): { isValid: boolean; missingFields: string[] } {
  if (!data || typeof data !== 'object') {
    return {
      isValid: false,
      missingFields: requiredFields,
    };
  }

  const missingFields: string[] = [];

  for (const field of requiredFields) {
    if (
      !(field in data) ||
      data[field] === null ||
      data[field] === undefined ||
      data[field] === ''
    ) {
      missingFields.push(field);
    }
  }

  return {
    isValid: missingFields.length === 0,
    missingFields,
  };
}

// Alias for sanitizeInput to maintain backward compatibility
export const sanitizeString = sanitizeInput;
