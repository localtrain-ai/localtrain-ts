import {
  BaseLLMToolHandler,
  IToolSelector,
  IToolExecutor,
  IToolResult,
  ITool,
  LLMStateManager,
  IToolCall,
} from '@localtrain.ai/core';
import {
  ChatCompletionMessageToolCall,
  ChatCompletionTool,
} from 'openai/resources';
import { LLMStepInputDto } from '@localtrain.ai/core';
import { BaseTool } from '@localtrain.ai/core';
import OpenAI from 'openai';
import { ChatCompletion } from 'openai/src/resources/chat/completions';

export class OpenAIToolHandler extends BaseLLMToolHandler {
  constructor(private openAI: OpenAI, stateManager: LLMStateManager) {
    super(stateManager, { useExperimentalToolSelection: false });
  }

  async selectToolCategory(
    inputDto: LLMStepInputDto
  ): Promise<ChatCompletionMessageToolCall[] | null> {
    const uniqueCategories = Array.from(
      new Set(inputDto.inputs.tools?.map((tool) => tool.category))
    );
    const uniqueProviders = Array.from(
      new Set(inputDto.inputs.tools?.map((tool) => tool.providerName))
    );

    const result = await this.openAI.chat.completions.create({
      model: inputDto.inputs.model || 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content:
            'Identify the tool categories/providers required based on the prompt.',
        },
        { role: 'user', content: inputDto.inputs.prompt as string },
      ],
      tools: [
        this.createToolCategorySelector(uniqueCategories, uniqueProviders),
      ],
    });

    const usage = result.usage || { total_tokens: 0 };
    this.stateManager.trackMetrics(
      usage.total_tokens,
      Date.now() - this.stateManager.startTime
    );
    this.stateManager.recordToolCall(
      'selectToolCategory',
      inputDto,
      result.choices[0]?.message?.tool_calls
    );

    return result.choices[0]?.message?.tool_calls || null;
  }

  async filterToolsByCategoryAndProvider(
    toolCalls: ChatCompletionMessageToolCall[],
    tools: ITool[]
  ): Promise<ChatCompletionTool[]> {
    const selectedTools = toolCalls
      .map((toolCall) => {
        const args = JSON.parse(toolCall.function.arguments);
        const toolCategory = args?.tool_category;
        const providerName = args?.provider_name;

        return tools.find(
          (tool) =>
            tool.category === toolCategory && tool.providerName === providerName
        );
      })
      .filter((tool) => tool !== undefined) as ITool[];

    this.stateManager.recordTransformation(
      'filterToolsByCategoryAndProvider',
      toolCalls,
      selectedTools
    );

    return selectedTools.map(
      (tool) =>
        ({
          function: (tool as BaseTool).getToolCall(),
          type: 'function',
        } as ChatCompletionTool)
    );
  }

  async handleToolCalls(
    completion: ChatCompletion,
    tools: ITool[]
  ): Promise<IToolResult[]> {
    if (!completion.choices?.[0]?.message?.tool_calls) {
      return [];
    }

    return Promise.all(
      completion.choices[0].message.tool_calls.map(async (toolCall) => {
        const matchedTool = tools.find(
          (tool) => tool.name === toolCall.function.name
        );
        if (!matchedTool) {
          return { toolId: toolCall.id, result: 'Invalid tool call' };
        }

        try {
          console.log('--------- \n\nInput to tool', toolCall.function.name,  toolCall.function.arguments);
          const result = await (matchedTool as BaseTool).executor(
            JSON.parse(toolCall.function.arguments)
          );
          console.log('\n---------\nOutput from tool', result, '-----------\n\n\n');
          this.stateManager.recordToolCall(
            matchedTool.name,
            toolCall.function.arguments,
            result
          );
          return { toolId: toolCall.id, result };
        } catch (e: any) {
          console.log('\n---------\nError from tool', e.message,'-----------\n\n\n');
          const error = new Error(`Tool call error: ${e.message}`);
          this.stateManager.recordError(error);
          return {
            toolId: toolCall.id,
            result: `Error: ${e.message}`,
            error: e.message,
          };
        }
      })
    );
  }

  private createToolCategorySelector(
    categories: string[],
    providers: string[]
  ): ChatCompletionTool {
    return {
      type: 'function',
      function: {
        name: 'get_tools_category',
        description: 'Gets the correct tool category based on intents',
        parameters: {
          type: 'object',
          properties: {
            tool_category: {
              type: 'string',
              enum: categories,
            },
            provider_name: {
              type: 'string',
              enum: providers,
            },
          },
          required: ['tool_category'],
        },
      },
    };
  }

  executor: IToolExecutor = {
    executeTools: async (
      toolCalls: IToolCall[],
      tools: ITool[]
    ): Promise<IToolResult[]> => {
      return Promise.all(
        toolCalls.map(async (toolCall) => {
          const matchedTool = tools.find((tool) => tool.name === toolCall.name);
          if (!matchedTool) {
            return { toolId: toolCall.id, result: 'Invalid tool call' };
          }

          try {
            const result = await (matchedTool as BaseTool).executor(
              JSON.parse(toolCall.arguments)
            );
            this.stateManager.recordToolCall(
              matchedTool.name,
              toolCall.arguments,
              result
            );
            return { toolId: toolCall.id, result };
          } catch (e: any) {
            const error = new Error(`Tool call error: ${e.message}`);
            this.stateManager.recordError(error);
            return {
              toolId: toolCall.id,
              result: `Error: ${e.message}`,
              error: e.message,
            };
          }
        })
      );
    },
  };

  selector: IToolSelector = {
    selectTools: async (
      prompt: string,
      tools: ITool[]
    ): Promise<IToolCall[]> => {
      const uniqueCategories = Array.from(
        new Set(tools.map((tool) => tool.category))
      );
      const uniqueProviders = Array.from(
        new Set(tools.map((tool) => tool.providerName))
      );

      const result = await this.openAI.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content:
              'Identify the tool categories/providers required based on the prompt.',
          },
          { role: 'user', content: prompt },
        ],
        tools: [
          this.createToolCategorySelector(uniqueCategories, uniqueProviders),
        ],
      });

      this.stateManager.recordToolCall(
        'selectToolCategory',
        { prompt },
        result.choices[0]?.message?.tool_calls
      );

      const toolCalls: IToolCall[] = (
        result.choices[0]?.message?.tool_calls || []
      ).map((call) => {
        const updatedToolCall = {
          name: call.function.name,
          type: 'function',
          arguments: call.function.arguments,
          id: call.id,
        } as IToolCall;
        return updatedToolCall;
      });
      return toolCalls as IToolCall[];
    },
  };
}
