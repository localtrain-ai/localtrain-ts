import { IToolCallParams } from '../types';
import { ITool } from '../types/tool-types';

export abstract class BaseTool implements ITool {
  parameters!: IToolCallParams;
  name!: string;
  description!: string;
  category!: string;
  providerName!: string;
  executor!: (args: Record<string, any>) => Promise<any>;

  constructor(tool?: ITool | BaseTool) {
    if(tool) {
      this.name = tool.name;
      this.description = tool.description;
      this.category = tool.category;
      this.providerName = tool.providerName;
    }
  }

  getToolCall<T>(): T {
    return {
      name: this.name,
      description: this.description,
      parameters: this.parameters,
    } as T;
  }
}
