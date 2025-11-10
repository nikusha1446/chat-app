import { switchToPrivateChat } from './chat.js';
import { dom } from './dom.js';
import { state } from './state.js';

export function renderUsersList() {
  dom.usersListEl.innerHTML = '';
  dom.usersCountEl.textContent = state.onlineUsers.size - 1;

  state.onlineUsers.forEach((user) => {
    if (user.id === state.currentUser.id) return;

    const userEl = document.createElement('div');
    userEl.className = 'user-item';
    userEl.dataset.userId = user.id;

    if (state.currentChat === user.id) {
      userEl.classList.add('active');
    }

    const statusDot = document.createElement('span');
    statusDot.className = `user-status ${user.status}`;

    const nameSpan = document.createElement('span');
    nameSpan.className = 'user-name';
    nameSpan.textContent = user.username;

    userEl.appendChild(statusDot);
    userEl.appendChild(nameSpan);

    userEl.addEventListener('click', () => {
      switchToPrivateChat(user);
    });

    dom.usersListEl.appendChild(userEl);
  });
}
