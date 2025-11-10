import { dom } from './dom.js';
import { state } from './state.js';

export function initTyping() {
  dom.messageInput.addEventListener('input', handleInput);
}

function handleInput() {
  if (dom.messageInput.value.trim()) {
    startTyping();
  } else {
    stopTyping();
  }
}

export function startTyping() {
  const data =
    state.currentChat === 'group' ? {} : { recipientId: state.currentChat };
  state.socket.emit('typing:start', data);

  clearTimeout(state.typingTimeout);

  state.typingTimeout = setTimeout(() => {
    stopTyping();
  }, 2000);
}

export function stopTyping() {
  const data =
    state.currentChat === 'group' ? {} : { recipientId: state.currentChat };
  state.socket.emit('typing:stop', data);
  clearTimeout(state.typingTimeout);
}

export function showTypingIndicator(username) {
  dom.typingText.textContent = `${username} is typing...`;
  dom.typingIndicator.classList.remove('hidden');
}

export function hideTypingIndicator() {
  dom.typingIndicator.classList.add('hidden');
}
