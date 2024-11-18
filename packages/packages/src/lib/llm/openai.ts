import {
  BasePromptTemplateProvider,
  BaseTool,
  ContextManager,
  IBaseSupportedInputs, InterruptSignal,
  LLMProvider, LOCALTRAIN_EVENTS, LocalTrainRails
} from '@localtrain.ai/core';
import {
  LLMStepInputDto,
  ContextDTO,
  LLMStepOutputBaseDTO,
  ITool,
} from '@localtrain.ai/core';
import OpenAI, { ClientOptions } from 'openai';
import {
  ChatCompletion,
  ChatCompletionCreateParamsBase,
  ChatCompletionMessageParam,
  ChatCompletionTool,
} from 'openai/src/resources/chat/completions';
import {
  Chat,
  ChatCompletionMessageToolCall,
  FunctionDefinition,
} from 'openai/resources';
import { logger } from '@localtrain.ai/core';
import { BaseOpenai } from './base-openai'; // Import the configured logger
import { EventEmitter } from 'events';
import { OpenAIToolHandler } from './openai-tool-handler';

export class Openai extends LLMProvider {
  private openAI: OpenAI;
  private toolHandler: OpenAIToolHandler;
  private useExperimentalToolSelection = false;

  key = 'open-ai';
  description = '';
  category = 'llm';
  supportedInputs: IBaseSupportedInputs[] = [
    {
      type: 'textarea',
      label: 'PROMPT',
      name: 'prompt',
      description: 'Input Prompt',
    },
  ];

  constructor(options: ClientOptions) {
    super();
    this.openAI = new OpenAI(options);
    this.toolHandler = new OpenAIToolHandler(
      this.openAI,
      this.stateManager
    );
    this.stateManager.recordInput({ options });
  }

  private generateSystemMessages(
    prompt: string | BasePromptTemplateProvider<any, any>
  ): {
    role: 'system';
    content: string;
  }[] {
    if (typeof prompt === 'string') {
      return [{ role: 'system', content: prompt }];
    } else {
      const messages = (
        prompt as BasePromptTemplateProvider<any, any>
      ).render();
      this.stateManager.recordTransformation('generateSystemMessages', prompt, messages);
      return messages;
    }
  }

  private validateInput(inputDto: LLMStepInputDto): void {
    if (!inputDto.inputs.prompt) {
      const error = new Error('Prompt is required in input DTO');
      this.stateManager.recordError(error);
      throw error;
    }
    this.stateManager.recordInput(inputDto);
  }

  private async createPayload(
    inputDto: LLMStepInputDto
  ): Promise<ChatCompletionCreateParamsBase> {
    const messages: ChatCompletionMessageParam[] =
      inputDto.messages ||
      (this.generateSystemMessages(inputDto.inputs.prompt as string) as any);
    const model = inputDto.inputs.model || 'gpt-4o-mini';
    // console.log('Selected model as ', model, inputDto.inputs);
    const payload: ChatCompletionCreateParamsBase = { messages, model };

    if (inputDto.inputs.tools) {
      if (this.useExperimentalToolSelection) {
        const toolCalls = await this.toolHandler.selectToolCategory(inputDto);
        if (toolCalls) {
          const filteredTools = await this.toolHandler.filterToolsByCategoryAndProvider(
            toolCalls,
            inputDto.inputs.tools
          );
          payload.tools = filteredTools;
          this.useExperimentalToolSelection = false;
        }
      } else {
        payload.tools = inputDto.inputs.tools.map((tool) => ({
          function: (tool as BaseTool).getToolCall(),
          type: 'function',
        }));
      }
    }

    if (inputDto.inputs.json_schema) {
      payload.response_format = {
        type: 'json_schema',
        json_schema: inputDto.inputs.json_schema['json_schema'] || inputDto.inputs.json_schema,
      };
    }

    payload.stream = !!inputDto.inputs.stream;
    payload.temperature = Number(inputDto.inputs.temperature || 0.7);

    this.stateManager.recordTransformation('createPayload', inputDto, payload);
    return payload;
  }

  private async handleToolCalls(
    completion: ChatCompletion,
    inputDto: LLMStepInputDto,
    contextManager: ContextManager
  ): Promise<LLMStepOutputBaseDTO<string>> {
    const context = contextManager.getContext();
    const currentContextManager = contextManager;

    if (
      completion?.choices?.[0]?.finish_reason === 'tool_calls' &&
      completion.choices[0].message?.tool_calls
    ) {
      const usage = completion.usage || { total_tokens: 0 };
      this.stateManager.trackMetrics(usage.total_tokens, Date.now() - this.stateManager.startTime);

      const toolResults = await this.toolHandler.handleToolCalls(
        completion,
        inputDto.inputs.tools!
      );

      const toolMessages = toolResults.map((toolResult) => ({
        role: 'tool',
        content: JSON.stringify(toolResult.result),
        tool_call_id: toolResult.toolId,
      }));

      inputDto.messages = [
        ...(inputDto.messages || []),
        completion.choices[0].message,
        ...toolMessages,
      ] as any;

      const { contextManager: newContextManager, chatCompletion } = await this.executeOpenAICall(
        inputDto,
        context
      );
      currentContextManager.mergeContext(newContextManager.getContext());
      completion = chatCompletion;
    }

    return this.getFinalOutput(
      completion,
      Date.now() - (context.startTime || 0),
      currentContextManager
    );
  }

