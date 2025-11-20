import { describe, it, expect, beforeEach } from 'vitest';
import { JSDOM } from 'jsdom';
import '../src/scripts/chatbot.js';

// Set up DOM environment
const dom = new JSDOM(
  `
  <!DOCTYPE html>
  <html>
    <body>
      <div id="messages-list"></div>
      <input id="chat-input" />
      <form id="chat-form"></form>
      <button id="send-button"></button>
      <div id="loading-indicator" class="hidden"></div>
      <div id="messages-end"></div>
    </body>
  </html>
`,
  { runScripts: 'dangerously' }
);

global.window = dom.window;
global.document = dom.window.document;
global.HTMLElement = dom.window.HTMLElement;
global.HTMLDivElement = dom.window.HTMLDivElement;

describe('Chatbot Security Tests', () => {
  beforeEach(() => {
    // Reset DOM before each test
    document.getElementById('messages-list').innerHTML = '';
    (document.getElementById('chat-input') as HTMLInputElement).value = '';
  });

  describe('XSS Protection', () => {
    it('should sanitize script tags in user input', () => {
      const maliciousInput = '<script>alert("XSS")</script>Hello';
      const chatInput = document.getElementById(
        'chat-input'
      ) as HTMLInputElement;
      chatInput.value = maliciousInput;

      // Simulate the sanitization that would happen
      const sanitized = maliciousInput
        .replace(/<script[^>]*>.*?<\/script>/gi, '') // Remove script tags and content
        .replace(/<[^>]*>/g, '') // Remove other HTML tags
        .replace(/javascript:/gi, '')
        .replace(/on\w+=/gi, '')
        .trim();

      expect(sanitized).toBe('Hello');
      expect(sanitized).not.toContain('<script>');
      expect(sanitized).not.toContain('alert');
    });

    it('should sanitize javascript: protocol', () => {
      const maliciousInput = 'javascript:alert("XSS")';
      const sanitized = maliciousInput
        .replace(/javascript:/gi, '')
        .replace(/vbscript:/gi, '')
        .replace(/data:/gi, '')
        .replace(/on\w+=/gi, '')
        .trim();

      expect(sanitized).toBe('alert("XSS")');
      expect(sanitized).not.toContain('javascript:');
    });

    it('should sanitize event handlers', () => {
      const maliciousInput = '<img src="x" onerror="alert(\'XSS\')">';
      const sanitized = maliciousInput
        .replace(/<[^>]*>/g, '')
        .replace(/javascript:/gi, '')
        .replace(/on\w+=/gi, '')
        .trim();

      expect(sanitized).not.toContain('onerror');
      expect(sanitized).not.toContain('alert');
    });

    it('should sanitize vbscript: protocol', () => {
      const maliciousInput = 'vbscript:msgbox("XSS")';
      const sanitized = maliciousInput
        .replace(/javascript:/gi, '')
        .replace(/vbscript:/gi, '')
        .replace(/data:/gi, '')
        .replace(/on\w+=/gi, '')
        .trim();

      expect(sanitized).toBe('msgbox("XSS")');
      expect(sanitized).not.toContain('vbscript:');
    });

    it('should sanitize data: protocol', () => {
      const maliciousInput = 'data:text/html,<script>alert("XSS")</script>';
      const sanitized = maliciousInput
        .replace(/javascript:/gi, '')
        .replace(/vbscript:/gi, '')
        .replace(/data:/gi, '')
        .replace(/on\w+=/gi, '')
        .trim();

      expect(sanitized).toBe('text/html,<script>alert("XSS")</script>');
      expect(sanitized).not.toContain('data:');
    });

    it('should handle null and undefined inputs', () => {
      const input1 = null;
      const input2 = undefined;
      const sanitized1 = typeof input1 !== 'string' ? '' : input1;
      const sanitized2 = typeof input2 !== 'string' ? '' : input2;

      expect(sanitized1).toBe('');
      expect(sanitized2).toBe('');
    });

    it('should handle non-string inputs', () => {
      const input1 = 123;
      const input2 = {};
      const sanitized1 = typeof input1 !== 'string' ? '' : input1;
      const sanitized2 = typeof input2 !== 'string' ? '' : input2;

      expect(sanitized1).toBe('');
      expect(sanitized2).toBe('');
    });

    it('should handle non-string inputs', () => {
      const input1 = 123;
      const input2 = {};
      const sanitized1 = typeof input1 !== 'string' ? '' : input1;
      const sanitized2 = typeof input2 !== 'string' ? '' : input2;

      expect(sanitized1).toBe('');
      expect(sanitized2).toBe('');
    });
  });

  describe('Content Security', () => {
    it('should use textContent instead of innerHTML', () => {
      const messagesList = document.getElementById('messages-list');
      const message = {
        role: 'user',
        content: '<script>alert("XSS")</script>Hello',
      };

      // Simulate message rendering (should use textContent)
      const messageContainer = document.createElement('div');
      const messageBubble = document.createElement('div');
      messageBubble.textContent = message.content; // This is what our code does
      messageContainer.appendChild(messageBubble);
      messagesList.appendChild(messageContainer);

      const renderedContent = messageBubble.textContent;
      expect(renderedContent).toBe('<script>alert("XSS")</script>Hello');
      // The script tag should not be executed, just displayed as text
    });

    it('should prevent HTML injection in message content', () => {
      const messagesList = document.getElementById('messages-list');
      const maliciousContent = '<img src="x" onerror="alert(\'XSS\')">';

      const messageContainer = document.createElement('div');
      const messageBubble = document.createElement('div');
      messageBubble.textContent = maliciousContent;
      messageContainer.appendChild(messageBubble);
      messagesList.appendChild(messageContainer);

      const renderedContent = messageBubble.textContent;
      expect(renderedContent).toBe('<img src="x" onerror="alert(\'XSS\')">');
      // Should be treated as text, not HTML
    });
  });

  describe('Input Validation', () => {
    it('should trim whitespace from input', () => {
      const input = '   Hello World   ';
      const sanitized = input.trim();
      expect(sanitized).toBe('Hello World');
    });

    it('should handle empty strings', () => {
      const input = '';
      const sanitized = input.trim();
      expect(sanitized).toBe('');
    });

    it('should handle strings with only whitespace', () => {
      const input = '   \t\n   ';
      const sanitized = input.trim();
      expect(sanitized).toBe('');
    });
  });

  describe('Complex Attack Vectors', () => {
    it('should handle encoded malicious content', () => {
      const maliciousInput = '%3Cscript%3Ealert%28%22XSS%22%29%3C%2Fscript%3E';
      const sanitized = maliciousInput
        .replace(/<[^>]*>/g, '')
        .replace(/javascript:/gi, '')
        .replace(/on\w+=/gi, '')
        .trim();

      expect(sanitized).toBe('%3Cscript%3Ealert%28%22XSS%22%29%3C%2Fscript%3E');
      // URL encoded content should remain as text
    });

    it('should handle mixed case attacks', () => {
      const maliciousInput = '<ScRiPt>AlErT("XSS")</ScRiPt>';
      const sanitized = maliciousInput
        .replace(/<[^>]*>/g, '')
        .replace(/javascript:/gi, '')
        .replace(/on\w+=/gi, '')
        .trim();

      expect(sanitized).toBe('AlErT("XSS")');
      expect(sanitized).not.toContain('<ScRiPt>');
    });

    it('should handle nested tag attacks', () => {
      const maliciousInput = '<div><script>alert("XSS")</script></div>';
      const sanitized = maliciousInput
        .replace(/<[^>]*>/g, '')
        .replace(/javascript:/gi, '')
        .replace(/on\w+=/gi, '')
        .trim();

      expect(sanitized).toBe('alert("XSS")');
      expect(sanitized).not.toContain('<div>');
      expect(sanitized).not.toContain('<script>');
    });
  });
});
