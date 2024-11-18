import { IBaseSupportedInputs, LLMProvider } from '@localtrain.ai/core';
import {
  LLMStepInputDto,
  ContextDTO,
  LLMStepOutputBaseDTO,
} from '@localtrain.ai/core';
import { HfInference } from '@huggingface/inference';

export class HuggingFace extends LLMProvider {
  hf: HfInference;
  key = 'huggingface';
  description = '';
  category = 'llm';
  supportedInputs: IBaseSupportedInputs[] = [
    {
      type: "textarea",
      label: "PROMPT",
      name: "prompt",
      description: "Input Prompt"
    }
  ];

  constructor(token: string) {
    super();
    this.hf = new HfInference(token);
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
    let model = inputDto.inputs.model;
    if (!model) {
      model = 'meta-llama/Llama-3.1-8B-Instruct';
      console.log(`No model specified. Using ${model} as default.`);
    }

    const payload = {
      ...inputDto.inputs,
    };

    // Track time for execution metrics
    const startTime = Date.now();


    // Execute the API call to OpenAI
    const response = await this.hf.chatCompletion({ model, messages: payload, max_tokens: 1000 });
    const timeTaken = Date.now() - startTime;

    // Extract the response content and return in the standardized format
    return {
      output: response.choices[0].message.content,
      timeTaken,
      tokensConsumed: response.usage.total_tokens,
      inputTokens: response.usage.prompt_tokens,
      outputTokens: response.usage.completion_tokens,
    } as LLMStepOutputBaseDTO<string>;
  }
}
