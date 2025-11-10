import { dom } from './dom.js';
import { connectToServer } from './socket.js';
import { state } from './state.js';

export function initAuth() {
  dom.loginForm.addEventListener('submit', handleLogin);
  dom.logoutButton.addEventListener('click', handleLogout);
}

function handleLogin(e) {
  e.preventDefault();

  const username = dom.usernameInput.value.trim();

  if (username.length < 2 || username.length > 20) {
    showLoginError('Username must be 2-20 characters');
    return;
  }

  dom.usernameInput.disabled = true;
  dom.loginButton.disabled = true;
  dom.loginButton.textContent = 'Connecting...';

  connectToServer(username);
}

function handleLogout() {
  if (state.socket) {
    state.socket.disconnect();
    state.socket = null;
  }

  state.currentUser = null;
  state.messageHistory.group = [];
  state.messageHistory.private.clear();
  location.reload();
}

export function showChatScreen() {
  dom.loginScreen.classList.add('hidden');
  dom.chatScreen.classList.remove('hidden');
}

export function showLoginError(message) {
  dom.loginError.textContent = message;
  dom.loginError.classList.remove('hidden');

  setTimeout(() => {
    dom.loginError.classList.add('hidden');
  }, 5000);
}

export function resetLoginForm() {
  dom.usernameInput.disabled = false;
  dom.loginButton.disabled = false;
  dom.loginButton.textContent = 'Join Chat';
}
