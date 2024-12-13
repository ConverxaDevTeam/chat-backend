export enum NotificationType {
  MESSAGE_RECEIVED = 'messageReceived',
}

export interface MessageReceivedNotification {
  type: NotificationType.MESSAGE_RECEIVED;
  data: {
    conversationId: number;
  };
}

export interface NotificationMessage<T extends { type: string; data?: unknown }> {
  type: T['type'];
  message: string;
  data?: T['data'];
}
