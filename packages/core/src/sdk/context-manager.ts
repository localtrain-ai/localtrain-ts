// src/context/ContextManager.ts

import { ContextDTO } from '../types';
import { resolveDynamicVariables } from '../utils/utils';
import { Behaviour } from './agent/behaviour';
import { StorageBaseProvider } from '../base-providers/storage-base-provider';
import { InMemoryStateStorage } from '../storage/InMemoryStateStorage';
import { InterruptManager } from '../managers/InterruptManager';

export class ContextManager {
  private context: ContextDTO = {} as ContextDTO;
  private _externalData: Record<string, any> = {};
  private stateStorage!: StorageBaseProvider;
  private interruptManager: InterruptManager;

  constructor(initialContext?: ContextDTO, stateStorage?: StorageBaseProvider) {
    if (initialContext) {
      this.context = JSON.parse(JSON.stringify(initialContext)); // Deep clone to prevent mutations
    }
    this.stateStorage = stateStorage || new InMemoryStateStorage();
    this.interruptManager = new InterruptManager();

    // Initialize systemExecutionContext to an empty object if not present
    if (!this.context.systemExecutionContext) {
      this.context.systemExecutionContext = {};
    }
    // Initialize stepResults to an empty object if not present
    if (!this.context.stepResults) {
      this.context.stepResults = {};
    }
  }

  setInterruptManager(interruptManager: InterruptManager): void {
    this.interruptManager = interruptManager;
  }


  getInterruptManager(): InterruptManager {
    return this.interruptManager;
  }

  setStateStorage(stateStorage: StorageBaseProvider): void {
    this.stateStorage = stateStorage;
  }

  async saveState(): Promise<void> {
    await this.stateStorage.save(this.context.runId, this.context);
  }

  static async loadState(
    runId: string,
    stateStorage: StorageBaseProvider
  ): Promise<ContextManager> {
    const context = await stateStorage.load(runId);
    return new ContextManager(context, stateStorage);
  }



  updateContext(newContext: Partial<ContextDTO>) {
    this.context = { ...this.context, ...newContext };
  }

  setContext(context: ContextDTO) {
    this.context = context;
  }

  getContext(): ContextDTO {
    return this.context;
  }

  getCurrentBehaviour(): Behaviour | undefined {
    return this.context.currentBehaviour;
  }

  setValue(key: string, value: any) {
    this._externalData[key] = value;
    return this;
  }

  getValue(key: string) {
    return this._externalData[key];
  }

  getExternalData() {
    return this._externalData;
  }

  setCurrentBehaviour(behaviour: Behaviour) {
    this.context.currentBehaviour = behaviour;
  }

  cloneContext(): ContextManager {
    return new ContextManager(this.context);
  }

  mergeContext(context: ContextDTO) {
    this.context.currentBehaviorTraces?.concat([(context.currentBehaviorTraces || []) ])
  }

  initializeStepResult(behaviorName: string) {
    if (!this.context.stepResults) {
      this.context.stepResults = {};
    }
    this.context.stepResults[behaviorName] = {
      output: [],
    };
  }

  setIterationContext(behaviorName: string, iterationIndex: number) {
    this.context.systemExecutionContext = {
      ...this.context.systemExecutionContext,
      iterationIndex,
      parentBehaviourName: behaviorName,
    };
  }

  addIterationResult(behaviorName: string, iterationIndex: number, result: any) {
    if (!this.context.stepResults[behaviorName].output[iterationIndex]) {
      this.context.stepResults[behaviorName].output[iterationIndex] = {};
    }
    this.context.stepResults[behaviorName].output[iterationIndex] = {
      ...this.context.stepResults[behaviorName].output[iterationIndex],
      ...result,
    };
  }

  clearIterationContext() {
    if (this.context.systemExecutionContext) {
      delete this.context.systemExecutionContext['iterationIndex'];
      delete this.context.systemExecutionContext['parentBehaviourName'];
    }
  }

  resolveDynamicVariable(variable: any): any {
    return resolveDynamicVariables(variable, this.context, { debug: false });
  }
}
