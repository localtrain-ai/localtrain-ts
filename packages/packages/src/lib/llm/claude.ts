import { IBaseSupportedInputs, LLMProvider } from '@localtrain.ai/core';
import {
  LLMStepInputDto,
  ContextDTO,
  LLMStepOutputBaseDTO,
} from '@localtrain.ai/core';
import  { Anthropic, ClientOptions } from '@anthropic-ai/sdk';
import { Message, TextBlock } from '@anthropic-ai/sdk/src/resources/messages';
import { MessageParam } from '@anthropic-ai/sdk/resources/messages';

export class Claude extends LLMProvider {
  claude: Anthropic;
  key = 'claude';
  description = "";
  category = "llm";
  supportedInputs: IBaseSupportedInputs[] = [
    {
      type: "textarea",
      label: "PROMPT",
      name: "prompt",
      description: "Input Prompt"
    }
  ];

  constructor(options: ClientOptions) {
    super();
    this.claude = new Anthropic(options);
  }

  private generateSystemMessages(prompt: string): MessageParam[] {
    return [{ role: 'assistant', content: prompt } as MessageParam];
  }

  private validateInput(inputDto: LLMStepInputDto): void {
    if (!inputDto.inputs.prompt) {
      throw new Error('Prompt is required in input DTO');
    }
  }

  async execute(
    inputDto: LLMStepInputDto,
    context: ContextDTO
  ): Promise<LLMStepOutputBaseDTO<string>> {
    this.validateInput(inputDto); // Ensure input validity

    // Define the request payload with model, prompt, and any additional instructions
    const messages = this.generateSystemMessages(inputDto.inputs.prompt);
    let model = inputDto.inputs.model;
    if(!model) {
      model = "claude-3-5-sonnet-latest";
      console.log(`No model specified. Using ${model} as default.`);
    }
    const payload = {
      messages,
      model,
      // ...inputDto,
    };

    // Track time for execution metrics
    const startTime = Date.now();

    console.log('payload', payload);

    // Execute the API call to OpenAI
    const message: Message = await this.claude.messages.create({
      ...payload,
      max_tokens: 1024
    });


    const timeTaken = Date.now() - startTime;

    // Extract the response content and return in the standardized format
    return {
      output: (message.content[0] as TextBlock).text,
      timeTaken,
      tokensConsumed: message.usage.input_tokens + message.usage.output_tokens,
      inputTokens: message.usage.input_tokens,
      outputTokens: message.usage.output_tokens,
    } as LLMStepOutputBaseDTO<string>;
  }
}
