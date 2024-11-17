// src/utils/InMemoryStateStorage.ts

import { ContextDTO } from '../types';
import { StorageBaseProvider } from '../base-providers/storage-base-provider';

export class InMemoryStateStorage extends StorageBaseProvider {
  private storage: Map<string, ContextDTO> = new Map();

  async save(runId: string, context: ContextDTO): Promise<void> {
    this.storage.set(runId, context);
  }

  async load(runId: string): Promise<ContextDTO> {
    const context = this.storage.get(runId);
    if (!context) {
      throw new Error(`No state found for runId: ${runId}`);
    }
    return context;
  }
}
