export class UserService {
  constructor() {
    this.users = new Map();
    this.usernames = new Set();
    this.AWAY_THRESHOLD = 2 * 60 * 1000;
  }

  addUser(socketId, username) {
    if (this.usernames.has(username)) {
      return { success: false, error: 'Username already taken' };
    }

    const user = {
      id: socketId,
      username: username,
      status: 'online',
      lastActivity: Date.now(),
      connectedAt: new Date().toISOString(),
    };

    this.users.set(socketId, user);
    this.usernames.add(username);

    return { success: true, user };
  }

  removeUser(socketId) {
    const user = this.users.get(socketId);

    if (user) {
      this.users.delete(socketId);
      this.usernames.delete(user.username);
      return user;
    }

    return null;
  }

  getUser(socketId) {
    return this.users.get(socketId);
  }

  getAllUsers() {
    return Array.from(this.users.values());
  }

  getUserCount() {
    return this.users.size;
  }

  updateActivity(socketId) {
    const user = this.users.get(socketId);

    if (user) {
      user.lastActivity = Date.now();

      if (user.status === 'away') {
        user.status = 'online';
        return { statusChanged: true, user };
      }
    }

    return { statusChanged: false, user };
  }

  checkInactiveUsers() {
    const now = Date.now();
    const changedUsers = [];

    for (const [socketId, user] of this.users.entries()) {
      if (user.status === 'online') {
        const inactiveDuration = now - user.lastActivity;

        if (inactiveDuration >= this.AWAY_THRESHOLD) {
          user.status = 'away';
          changedUsers.push(user);
        }
      }
    }

    return changedUsers;
  }
}
