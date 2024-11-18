// src/executor/BehaviorExecutor.ts

import { ProviderRegistry } from './provider-registry';
import { InterruptSignal, LooperProviderInputs } from '../types';
import { ContextManager } from './context-manager';
import { Behaviour } from './agent/behaviour';
import { BaseProvider } from '../base-providers';
import { logger } from '../utils/logger';
import { LocalTrainRails } from '../events/event-handler';
import { LOCALTRAIN_EVENTS } from '../events/events.list';
import { v4 as uuidv4 } from 'uuid';
// import * as pLimit from 'p-limit';


export class BehaviorExecutor {
  constructor(
    private providerRegistry: ProviderRegistry,
    private contextManager: ContextManager
  ) {}

  async executeBehavior(
    behavior: Behaviour,
    userInput: Record<string, any>,
    iterationContextManager?: ContextManager // Optional parameter for iterations
  ): Promise<void> {
    const providerKey = behavior.getProvider();
    const provider = this.providerRegistry.getProviderByKey(providerKey);

    if (!provider) {
      throw new Error(`Provider not found: ${providerKey}`);
    }

    switch (behavior.getProviderType()) {
      case 'flow-control':
      case 'iterator':
        await this.executeFlowControlBehavior(
          behavior,
          userInput,
          iterationContextManager
        );
        break;
      case 'conditional':
        await this.executeConditionalBehavior(
          behavior,
          userInput,
          iterationContextManager
        );
        break;
      default:
        await this.executeStandardBehavior(
          behavior,
          provider,
          userInput,
          iterationContextManager
        );
    }
  }

  private async executeStandardBehavior(
    behavior: Behaviour,
    provider: BaseProvider<any, any>,
    userInput: Record<string, any>,
    iterationContextManager?: ContextManager
  ): Promise<void> {
    const currentContextManager = iterationContextManager || this.contextManager;
    currentContextManager.setCurrentBehaviour(behavior);
    const behaviourId: string | undefined = behavior.getBehaviourId();
    const behaviourRunId: string = uuidv4();

    const interruptManager = currentContextManager.getInterruptManager();

    logger.info(`Executing behaviour: ${behavior.getName()}`);
    LocalTrainRails.emitEvent(LOCALTRAIN_EVENTS.BEHAVIOUR_EXECUTION_START, {
      runId: currentContextManager.getContext().runId,
      behavior: behavior.getName(),
      behaviourId: behaviourId,
      behaviourRunId: behaviourRunId,
      externalData: currentContextManager.getExternalData(),
      timestamp: Date.now(),
      provider: provider.toJSON(),
      inputs: userInput,
    });
    currentContextManager.updateContext({
      behaviourRunId: behaviourRunId,
    });
    const startTime = Date.now();
    try {
    const result = await behavior.execute(
      provider,
      currentContextManager.cloneContext().getContext(),
    );
    const timeTaken = Date.now() - startTime;
    logger.info(`Completed behaviour: ${behavior.getName()} in ${timeTaken}ms`);
    currentContextManager.mergeContext(result.context);
    currentContextManager.updateContext({
      stepResults: {
        ...currentContextManager.getContext().stepResults,
        [behavior.getName()]: {
          output: result.output,
          tokensInput: result.inputTokens || 0,
          tokensOutput: result.outputTokens || 0,
          totalTokens:
            (result.inputTokens || 0) + (result.outputTokens || 0),
          timeTaken: result.timeTaken || 0,
        },
      },
    });

    if(currentContextManager.getContext().isLastExecutionBehaviour) {
      currentContextManager.updateContext({
        result: {
          output: result.output,
          tokensInput: result.inputTokens || 0,
          tokensOutput: result.outputTokens || 0,
          totalTokens:
              (result.inputTokens || 0) + (result.outputTokens || 0),
          timeTaken: result.timeTaken || 0,
        }
      })
    }

    // Check for interrupt
    const interruptSignal = interruptManager.getInterrupt();
    if (interruptSignal) {
      // Handle the interrupt
      await this.handleInterrupt(
        currentContextManager,
        behavior,
        result,
        interruptSignal
      );
      return; // Stop execution
    }

    LocalTrainRails.emitEvent(LOCALTRAIN_EVENTS.BEHAVIOUR_EXECUTION_COMPLETE, {
      runId: currentContextManager.getContext().runId,
      behaviourRunId: currentContextManager.getContext().behaviourRunId,
      behaviourId: currentContextManager.getCurrentBehaviour()?.getBehaviourId(),
      externalData: currentContextManager.getExternalData(),
      behavior: behavior.getName(),
      result,
      timestamp: Date.now(),
      provider: provider.toJSON(),
      inputs: userInput,
    });

  } catch (error: any) {
    console.error(`Error executing behavior ${behavior.getName()}:`, error);
    // Optionally handle error interrupts
    const interruptSignal: InterruptSignal = {
      type: 'ERROR',
      reason: error.message,
    };
    interruptManager.setInterrupt(interruptSignal);
    await this.handleInterrupt(
      currentContextManager,
      behavior,
      {},
      interruptSignal
    );
  }
  }

