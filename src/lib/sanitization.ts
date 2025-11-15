/**
 * HTML sanitization utilities to prevent XSS attacks
 */

/**
 * Sanitize a string to prevent XSS by escaping HTML characters
 */
export function sanitizeHtml(str: string): string {
  if (typeof str !== 'string') {
    return '';
  }
  
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

/**
 * Sanitize and validate email addresses
 */
export function sanitizeEmail(email: string): string {
  if (typeof email !== 'string') {
    return '';
  }
  
  // Remove any HTML characters and trim
  const cleanEmail = sanitizeHtml(email.trim()).toLowerCase();
  
  // Basic email validation regex
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  
  return emailRegex.test(cleanEmail) ? cleanEmail : '';
}

/**
 * Sanitize text input while preserving basic formatting
 */
export function sanitizeText(text: string): string {
  if (typeof text !== 'string') {
    return '';
  }
  
  return sanitizeHtml(text.trim());
}

/**
 * Validate and sanitize incident data
 */
export function sanitizeIncidentData(data: any): any {
  if (!data || typeof data !== 'object') {
    return null;
  }
  
  return {
    title: sanitizeText(data.title || ''),
    description: sanitizeText(data.description || ''),
    status: sanitizeText(data.status || ''),
    severity: sanitizeText(data.severity || ''),
    affected_services: Array.isArray(data.affected_services) 
      ? data.affected_services.map(sanitizeText)
      : []
  };
}

/**
 * Validate and sanitize subscriber data
 */
export function sanitizeSubscriberData(data: any): any {
  if (!data || typeof data !== 'object') {
    return null;
  }
  
  return {
    email: sanitizeEmail(data.email || ''),
    preferences: {
      incidents: Boolean(data.preferences?.incidents),
      maintenance: Boolean(data.preferences?.maintenance),
      statusChanges: Boolean(data.preferences?.statusChanges)
    }
  };
}