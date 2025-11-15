/**
 * Consolidated sanitization utilities to prevent XSS attacks and validate input
 * This module combines functionality from the previous duplicate sanitization files
 */

/**
 * Basic input sanitization - removes potentially dangerous characters
 */
export function sanitizeInput(input: any): string {
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
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
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
  return text
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    .trim();
}

/**
 * Sanitize message objects for chat applications
 */
export function sanitizeMessage(message: any): { role: string; content: string } {
  if (!message || typeof message !== 'object') {
    return { role: 'user', content: '' };
  }
  
  return {
    role: sanitizeInput(message.role) || 'user',
    content: sanitizeInput(message.content) || ''
  };
}

/**
 * Validate and sanitize an array of messages
 */
export function validateMessages(messages: any[]): { role: string; content: string }[] {
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
 * Validate JSON input and sanitize string fields
 */
export function sanitizeJsonInput(data: any): any {
  if (!data || typeof data !== 'object') {
    return {};
  }
  
  const sanitized: any = {};
  
  for (const [key, value] of Object.entries(data)) {
    if (typeof value === 'string') {
      sanitized[key] = sanitizeText(value);
    } else if (Array.isArray(value)) {
      sanitized[key] = value.map(item => 
        typeof item === 'string' ? sanitizeText(item) : item
      );
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeJsonInput(value);
    } else {
      sanitized[key] = value;
    }
  }
  
  return sanitized;
}

/**
 * Validate required fields in an object
 */
export function validateRequiredFields(data: any, requiredFields: string[]): { isValid: boolean; missingFields: string[] } {
  const missingFields: string[] = [];
  
  for (const field of requiredFields) {
    if (!data[field] || (typeof data[field] === 'string' && data[field].trim() === '')) {
      missingFields.push(field);
    }
  }
  
  return {
    isValid: missingFields.length === 0,
    missingFields
  };
}

// Backward compatibility aliases
export const sanitizeString = sanitizeInput;