  private detectInterruptInOutput(output: string): boolean {
    const interruptDetected = output.includes('[INTERRUPT]');
    this.stateManager.recordEvent('detectInterruptInOutput', { output, interruptDetected });
    // Define your logic to detect if the LLM is requesting an interrupt
    // For example, check for specific phrases or markers
    return interruptDetected
  }

  private getFinalOutput(
    chatCompletion: ChatCompletion,
    timeTaken: number,
    contextManager: ContextManager
  ): LLMStepOutputBaseDTO<string> {
    const context = contextManager.getContext();
    const usage = chatCompletion.usage || {
      total_tokens: 0,
      prompt_tokens: 0,
      completion_tokens: 0,
    };

    // Record token usage and time metrics
    this.stateManager.trackMetrics(usage.total_tokens, timeTaken);
    this.stateManager.recordEvent('getFinalOutput', { usage, timeTaken });

    const outputContent = chatCompletion.choices[0]?.message?.content || '';

    // Check for interrupt
    const interruptDetected = this.detectInterruptInOutput(outputContent);

    if (interruptDetected) {
      const interruptSignal: InterruptSignal = {
        type: 'HUMAN_INPUT_REQUIRED',
        reason: 'LLM requested human input',
      };
      const interruptManager = contextManager.getInterruptManager();
      interruptManager.setInterrupt(interruptSignal);
      context.interruptSignal = interruptSignal;
      contextManager.updateContext(context);

      this.stateManager.recordEvent('InterruptSignalSet', { interruptSignal });
    }

    context.totalTokens = (context.totalTokens || 0) + usage.total_tokens;
    context.inputTokens = (context.inputTokens || 0) + usage.prompt_tokens;
    context.outputTokens =
      (context.outputTokens || 0) + usage.completion_tokens;

    const finalOutput = {
      output: outputContent || 'No content available',
      timeTaken,
      tokensConsumed: context.totalTokens,
      inputTokens: context.inputTokens,
      outputTokens: context.outputTokens,
      context,
    };

    this.stateManager.recordOutput(finalOutput);
    return finalOutput;
  }

  async execute(
    inputDto: LLMStepInputDto,
    context: ContextDTO
  ): Promise<LLMStepOutputBaseDTO<string>> {
    this.stateManager.recordInput(inputDto);

    const { contextManager, chatCompletion } = await this.executeOpenAICall(inputDto, context);

    this.stateManager.recordEvent('executeOpenAICallComplete', { chatCompletion });

    const finalResult = await this.handleToolCalls(
      chatCompletion,
      inputDto,
      contextManager
    );

   this.stateManager.recordOutput(finalResult);
   this.stateManager.finalizeSession(context);  // Finalize session and write state to context

    return finalResult;
  }

  private async executeOpenAICall(inputDto: LLMStepInputDto, context: ContextDTO) {
    this.validateInput(inputDto);
    const contextManager = new ContextManager(context);
    const currentContext = contextManager.getContext();

    currentContext.startTime = currentContext.startTime || Date.now();
    contextManager.updateContext(currentContext);

    const payload = await this.createPayload(inputDto);
    // console.log("Payload:", payload)
    // const result: ChatCompletion = (await this.openAI.chat.completions.create(
    //   payload,
    // )) as ChatCompletion;

    const baseOpenAI = new BaseOpenai({
      apiKey: process.env['OPENAI_API_KEY']!,
    });

    const instance = baseOpenAI as BaseOpenai;
    let result: ChatCompletion;
    if (payload.stream) {
      result = await (instance.generateText(payload) as BaseOpenai).stream(
        (chunk) => {
          LocalTrainRails.emitEvent(LOCALTRAIN_EVENTS.LLM_STREAM, chunk);
        }
      );
    } else {
      result = (await instance.generateText(payload)) as ChatCompletion;
    }

    this.stateManager.recordToolCall("executeOpenAICall", inputDto, result);
    if (result.choices[0].message.tool_calls?.length) {
      // console.log("Additional tool calls detected, invoking handleToolCalls recursively");

      // Recursively call handleToolCalls and update result if there are more tool calls to handle
      const updatedResult = await this.handleToolCalls(result, inputDto, contextManager);

      const fakeCompletion: ChatCompletion = {
        id: "",
        choices: [{
          message: {
            content: updatedResult.output,
            role: "assistant",
          },
          finish_reason: "stop",
          index: 0,
        }]
      } as ChatCompletion

      return { contextManager, chatCompletion: fakeCompletion };
    }

    return { contextManager, chatCompletion: result };
  }
}
