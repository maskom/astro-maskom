// Basic HTML sanitization utility
export function sanitizeHtml(input: string): string {
  if (typeof input !== 'string') return '';
  
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

// Sanitize user input for display
export function sanitizeUserInput(input: string): string {
  if (typeof input !== 'string') return '';
  
  // Remove potentially dangerous characters while preserving basic text
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove angle brackets
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, ''); // Remove event handlers
}

// Validate and sanitize email
export function sanitizeEmail(email: string): string {
  if (typeof email !== 'string') return '';
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const cleanEmail = email.trim().toLowerCase();
  
  return emailRegex.test(cleanEmail) ? cleanEmail : '';
}

// Validate and sanitize phone number
export function sanitizePhone(phone: string): string {
  if (typeof phone !== 'string') return '';
  
  // Keep only digits, plus, hyphen, and parentheses
  return phone.replace(/[^\d+\-\(\)\s]/g, '').trim();
}

// Sanitize text input (remove control characters)
export function sanitizeText(input: string): string {
  if (typeof input !== 'string') return '';
  
  return input
    .replace(/[\x00-\x1F\x7F]/g, '') // Remove control characters
    .trim();
}

// Validate input length
export function validateLength(input: string, minLength: number = 0, maxLength: number = 1000): boolean {
  if (typeof input !== 'string') return false;
  
  return input.length >= minLength && input.length <= maxLength;
}