  private async handleInterrupt(
    contextManager: ContextManager,
    behavior: Behaviour,
    result: any,
    interruptSignal: InterruptSignal
  ): Promise<void> {
    // Update context with interrupt information
    contextManager.updateContext({
      interrupted: true,
      interruptSignal,
      currentBehaviourName: behavior.getName(),
    });

    // Save state
    await contextManager.saveState();

    // Emit event
    LocalTrainRails.emitEvent(LOCALTRAIN_EVENTS.EXECUTION_INTERRUPTED, {
      runId: contextManager.getContext().runId,
      behaviourId: behavior.getBehaviourId(),
      timestamp: Date.now(),
      interruptSignal,
    });

    console.log(`Execution interrupted at behavior: ${behavior.getName()}`);
  }

  private async executeFlowControlBehavior(
    behavior: Behaviour,
    userInput: Record<string, any>,
    iterationContextManager?: ContextManager
  ): Promise<void> {
    const inputs = behavior.getInputs() as LooperProviderInputs;
    const iterations = Number(
      this.contextManager.resolveDynamicVariable(inputs.iterations)
    );
    const maxIterations = Math.min(
      inputs.maxIterations || iterations,
      iterations
    );
    const parallel = Boolean(inputs.parallel); // Extract the parallel flag

    this.contextManager.initializeStepResult(behavior.getName());
    // console.log('context', this.contextManager.getContext());

    // const limit = pLimit.default(5); // Limit to 5 concurrent iterations

    if (parallel) {
      const iterationPromises = [];
      for (let i = 0; i < maxIterations; i++) {
        // iterationPromises.push(
        //   limit(() => this.executeSingleIteration(behavior, userInput, mockRun, i))
        // );
        iterationPromises.push(
          this.executeSingleIteration(behavior, userInput, i)
        );
      }
      await Promise.all(iterationPromises);
    } else {
      // Execute iterations sequentially
      for (let i = 0; i < maxIterations; i++) {
        await this.executeSingleIteration(behavior, userInput, i);
      }
    }

    this.contextManager.clearIterationContext();
  }

  private async executeSingleIteration(
    behavior: Behaviour,
    userInput: Record<string, any>,
    iterationIndex: number
  ): Promise<void> {
    try {
      // console.log(`Starting iteration ${iterationIndex}`);

      // Clone the main context for this iteration to prevent conflicts
      const iterationContextManager = this.contextManager.cloneContext();
      iterationContextManager.setIterationContext(
        behavior.getName(),
        iterationIndex
      );

      const nestedExecutor = new BehaviorExecutor(
        this.providerRegistry,
        iterationContextManager
      );
      const nestedBehaviors = behavior.getNestedBehaviors();

      const iterationResult: Record<string, any> = {};

      if (nestedBehaviors && nestedBehaviors.length > 0) {
        for (const nestedBehavior of nestedBehaviors) {
          // console.log(
          //   `Executing nested behavior: ${nestedBehavior.getName()} in iteration ${iterationIndex}`
          // );
          await nestedExecutor.executeBehavior(
            nestedBehavior,
            userInput,
            iterationContextManager // Pass the iteration-specific context
          );

          // Collect nested behavior results from the iteration-specific context
          const nestedResult =
            iterationContextManager.getContext().stepResults[
              nestedBehavior.getName()
            ];
          iterationResult[nestedBehavior.getName()] = nestedResult;
        }
      }

      // Merge the iteration results into the main context
      this.contextManager.addIterationResult(
        behavior.getName(),
        iterationIndex,
        iterationResult
      );

      // console.log(
      //   `Completed iteration ${iterationIndex} with results:`,
      //   iterationResult
      // );
    } catch (error: any) {
      console.error(`Error in iteration ${iterationIndex}:`, error);
      // Optionally, store the error in the stepResults
      this.contextManager.addIterationResult(
        behavior.getName(),
        iterationIndex,
        {
          error: error.message as string,
        }
      );
    }
  }

  private async executeConditionalBehavior(
    behavior: Behaviour,
    userInput: Record<string, any>,
    iterationContextManager?: ContextManager
  ): Promise<void> {
    const condition = this.contextManager.resolveDynamicVariable(
      behavior.getInputs()['condition']
    );
    if (condition) {
      const nestedBehaviors = behavior.getNestedBehaviors();
      if (nestedBehaviors && nestedBehaviors.length > 0) {
        for (const nestedBehavior of nestedBehaviors) {
          await this.executeBehavior(
            nestedBehavior,
            userInput,
            iterationContextManager
          );
        }
      }
    }
  }
}
