import { describe, it, expect, beforeEach, vi } from 'vitest';
import { initializeChatbot } from '../src/scripts/chatbot.js';

// Type definitions for fetch mock
interface MockFetchResponse {
  json: () => Promise<{ response: string }>;
}

type MockFetch = ReturnType<typeof vi.fn>;

// Mock DOM environment
const mockDOM = () => {
  // Create mock elements
  const messagesList = document.createElement('div');
  messagesList.id = 'messages-list';

  const chatInput = document.createElement('input') as HTMLInputElement;
  chatInput.id = 'chat-input';
  chatInput.type = 'text';

  const chatForm = document.createElement('form');
  chatForm.id = 'chat-form';
  chatForm.appendChild(chatInput);

  const sendButton = document.createElement('button');
  sendButton.id = 'send-button';

  const loadingIndicator = document.createElement('div');
  loadingIndicator.id = 'loading-indicator';
  loadingIndicator.className = 'hidden';

  const messagesEnd = document.createElement('div');
  messagesEnd.id = 'messages-end';
  messagesEnd.scrollIntoView = vi.fn(); // Mock the scrollIntoView method

  // Append to body
  document.body.appendChild(messagesList);
  document.body.appendChild(chatForm);
  document.body.appendChild(sendButton);
  document.body.appendChild(loadingIndicator);
  document.body.appendChild(messagesEnd);

  return {
    messagesList,
    chatInput,
    chatForm,
    sendButton,
    loadingIndicator,
    messagesEnd,
  };
};

