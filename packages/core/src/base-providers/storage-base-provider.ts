import { ContextDTO } from '../types';

export abstract class StorageBaseProvider {
  abstract save(runId: string, context: ContextDTO): Promise<void>;

  abstract load(runId: string): Promise<ContextDTO>;
}
