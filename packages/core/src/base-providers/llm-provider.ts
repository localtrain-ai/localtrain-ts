import { BaseProvider } from './base-provider';
import {
  ContextDTO,
  LLMStepInputDto, LLMStepOutputBaseDTO, ProviderType
} from '../types';
import { LLMStateManager } from '../managers/LLMStateManager';

export abstract class LLMProvider extends BaseProvider<
  LLMStepInputDto,
  LLMStepOutputBaseDTO<string>
> {
  protected stateManager: LLMStateManager;
  private _systemInstructions: string[] = [];
  private _stream = false;
  private _messages: {
    role: 'system' | 'user' | 'assistant';
    content?: unknown;
  }[] = [];

  protected constructor() {
    super();
    this.stateManager = new LLMStateManager();
  }

  override providerType: ProviderType = "llm";

  addSystemInstructions(instructions: string | string[]) {
    if (!instructions) {
      return;
    }
    if (typeof instructions === 'string') {
      this._systemInstructions = this._systemInstructions.concat([
        instructions,
      ]);
    } else {
      this._systemInstructions = this._systemInstructions.concat(instructions);
    }
  }

  addPreviousMessages(
    messages: [{ role: 'system' | 'user' | 'assistant'; content?: unknown }]
  ) {
    this._messages = this._messages.concat(messages);
  }


  abstract override execute(
    inputDto: LLMStepInputDto,
    context: ContextDTO
  ): Promise<LLMStepOutputBaseDTO<string>>;
}
