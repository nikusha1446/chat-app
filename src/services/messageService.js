export class MessageService {
  constructor() {
    this.messages = new Map();
  }

  createMessage(socketId, username, text) {
    const message = {
      id: `${Date.now()}-${socketId}`,
      text: text.trim(),
      senderId: socketId,
      username: username,
      timestamp: new Date().toISOString(),
      status: 'sent',
      deliveredTo: [],
    };

    this.messages.set(message.id, message);
    return message;
  }

  markAsDelivered(messageId, socketId) {
    const message = this.messages.get(messageId);

    if (message && !message.deliveredTo.includes(socketId)) {
      message.deliveredTo.push(socketId);

      if (message.status === 'sent') {
        message.status = 'delivered';
        message.deliveredAt = new Date().toISOString();
      }
    }

    return message;
  }

  getMessage(messageId) {
    return this.messages.get(messageId);
  }
}
