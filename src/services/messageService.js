export class MessageService {
  constructor() {
    this.messages = new Map();
    this.privateMessages = new Map();
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
      type: 'public',
    };

    this.messages.set(message.id, message);
    return message;
  }

  createPrivateMessage(
    senderId,
    senderUsername,
    recipientId,
    recipientUsername,
    text
  ) {
    const message = {
      id: `${Date.now()}-${senderId}`,
      text: text.trim(),
      senderId: senderId,
      senderUsername: senderUsername,
      recipientId: recipientId,
      recipientUsername: recipientUsername,
      timestamp: new Date().toISOString(),
      status: 'sent',
      delivered: false,
      type: 'private',
    };

    const conversationId = [senderId, recipientId].sort().join('-');

    if (!this.privateMessages.has(conversationId)) {
      this.privateMessages.set(conversationId, []);
    }

    this.privateMessages.get(conversationId).push(message);
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

  markPrivateMessageAsDelivered(messageId) {
    const message = this.messages.get(messageId);

    if (message && message.type === 'private' && !message.delivered) {
      message.delivered = true;
      message.deliveredAt = new Date().toISOString();
    }

    return message;
  }

  getMessage(messageId) {
    return this.messages.get(messageId);
  }

  getPrivateConversation(userId1, userId2) {
    const conversationId = [userId1, userId2].sort().join('-');
    return this.privateMessages.get(conversationId) || [];
  }
}
