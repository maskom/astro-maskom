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

export function sanitizeMessage(message: any): { role: string; content: string } {
  if (!message || typeof message !== 'object') {
    return { role: 'user', content: '' };
  }
  
  return {
    role: sanitizeInput(message.role) || 'user',
    content: sanitizeInput(message.content) || ''
  };
}

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

export function sanitizeResponse(response: string): string {
  if (typeof response !== 'string') return '';
  
  return sanitizeInput(response);
}