import { IToolHandler, IToolSelector, IToolExecutor, IToolResult, ITool } from '../types/tool-types';
import { LLMStateManager } from '../managers/LLMStateManager';

export abstract class BaseLLMToolHandler implements IToolHandler {
  protected stateManager: LLMStateManager;
  protected useExperimentalToolSelection = false;

  protected constructor(stateManager: LLMStateManager, options?: {useExperimentalToolSelection?: boolean}) {
    this.stateManager = stateManager;
    this.useExperimentalToolSelection = !!options?.useExperimentalToolSelection;
  }

  abstract selector: IToolSelector;
  abstract executor: IToolExecutor;
  abstract handleToolCalls(completion: any, tools: ITool[]): Promise<IToolResult[]>;
}
