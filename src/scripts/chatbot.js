import DOMPurify from 'dompurify';

export function initializeChatbot(initialMessages = []) {
  let messages = [...initialMessages];
  let loading = false;

  const messagesList = document.getElementById('messages-list');
  const chatInput = document.getElementById('chat-input');
  const chatForm = document.getElementById('chat-form');
  const sendButton = document.getElementById('send-button');
  const loadingIndicator = document.getElementById('loading-indicator');

  const scrollToBottom = () => {
    const messagesEnd = document.getElementById('messages-end');
    if (messagesEnd) {
      messagesEnd.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const renderMessages = () => {
    if (messagesList) {
      messagesList.innerHTML = ''; // Clear previous messages
      messages.forEach(message => {
        const messageContainer = document.createElement('div');
        messageContainer.className = `mb-4 ${message.role === 'user' ? 'text-right' : 'text-left'}`;

        const messageBubble = document.createElement('div');
        messageBubble.className = `inline-block p-3 rounded-lg max-w-[80%] ${
          message.role === 'user'
            ? 'bg-indigo-500 text-white rounded-br-none'
            : 'bg-white border border-gray-200 rounded-bl-none'
        }`;

        // Sanitize message content to prevent XSS
        // Use textContent for maximum security - no HTML rendering
        messageBubble.textContent = sanitizeMessageContent(message.content);

        messageContainer.appendChild(messageBubble);
        messagesList.appendChild(messageContainer);
      });
      scrollToBottom();
    }
  };

  const sendMessage = async () => {
    if (!chatInput) return;
    const input = sanitizeUserInput(chatInput.value.trim());
    if (!input || loading) return;

    const userMessage = { role: 'user', content: input };
    messages = [...messages, userMessage];
    chatInput.value = '';
    loading = true;
    if (sendButton) sendButton.disabled = true;
    if (loadingIndicator) loadingIndicator.classList.remove('hidden');
    renderMessages();

    try {
      const response = await fetch('/api/chat/completion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: messages.slice(1) }),
      });

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      const assistantMessage = {
        role: 'assistant',
        content: sanitizeMessageContent(data.response),
      };
      messages = [...messages, assistantMessage];
    } catch {
      const errorMessage = {
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
      };
      messages = [...messages, errorMessage];
    } finally {
      loading = false;
      if (sendButton) sendButton.disabled = false;
      if (loadingIndicator) loadingIndicator.classList.add('hidden');
      renderMessages();
    }
  };

  if (chatForm) {
    chatForm.addEventListener('submit', e => {
      e.preventDefault();
      sendMessage();
    });
  }

  // Initial render
  renderMessages();
}

/**
 * Sanitize user input to prevent XSS attacks
 * Uses DOMPurify for comprehensive HTML sanitization
 */
function sanitizeUserInput(input) {
  if (typeof input !== 'string') return '';

  // First, use DOMPurify for comprehensive HTML sanitization
  const sanitized = DOMPurify.sanitize(input, {
    ALLOWED_TAGS: [], // No HTML tags allowed in user input
    ALLOWED_ATTR: [], // No attributes allowed
    KEEP_CONTENT: true, // Keep text content
    RETURN_DOM: false,
    RETURN_DOM_FRAGMENT: false,
    RETURN_DOM_IMPORT: false,
  });

  // Additional security measures for edge cases
  return sanitized
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/vbscript:/gi, '') // Remove vbscript: protocol
    .replace(/data:/gi, '') // Remove data: protocol
    .replace(/on\w+=/gi, '') // Remove event handlers
    .trim();
}

/**
 * Sanitize message content (for assistant responses)
 * More permissive for legitimate content but still secure
 */
function sanitizeMessageContent(content) {
  if (typeof content !== 'string') return '';

  // Use DOMPurify with safe configuration for message content
  return DOMPurify.sanitize(content, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'br', 'p'], // Allow basic formatting
    ALLOWED_ATTR: [], // No attributes allowed
    KEEP_CONTENT: true,
    RETURN_DOM: false,
    RETURN_DOM_FRAGMENT: false,
    RETURN_DOM_IMPORT: false,
  });
}
