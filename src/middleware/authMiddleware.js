export const authMiddleware = (socket, next) => {
  const username = socket.handshake.auth.username;

  if (!username || username.trim() === '') {
    return next(new Error('Username is required'));
  }

  if (username.length < 2 || username.length > 20) {
    return next(new Error('Username must be between 2 and 20 characters'));
  }

  const usernameRegex = /^[a-zA-Z0-9_-]+$/;

  if (!usernameRegex.test(username)) {
    return next(
      new Error(
        'Username can only contain letters, numbers, underscores, and hyphens'
      )
    );
  }

  socket.username = username.trim();
  next();
};
