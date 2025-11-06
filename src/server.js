import express from 'express';
import { Server } from 'socket.io';
import { config } from './config/index.js';
import { logger } from './utils/logger.js';
import { UserService } from './services/userService.js';
import { MessageService } from './services/messageService.js';

const userService = new UserService();
const messageService = new MessageService();
const app = express();

const io = new Server({
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

// middleware
app.use(express.json());

// health check
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    environment: config.env,
    connections: userService.getUserCount(),
  });
});

// check for inactive users
setInterval(() => {
  const changedUsers = userService.checkInactiveUsers();

  changedUsers.forEach((user) => {
    logger.info(`User ${user.username} is now away (inactive)`);

    io.emit('user:status:changed', {
      user: user,
      oldStatus: 'online',
      newStatus: 'away',
    });
  });
}, 30000);

// socket io midleware
io.use((socket, next) => {
  const username =
    socket.handshake.auth.username || socket.handshake.query.username;

  if (!username || username.trim() === '') {
    return next(new Error('Username is required'));
  }

  if (username.length < 2 || username.length > 20) {
    return next(new Error('Username must be between 2 and 20 characters'));
  }

  socket.username = username.trim();
  next();
});

// socket io
io.on('connection', (socket) => {
  const result = userService.addUser(socket.id, socket.username);

  if (!result.success) {
    socket.emit('error', { message: result.error });
    socket.disconnect();
    return;
  }

  logger.info(`User connected: ${socket.username} (${socket.id})`);

  socket.emit('user:connected', {
    user: result.user,
  });

  io.emit('user:joined', {
    user: result.user,
    userCount: userService.getUserCount(),
  });

  socket.emit('users:list', {
    users: userService.getAllUsers(),
  });

  socket.on('typing:start', () => {
    const user = userService.setTyping(socket.id);

    if (user) {
      logger.debug(`${user.username} started typing`);

      socket.broadcast.emit('user:typing', {
        userId: user.id,
        username: user.username,
      });

      userService.setTypingTimeout(socket.id, () => {
        const user = userService.stopTyping(socket.id);
        if (user) {
          logger.debug(`${user.username} auto-stopped typing (timeout)`);

          socket.broadcast.emit('user:stopped:typing', {
            userId: user.id,
            username: user.username,
          });
        }
      });
    }
  });

  socket.on('typing:stop', () => {
    const user = userService.stopTyping(socket.id);

    if (user) {
      logger.debug(`${user.username} stopped typing`);

      socket.broadcast.emit('user:stopped:typing', {
        userId: user.id,
        username: user.username,
      });
    }
  });

  socket.on('message', (data, acknowledgment) => {
    const messageText = typeof data === 'string' ? data : String(data);

    if (!messageText || messageText.trim() === '') {
      socket.emit('error', { message: 'Message cannot be empty' });
      return;
    }

    userService.stopTyping(socket.id);

    const activityResult = userService.updateActivity(socket.id);

    if (activityResult.statusChanged) {
      logger.info(`User ${socket.username} is back online`);

      io.emit('user:status:changed', {
        user: activityResult.user,
        oldStatus: 'away',
        newStatus: 'online',
      });
    }

    const user = userService.getUser(socket.id);

    const message = messageService.createMessage(
      socket.id,
      user.username,
      messageText
    );

    if (acknowledgment && typeof acknowledgment === 'function') {
      acknowledgment({
        success: true,
        messageId: message.id,
        timestamp: message.timestamp,
      });
    }

    io.emit('message', message);

    logger.info(`Message from ${user.username}:`, message.text);
  });

  socket.on('message:private', (data) => {
    const { recipientId, text } = data;

    if (!recipientId || !text || text.trim() === '') {
      socket.emit('error', { message: 'Invalid private message format' });
      return;
    }

    const recipient = userService.getUser(recipientId);

    if (!recipient) {
      socket.emit('error', { message: 'Recipient not found' });
      return;
    }

    if (recipientId === socket.id) {
      socket.emit('error', { message: 'Cannot send message to yourself' });
      return;
    }

    const sender = userService.getUser(socket.id);

    const message = messageService.createPrivateMessage(
      socket.id,
      sender.username,
      recipientId,
      recipient.username,
      text
    );

    io.to(recipientId).emit('message:private', message);

    socket.emit('message:private', message);

    logger.info(
      `Private message from ${sender.username} to ${recipient.username}: "${message.text}"`
    );
  });

  socket.on('message:private:delivered', (data) => {
    const { messageId } = data;

    if (!messageId) {
      logger.warn(
        `Invalid private message delivery confirmation from ${socket.username}`
      );
      return;
    }

    const message = messageService.markPrivateMessageAsDelivered(messageId);

    if (message) {
      logger.debug(
        `Private message ${messageId} delivered to ${socket.username}`
      );

      io.to(message.senderId).emit('message:status:updated', {
        messageId: message.id,
        status: 'delivered',
        type: 'private',
        recipientId: message.recipientId,
        deliveredAt: message.deliveredAt,
      });
    }
  });

  socket.on('message:delivered', (data) => {
    const { messageId } = data;

    if (!messageId) {
      logger.warn(`Invalid delivery confirmation from ${socket.username}`);
      return;
    }

    const message = messageService.markAsDelivered(messageId, socket.id);

    if (message) {
      logger.debug(
        `Message ${messageId} delivered to ${socket.username} (${message.deliveredTo.length} recipients)`
      );

      io.to(message.senderId).emit('message:status:updated', {
        messageId: message.id,
        status: message.status,
        deliveredTo: message.deliveredTo.length,
        deliveredAt: message.deliveredAt,
      });
    }
  });

  socket.on('disconnect', (reason) => {
    const user = userService.removeUser(socket.id);

    if (user) {
      logger.info(
        `User disconnected: ${user.username} (${socket.id}), reason: ${reason}`
      );

      io.emit('user:left', {
        user: user,
        userCount: userService.getUserCount(),
      });
    }
  });

  socket.on('error', (error) => {
    logger.error(`Socket error for ${socket.username}:`, error);
  });
});

// start server
const server = app.listen(config.port, () => {
  logger.info(`Server started on port ${config.port}`);
  logger.info(`Environment: ${config.env}`);
});

io.attach(server);

// graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM signal received: closing HTTP server');
  io.close(() => {
    logger.info('Socket.IO server closed');
  });
  server.close(() => {
    logger.info('HTTP server closed');
  });
});
