import { Openai } from './Openai';
import { ClientOptions } from 'openai';
import {
  LLMStepInputDto,
  ContextDTO,
  LLMStepOutputBaseDTO,
  LLMProviderInputs,
} from '@localtrain.ai/core';
import { BaseTool, ContextManager } from '@localtrain.ai/core';
import { ChatCompletion } from 'openai/src/resources/chat/completions';
import {
  ChatCompletionMessageToolCall,
  ChatCompletionTool,
} from 'openai/resources';

jest.mock('openai');

describe('Openai Class Tests', () => {
  let openai: Openai;
  const options: ClientOptions = { apiKey: 'test-api-key' };

  beforeEach(() => {
    openai = new Openai(options);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(openai).toBeDefined();
  });

  describe('validateInput', () => {
    it('should throw an error if prompt is missing', () => {
      const inputDto = { inputs: {} } as LLMStepInputDto;
      expect(() => openai['validateInput'](inputDto)).toThrow(
        'Prompt is required in input DTO'
      );
    });

    it('should not throw if prompt is provided', () => {
      const inputDto = { inputs: { prompt: 'test prompt' } } as LLMStepInputDto;
      expect(() => openai['validateInput'](inputDto)).not.toThrow();
    });
  });
  //
  describe('selectToolCategory', () => {
    it('should log token usage and return tool calls', async () => {
      const mockResponse = {
        id: '',
        created: 9993,
        object: 'chat.completion',
        model: '',
        usage: { total_tokens: 100 },
        choices: [
          {
            logprobs: null,
            finish_reason: 'tool_calls',
            index: 0,
            message: {
              role: 'assistant',
              content: null,
              refusal: null,
              tool_calls: [
                {
                  id: 'tool1',
                  function: {
                    name: 'get_tools_category',
                    arguments: '{}',
                  },
                  type: 'function',
                },
              ] as ChatCompletionMessageToolCall[],
            },
          },
        ] as ChatCompletion.Choice[],
      } as ChatCompletion;

      jest
        .spyOn(openai['openAI'].chat.completions, 'create')
        .mockResolvedValue(mockResponse);
      const inputDto = {
        inputs: {
          prompt: 'test prompt',
          tools: [{ category: 'test', providerName: 'provider1' }],
        },
      } as LLMStepInputDto;

      const toolCalls = await openai['selectToolCategory'](inputDto);

      expect(toolCalls).toEqual(mockResponse.choices[0].message?.tool_calls);
      expect(Openai['totalTokenUsageLog']).toContain(
        '[selectToolCategory] Token usage: 100'
      );
    });
  });

  describe('filterToolsByCategoryAndProvider', () => {
    it('should filter tools based on category and provider', async () => {
      const toolCalls = [
        {
          id: 'tool1',
          function: {
            arguments: '{"tool_category":"test","provider_name":"provider1"}',
          },
        },
      ] as ChatCompletionMessageToolCall[];
      const tools = [
        {
          name: 'Tool1',
          category: 'test',
          providerName: 'provider1',
          getToolCall: jest.fn(),
        },
        {
          name: 'Tool2',
          category: 'test2',
          providerName: 'provider2',
          getToolCall: jest.fn(),
        },
      ] as unknown as BaseTool[];

      const selectedTools = await openai['filterToolsByCategoryAndProvider'](
        toolCalls,
        tools
      );

      expect(selectedTools.length).toBe(1);
      expect(selectedTools[0].function).toBe(tools[0].getToolCall());
    });
  });

  describe('createPayload', () => {
    it('should create a payload with the default model if no model is provided', async () => {
      const inputDto = {
        inputs: { prompt: 'test prompt' } as LLMProviderInputs,
        messages: [],
      } as LLMStepInputDto;

      const payload = await openai['createPayload'](inputDto);

      expect(payload.model).toBe('gpt-4o-mini');
      expect(payload.messages[0].content).toBe('test prompt');
    });

    it('should use provided model if specified in inputs', async () => {
      const inputDto = {
        inputs: {
          prompt: 'test prompt',
          model: 'gpt-3.5-turbo',
        } as LLMProviderInputs,
        messages: [],
      } as LLMStepInputDto;

      const payload = await openai['createPayload'](inputDto);

      expect(payload.model).toBe('gpt-3.5-turbo');
    });

    it('should add tools to payload if tools are provided without selection phase', async () => {
      const inputDto = {
        inputs: {
          inputType: "string",
          prompt: 'test prompt',
          tools: [{ getToolCall: jest.fn() }],
        } as LLMProviderInputs,
        messages: [],
      } as LLMStepInputDto;

      openai['useExperimentalToolSelection'] = false;
      const payload = await openai['createPayload'](inputDto);

      expect(payload.tools).toHaveLength(1);
      expect(payload.tools![0].type).toBe('function');
    });

    it('should filter tools during the selection phase if experimental tool selection is enabled', async () => {
      const inputDto = {
        inputs: {
          prompt: 'test prompt',
          tools: [{ category: 'test', providerName: 'provider1' }],
        },
      } as LLMStepInputDto;

      openai['useExperimentalToolSelection'] = true;
      openai['isSelectionPhase'] = true;

      jest
        // @ts-ignore
        .spyOn(openai, 'selectToolCategory')
        .mockResolvedValue([
          {
            id: 'tool1',
            function: {
              arguments: '{"tool_category":"test","provider_name":"provider1"}',
            },
          },
        ] as ChatCompletionMessageToolCall[]);

      jest
        // @ts-ignore
        .spyOn(openai, 'filterToolsByCategoryAndProvider')
        .mockResolvedValue([
          { function: { name: 'filtered_tool' } },
        ] as ChatCompletionTool[]);

      const payload = await openai['createPayload'](inputDto);

      expect(payload.tools).toHaveLength(1);
      expect(payload.tools![0].function.name).toBe('filtered_tool');
      expect(openai['isSelectionPhase']).toBe(false); // should exit selection phase
    });

    it('should add json_schema to payload if provided', async () => {
      const inputDto = {
        inputs: {
          inputType: 'string',
          prompt: 'test prompt',
          json_schema: { type: 'json_schema', json_schema: { field: 'value' } },
        } as LLMProviderInputs,
        messages: [],
      } as LLMStepInputDto;

      const payload = await openai['createPayload'](inputDto);

      // @ts-ignore
      expect(payload.response_format?.json_schema).toEqual({ field: 'value' });
    });

    it('should default to json_schema type if no type is provided in json_schema input', async () => {
      const inputDto = {
        inputs: {
          inputType: 'string',
          prompt: 'test prompt',
          json_schema: { json_schema: { field: 'value' } },
        } as LLMProviderInputs,
        messages: [],
      } as LLMStepInputDto;

      const payload = await openai['createPayload'](inputDto);

      expect(payload.response_format?.type).toBe('json_schema');
      // @ts-ignore
      expect(payload.response_format?.json_schema).toEqual({ field: 'value' });
    });

    it('should set payload stream property based on input stream value', async () => {
      const inputDtoWithStream = {
        inputs: { prompt: 'test prompt', stream: true } as LLMProviderInputs,
        messages: [],
      } as LLMStepInputDto;

      const payloadWithStream = await openai['createPayload'](
        inputDtoWithStream
      );
      expect(payloadWithStream.stream).toBe(true);

      const inputDtoWithoutStream = {
        inputs: { prompt: 'test prompt', stream: false } as LLMProviderInputs,
        messages: [],
      } as LLMStepInputDto;

      const payloadWithoutStream = await openai['createPayload'](
        inputDtoWithoutStream
      );
      expect(payloadWithoutStream.stream).toBe(false);
    });

    it('should set payload temperature based on input temperature, defaulting to 0.7 if not provided', async () => {
      const inputDtoWithTemperature = {
        inputs: {
          prompt: 'test prompt',
          temperature: 0.9,
        } as LLMProviderInputs,
        messages: [],
      } as LLMStepInputDto;

      const payloadWithTemperature = await openai['createPayload'](
        inputDtoWithTemperature
      );
      expect(payloadWithTemperature.temperature).toBe(0.9);

      const inputDtoWithoutTemperature = {
        inputs: { prompt: 'test prompt' } as LLMProviderInputs,
        messages: [],
      } as LLMStepInputDto;

      const payloadWithoutTemperature = await openai['createPayload'](
        inputDtoWithoutTemperature
      );
      expect(payloadWithoutTemperature.temperature).toBe(0.7);
    });
  });

  describe('executeToolCalls', () => {
    it('should execute tool calls and return results', async () => {
      const tools = [
        {
          name: 'tool1',
          executor: jest.fn().mockResolvedValue('Result for tool1'),
        },
      ] as unknown as BaseTool[];

      const toolCalls = [
        {
          id: 'tool1',
          function: { name: 'tool1', arguments: '{}' },
          type: 'function',
        },
      ] as ChatCompletionMessageToolCall[];
      const results = await openai['executeToolCalls'](toolCalls, tools);

      expect(results[0].result).toBe('Result for tool1');
    });

    it('should return an error message if tool call is invalid', async () => {
      const toolCalls = [
        { id: 'tool1', function: { name: 'invalid_tool', arguments: '{}' } },
      ] as ChatCompletionMessageToolCall[];
      const tools = [] as unknown as BaseTool[];

      const results = await openai['executeToolCalls'](toolCalls, tools);

      expect(results[0].result).toBe('Invalid tool call');
    });
  });

  describe('getFinalOutput', () => {
    it('should return output with token usage and time taken', () => {
      const contextManager = new ContextManager({} as ContextDTO);
      const result = {
        choices: [{ message: { content: 'Output content' } }],
        usage: { total_tokens: 50, prompt_tokens: 30, completion_tokens: 20 },
      } as ChatCompletion;

      const output = openai['getFinalOutput'](result, 100, contextManager);

      expect(output.output).toBe('Output content');
      expect(output.tokensConsumed).toBe(50);
      expect(output.inputTokens).toBe(30);
      expect(output.outputTokens).toBe(20);
    });
  });

  describe('execute', () => {
    it('should validate input, create payload, and handle tool calls', async () => {
      const inputDto = { inputs: { prompt: 'test prompt' } } as LLMStepInputDto;
      const context = {} as ContextDTO;

      const mockResponse = {
        choices: [{ message: { content: 'test content' } }],
        usage: { total_tokens: 100 },
      } as ChatCompletion;

      // @ts-ignore
      jest.spyOn(openai, 'executeOpenAICall').mockResolvedValue({
        contextManager: new ContextManager(context),
        chatCompletion: mockResponse,
      });
      // @ts-ignore
      jest.spyOn(openai, 'handleToolCalls').mockResolvedValue({
        output: 'test content',
        tokensConsumed: 100,
        inputTokens: 50,
        outputTokens: 50,
      } as LLMStepOutputBaseDTO<string>);

      const result = await openai.execute(inputDto, context);

      expect(result.output).toBe('test content');
      expect(result.tokensConsumed).toBe(100);
    });
  });
});
