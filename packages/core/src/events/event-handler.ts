import { EventEmitter } from 'events';

class EventManager {
  private eventEmitter: EventEmitter;
  private subscriptions: Map<string, (...args: any[]) => void>;

  constructor() {
    this.eventEmitter = new EventEmitter();
    this.subscriptions = new Map();
  }

  emitEvent<T>(eventName: string, data: T) {
    this.eventEmitter.emit(eventName, data);
  }

  addListener(eventName: string, callback: (data: any) => any): string {
    const listenerId = `${eventName}-${Date.now()}-${Math.random()}`;
    this.eventEmitter.on(eventName, callback);
    this.subscriptions.set(listenerId, callback);

    return listenerId; // Return the ID to reference this listener for unsubscription
  }

  unsubscribe(listenerId: string) {
    const callback = this.subscriptions.get(listenerId);
    if (callback) {
      this.eventEmitter.off(listenerId.split('-')[0], callback); // Remove the specific listener
      this.subscriptions.delete(listenerId); // Remove from the subscription map
      console.log(`Removed listener: ${listenerId}`);
    }
  }
}

export const LocalTrainRails = new EventManager();
