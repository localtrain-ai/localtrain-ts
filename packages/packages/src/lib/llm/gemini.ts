import { IBaseSupportedInputs, LLMProvider } from '@localtrain.ai/core';
import {
  LLMStepInputDto,
  ContextDTO,
  LLMStepOutputBaseDTO,
} from '@localtrain.ai/core';
import { GoogleGenerativeAI } from '@google/generative-ai';

export class Gemini extends LLMProvider {
  private genAI: GoogleGenerativeAI;
  key = 'gemini';
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

  constructor(apiKey: string) {
    super();
    this.genAI = new GoogleGenerativeAI(apiKey);
  }

  private generateSystemMessages(prompt: string): any {
    return [{ role: 'user', content: prompt }];
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
    this.validateInput(inputDto);

    const messages = this.generateSystemMessages(inputDto.inputs.prompt);
    const model = inputDto.inputs.model || 'gemini-1.5-flash';

    const payload = {
      contents: messages,
      generationConfig: {
        maxOutputTokens: 1024,
        temperature: 1.0,
      },
    };

    const result = await this.genAI
      .getGenerativeModel({ model })
      .generateContent(inputDto.inputs.prompt);

    return {
      output: result.response.text(),
      timeTaken: 0, // You may implement time tracking if needed
      tokensConsumed: 0, // Adjust based on response structure
      inputTokens: 0,
      outputTokens: 0,
    } as LLMStepOutputBaseDTO<string>;
  }
}
