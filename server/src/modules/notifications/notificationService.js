import EventEmitter from "events";

class NotificationService extends EventEmitter {
  constructor() {
    super();
  }

  async dispatchNotification(notification) {
    this.emit("notification", notification);
  }
}

const notificationService = new NotificationService();

export function getNotificationService() {
  return notificationService;
}

export function sendNotification(notification) {
  return notificationService.dispatchNotification(notification);
}