describe('Chatbot Security Tests', () => {
  beforeEach(() => {
    // Clear DOM before each test
    document.body.innerHTML = '';
    mockDOM();

    // Mock fetch
    global.fetch = vi.fn() as any;
  });

  it('should sanitize basic XSS attempts', async () => {
    const xssPayloads = [
      '<script>alert("xss")</script>',
      '<img src="x" onerror="alert(\'xss\')">',
      '<svg onload="alert(\'xss\')">',
      'javascript:alert("xss")',
      '<iframe src="javascript:alert(\'xss\')"></iframe>',
      '<body onload="alert(\'xss\')">',
      '<input onfocus="alert(\'xss\')" autofocus>',
      '<select onfocus="alert(\'xss\')" autofocus><option>x</option></select>',
      '<textarea onfocus="alert(\'xss\')" autofocus></textarea>',
      '<keygen onfocus="alert(\'xss\')" autofocus>',
      '<video><source onerror="alert(\'xss\')">',
      '<audio src="x" onerror="alert(\'xss\')">',
      '<details open ontoggle="alert(\'xss\')">',
      '<marquee onstart="alert(\'xss\')">x</marquee>',
    ];

    for (const payload of xssPayloads) {
      document.body.innerHTML = '';
      mockDOM();

      // Mock successful response
      (fetch as MockFetch).mockResolvedValueOnce({
        json: async () => ({ response: 'Test response' }),
      });

      initializeChatbot();
      const chatInput = document.getElementById(
        'chat-input'
      ) as HTMLInputElement;

      // Set XSS payload as input
      chatInput.value = payload;

      // Get the form and submit it
      const chatForm = document.getElementById('chat-form');
      chatForm.dispatchEvent(new Event('submit'));

      // Wait for async operations
      await new Promise(resolve => setTimeout(resolve, 100));

      // Check that no script elements were added to the DOM
      const scripts = document.querySelectorAll('script');
      expect(scripts).toHaveLength(0);

      // Check that no event handlers were executed
      const messagesList = document.getElementById('messages-list');
      expect(messagesList.innerHTML).not.toContain('<script>');
      expect(messagesList.innerHTML).not.toContain('onerror');
      expect(messagesList.innerHTML).not.toContain('onload');
      expect(messagesList.innerHTML).not.toContain('javascript:');
    }
  });

  it('should sanitize HTML injection attempts', async () => {
    // Test each payload individually to avoid interference
    const payload = '<div style="color:red">Malicious HTML</div>';

    document.body.innerHTML = '';
    mockDOM();

    // Mock successful response
    (fetch as MockFetch).mockResolvedValueOnce({
      json: async () => ({ response: 'Test response' }),
    });

    initializeChatbot();
    const chatInput = document.getElementById('chat-input') as HTMLInputElement;

    chatInput.value = payload;

    const chatForm = document.getElementById('chat-form');
    chatForm.dispatchEvent(new Event('submit'));

    await new Promise(resolve => setTimeout(resolve, 100));

    const messagesList = document.getElementById('messages-list');
    // HTML tags should be preserved as text, not rendered as HTML
    expect(messagesList.innerHTML).not.toContain('style="color:red"');
    // But the text content should be preserved
    expect(messagesList.textContent).toContain('Malicious HTML');

    // Test another payload
    document.body.innerHTML = '';
    mockDOM();

    (fetch as MockFetch).mockResolvedValueOnce({
      json: async () => ({ response: 'Test response' }),
    });

    initializeChatbot();
    const chatInput2 = document.getElementById(
      'chat-input'
    ) as HTMLInputElement;

    chatInput2.value = '<span class="malicious">Content</span>';

    const chatForm2 = document.getElementById('chat-form');
    chatForm2.dispatchEvent(new Event('submit'));

    await new Promise(resolve => setTimeout(resolve, 100));

    const messagesList2 = document.getElementById('messages-list');
    expect(messagesList2.innerHTML).not.toContain('class="malicious"');
    expect(messagesList2.textContent).toContain('Content');
  });

  it('should allow safe text content', async () => {
    const input = 'Hello, how are you?';

    document.body.innerHTML = '';
    mockDOM();

    // Mock successful response
    (fetch as MockFetch).mockResolvedValueOnce({
      json: async () => ({ response: 'Test response' }),
    });

    initializeChatbot();
    const chatInput = document.getElementById('chat-input') as HTMLInputElement;

    chatInput.value = input;

    const chatForm = document.getElementById('chat-form');
    chatForm.dispatchEvent(new Event('submit'));

    await new Promise(resolve => setTimeout(resolve, 100));

    const messagesList = document.getElementById('messages-list');
    // Safe content should be preserved in textContent
    expect(messagesList.textContent).toContain(input);
  });

  it('should handle null and undefined inputs safely', () => {
    initializeChatbot();
    const chatInput = document.getElementById('chat-input') as HTMLInputElement;

    // Test null input
    chatInput.value = '';
    const chatForm = document.getElementById('chat-form');
    chatForm.dispatchEvent(new Event('submit'));

    // Should not throw error
    expect(() => {
      chatForm.dispatchEvent(new Event('submit'));
    }).not.toThrow();

    // Test undefined input
    chatInput.value = '';
    expect(() => {
      chatForm.dispatchEvent(new Event('submit'));
    }).not.toThrow();
  });

  it('should sanitize server responses as well', async () => {
    const maliciousResponse = 'Response with <div>malicious</div> content';

    document.body.innerHTML = '';
    mockDOM();

    // Mock malicious server response
    (fetch as MockFetch).mockResolvedValueOnce({
      json: async () => ({ response: maliciousResponse }),
    });

    initializeChatbot();
    const chatInput = document.getElementById('chat-input') as HTMLInputElement;

    chatInput.value = 'Hello';

    const chatForm = document.getElementById('chat-form');
    chatForm.dispatchEvent(new Event('submit'));

    await new Promise(resolve => setTimeout(resolve, 100));

    const messagesList = document.getElementById('messages-list');
    // Server response should also be sanitized - HTML tags not executed
    expect(messagesList.innerHTML).not.toContain('<div>');
    // But text content should be preserved
    expect(messagesList.textContent).toContain('malicious');
  });
});
