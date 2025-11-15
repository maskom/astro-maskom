/**
 * Chatbot Manager - Handles chat functionality with security
 */

class ChatbotManager {
  constructor(initialMessages = []) {
    this.messagesList = document.getElementById('messages-list');
    this.chatInput = document.getElementById('chat-input');
    this.chatForm = document.getElementById('chat-form');
    this.sendButton = document.getElementById('send-button');
    this.loadingIndicator = document.getElementById('loading-indicator');
    
    this.messagesList = document.getElementById('messages-list');
    this.chatInput = document.getElementById('chat-input');
    this.chatForm = document.getElementById('chat-form');
    this.sendButton = document.getElementById('send-button');
    this.loadingIndicator = document.getElementById('loading-indicator');
    
    this.state = {
      messages: [...initialMessages],
      loading: false
    };
    
    this.init();
  }

  init() {
    if (this.chatForm) {
      this.chatForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.sendMessage();
      });
    }
    
    this.renderMessages();
  }

  scrollToBottom() {
    const messagesEnd = document.getElementById('messages-end');
    if (messagesEnd) {
      messagesEnd.scrollIntoView({ behavior: "smooth" });
    }
  }

  renderMessages() {
    if (this.messagesList) {
      this.messagesList.innerHTML = ''; // Clear previous messages
      this.state.messages.forEach(message => {
        const messageContainer = document.createElement('div');
        messageContainer.className = `mb-4 ${message.role === 'user' ? 'text-right' : 'text-left'}`;

        const messageBubble = document.createElement('div');
        messageBubble.className = `inline-block p-3 rounded-lg max-w-[80%] ${
          message.role === 'user'
            ? 'bg-indigo-500 text-white rounded-br-none'
            : 'bg-white border border-gray-200 rounded-bl-none'
        }`;

        // Sanitize message content to prevent XSS
        messageBubble.textContent = this.sanitizeHtml(message.content);

        messageContainer.appendChild(messageBubble);
        this.messagesList.appendChild(messageContainer);
      });
      this.scrollToBottom();
    }
  }

  sanitizeHtml(input) {
    const div = document.createElement('div');
    div.textContent = input;
    return div.innerHTML;
  }

  async sendMessage() {
    if (!this.chatInput) return;
    const input = this.chatInput.value.trim();
    if (!input || this.state.loading) return;
    
    const userMessage = { role: 'user', content: input };
    this.state.messages = [...this.state.messages, userMessage];
    this.chatInput.value = '';
    this.state.loading = true;
    
    if (this.sendButton) this.sendButton.disabled = true;
    if (this.loadingIndicator) this.loadingIndicator.classList.remove('hidden');
    this.renderMessages();
    
    try {
      const response = await fetch('/api/chat/completion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: this.state.messages.slice(1) }),
      });
      
      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      }
      
      const assistantMessage = { role: 'assistant', content: data.response };
      this.state.messages = [...this.state.messages, assistantMessage];
    } catch (error) {
      const errorMessage = { 
        role: 'assistant', 
        content: 'Sorry, I encountered an error. Please try again.' 
      };
      this.state.messages = [...this.state.messages, errorMessage];
    } finally {
      this.state.loading = false;
      if (this.sendButton) this.sendButton.disabled = false;
      if (this.loadingIndicator) this.loadingIndicator.classList.add('hidden');
      this.renderMessages();
    }
  }
}

// Initialize chatbot when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  // Get initial messages from global variable if available
  const initialMessages = window.chatbotInitialMessages || [];
  new ChatbotManager(initialMessages);
});