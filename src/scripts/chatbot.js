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
        messageBubble.textContent = sanitizeInput(message.content);

        messageContainer.appendChild(messageBubble);
        messagesList.appendChild(messageContainer);
      });
      scrollToBottom();
    }
  };

  const sendMessage = async () => {
    if (!chatInput) return;
    const input = sanitizeInput(chatInput.value.trim());
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
        content: sanitizeInput(data.response),
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
function sanitizeInput(input) {
  if (typeof input !== 'string') return '';

  // Use DOMPurify for comprehensive HTML sanitization
  // Configured to be strict: no HTML tags allowed, only text content
  const clean = DOMPurify.sanitize(input, {
    ALLOWED_TAGS: [], // No HTML tags allowed
    ALLOWED_ATTR: [], // No attributes allowed
    KEEP_CONTENT: true, // Keep text content
    RETURN_DOM: false, // Return string
    RETURN_DOM_FRAGMENT: false,
    RETURN_DOM_IMPORT: false,
    SANITIZE_DOM: true,
    SANITIZE_DOM_FRAGMENT: true,
    SANITIZE_NAMED_PROPS: true,
    WHOLE_DOCUMENT: false,
    CUSTOM_ELEMENT_HANDLING: {
      tagNameCheck: null,
      attributeNameCheck: null,
      allowCustomizedBuiltInElements: false,
    },
  });

  // Additional sanitization for protocols and patterns that DOMPurify might miss in plain text
  return clean
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/data:/gi, '') // Remove data: protocol
    .replace(/vbscript:/gi, '') // Remove vbscript: protocol
    .replace(/on\w+=/gi, '') // Remove event handlers
    .trim();
}
