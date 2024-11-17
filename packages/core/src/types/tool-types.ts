import { IToolCallParams } from '../types';

export interface ITool {
  description: string;
  name: string;
  providerName: string;
  category: string;
  parameters: IToolCallParams;
}

export interface IToolCall {
  id: string;
  name: string;
  arguments: string;
  type: 'function';
}

export interface IToolResult {
  toolId: string;
  result: any;
  error?: string;
}

export interface IToolSelector {
  selectTools(prompt: string, availableTools: ITool[]): Promise<IToolCall[]>;
}

export interface IToolExecutor {
  executeTools(toolCalls: IToolCall[], tools: ITool[]): Promise<IToolResult[]>;
}

export interface IToolHandler {
  selector: IToolSelector;
  executor: IToolExecutor;

  handleToolCalls(completion: any, tools: ITool[]): Promise<IToolResult[]>;
}
