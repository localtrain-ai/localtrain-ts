// src/agent/Agent.ts

import { ContextDTO, IAgent, IBehaviour } from '../../types';
import { Behaviour } from './behaviour';
import { AgentProvider, BaseProvider } from '../../base-providers/index';
import { ProviderRegistry } from '../provider-registry';
import { InputValidator } from '../input-validator';
import { ContextManager } from '../context-manager';
import { BehaviorExecutor } from '../behaviour-executor';
import { ConfigManager } from '../../config-manager';
import { LocalTrainRails } from '../../events/event-handler';
import { LOCALTRAIN_EVENTS } from '../../events/events.list';
import {v4 as uuidV4} from 'uuid';
import { StorageBaseProvider } from '../../base-providers/storage-base-provider';
import { InMemoryStateStorage } from '../../storage/InMemoryStateStorage';
import { logger } from '../../utils/logger';

export class Agent extends AgentProvider {
  private providerRegistry: ProviderRegistry;
  private inputValidator: InputValidator;
  private contextManager: ContextManager;
  private behaviorExecutor: BehaviorExecutor;
  private stateStorage: StorageBaseProvider;

  constructor(
    options?: {
      providerRegistry?: ProviderRegistry,
      inputValidator?: InputValidator,
      behaviorExecutor?: BehaviorExecutor,
      agent?: Agent,
      contextManager?: ContextManager,
      stateStorage?: StorageBaseProvider
    }
  ) {
    super();
    this.providerRegistry = options?.providerRegistry || ConfigManager.getProviderRegistry() ||  new ProviderRegistry();
    this.inputValidator = options?.inputValidator || new InputValidator();
    this.contextManager = options?.contextManager || new ContextManager(new ContextDTO());
    this.stateStorage = options?.stateStorage || new InMemoryStateStorage();
    this.behaviorExecutor =
      options?.behaviorExecutor ||
      new BehaviorExecutor(this.providerRegistry, this.contextManager);

    if (options?.agent) {
      this.name = options.agent.name as string;
      this.description = options.agent.description as string;
      this.behaviours = options.agent.behaviours as Behaviour[];
      this.contextManager.updateContext(
        options.agent.contextManager.getContext()
      );
    }
  }

  validateInputs(userInput: Record<string, any>) {
    this.inputValidator.validate(this.availableUserInputs, userInput);
  }

  async run(
    userInput?: Record<string, any>,
    mockRun = false,
    runId?: string,
    resume = false // New parameter to indicate resuming execution
  ): Promise<ContextDTO> {
    try {
      if (!this.behaviours.length) {
        throw new Error('An agent must have at least one behaviour to run');
      }

      // Load the saved state if resuming
      if (resume && runId) {
        const savedContextManager = await ContextManager.loadState(runId, this.stateStorage);
        this.contextManager = savedContextManager;
        this.contextManager.setStateStorage(this.stateStorage);
      } else {
        this.validateInputs(userInput || {});
        this.contextManager.updateContext({ userInput });
        this.contextManager.updateContext({
          runId: runId || uuidV4(),
        });
      }


      // Determine the starting point
      const startIndex = this.getStartIndex();

      // Execute remaining behaviors
      for (let i = startIndex; i < this.behaviours.length; i++) {
        const behaviour = this.behaviours[i];
        this.contextManager.updateContext({
          currentExecutionBehaviourIndex: i,
          isLastExecutionBehaviour: i === this.behaviours.length - 1
        })
        await this.behaviorExecutor.executeBehavior(
          behaviour,
          userInput || {}
        );

        // Check if an interrupt occurred during this behavior
        if (this.contextManager.getContext().interrupted) {
          // Stop execution
          break;
        }
      }

      // Emit execution complete event if not interrupted
      if (!this.contextManager.getContext().interrupted) {
        LocalTrainRails.emitEvent(LOCALTRAIN_EVENTS.AGENT_EXECUTION_COMPLETE, {
          ...this.contextManager.getContext(),
          externalData: this.contextManager.getExternalData(),
        });
      }

      return this.contextManager.getContext();
    } catch (e) {
      logger.error(`Error during agent execution: ${e}`)
      throw e;
    }
  }

  private getStartIndex(): number {
    const context = this.contextManager.getContext();
    if (context.currentBehaviourName) {
      const index = this.behaviours.findIndex(
        (b) => b.getName() === context.currentBehaviourName
      );
      // Resume from the next behavior after the one that was interrupted
      return index + 1;
    }
    return 0; // Start from the beginning
  }

  addConfig(agent: IAgent): this {
    this.name = agent.name;
    this.description = agent.description;
    this.availableUserInputs = agent.inputs;
    return this.addBehaviours(agent.behaviours);
  }

  useProviders(...providers: BaseProvider<any, any>[]): this {
    providers.forEach((provider) =>
      this.providerRegistry.attachProvider(provider)
    );
    return this;
  }

  addBehaviour(behaviour: IBehaviour): this {
    this.behaviours.push(new Behaviour(behaviour));
    return this;
  }

  addBehaviours(behaviours: IBehaviour[]): this {
    this.behaviours.push(...behaviours.map((b) => new Behaviour(b)));
    return this;
  }
}
