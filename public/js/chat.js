import { dom } from './dom.js';
import { state } from './state.js';
import { hideTypingIndicator, stopTyping } from './typing.js';
import { escapeHtml, formatTime, scrollToBottom } from './utils.js';

export function initChat() {
  dom.sendButton.addEventListener('click', sendMessage);
  dom.messageInput.addEventListener('keypress', handleKeypress);
  dom.groupChatBtn.addEventListener('click', switchToGroupChat);
}

function handleKeypress(e) {
  if (e.key === 'Enter') {
    sendMessage();
  }
}

export function sendMessage() {
  const text = dom.messageInput.value.trim();

  if (!text) return;

  if (state.currentChat === 'group') {
    state.socket.emit('message', text);
  } else {
    state.socket.emit('message:private', {
      recipientId: state.currentChat,
      text: text,
    });
  }

  dom.messageInput.value = '';
  stopTyping();
}

export function displayMessage(message, isPrivate = false) {
  const messageEl = document.createElement('div');
  const isOwn = message.senderId === state.currentUser.id;

  messageEl.className = `message ${isOwn ? 'own' : 'other'}`;

  const time = formatTime(message.timestamp);
  const username = message.username || message.senderUsername;

  messageEl.innerHTML = `
    <div class="message-header">
      <span class="message-username">${escapeHtml(username)}</span>
      <span class="message-time">${time}</span>
    </div>
    <div class="message-bubble">
      <div class="message-text">${escapeHtml(message.text)}</div>
    </div>
  `;

  dom.messagesEl.appendChild(messageEl);
  scrollToBottom(dom.messagesEl.parentElement);
}

export function addSystemMessage(text) {
  const messageEl = document.createElement('div');
  messageEl.className = 'system-message';
  messageEl.textContent = text;
  dom.messagesEl.appendChild(messageEl);
  scrollToBottom(dom.messagesEl.parentElement);
}

export function switchToPrivateChat(user) {
  state.currentChat = user.id;
  dom.chatTitle.textContent = user.username;
  dom.chatSubtitle.textContent = 'Private conversation';

  dom.messagesEl.innerHTML = '';
  hideTypingIndicator();

  const history = state.messageHistory.private.get(user.id) || [];
  history.forEach((message) => {
    displayMessage(message, true);
  });

  document.querySelectorAll('.user-item').forEach((el) => {
    el.classList.remove('active');
  });

  const selectedUser = document.querySelector(`[data-user-id="${user.id}"]`);

  if (selectedUser) {
    selectedUser.classList.add('active');
  }

  dom.groupChatBtn.classList.remove('active');
  dom.messageInput.focus();
}

export function switchToGroupChat() {
  state.currentChat = 'group';
  dom.chatTitle.textContent = 'Group Chat';
  dom.chatSubtitle.textContent = 'Everyone can see these messages';

  dom.messagesEl.innerHTML = '';
  hideTypingIndicator();

  state.messageHistory.group.forEach((message) => {
    if (message.type === 'system') {
      addSystemMessage(message.text);
    } else {
      displayMessage(message, false);
    }
  });

  document.querySelectorAll('.user-item').forEach((el) => {
    el.classList.remove('active');
  });

  dom.groupChatBtn.classList.add('active');
  dom.messageInput.focus();
}
