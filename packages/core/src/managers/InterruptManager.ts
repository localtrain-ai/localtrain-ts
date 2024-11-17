import { InterruptSignal } from '../types';

export class InterruptManager {
  private interruptSignal: InterruptSignal | null = null;

  setInterrupt(signal: InterruptSignal): void {
    this.interruptSignal = signal;
  }

  getInterrupt(): InterruptSignal | null {
    return this.interruptSignal;
  }

  clearInterrupt(): void {
    this.interruptSignal = null;
  }
}
