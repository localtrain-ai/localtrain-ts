import { BaseTool } from './base-tool';
import { IToolCallParams } from '../types';

export class Tool extends BaseTool {
  setName(name: string) {
    this.name = name;
    return this;
  }

  setDescription(description: string) {
    this.description = description;
    return this;

  }

  setParameters(parameters: IToolCallParams) {
    this.parameters = parameters;
    return this;
  }

  setCategory(category: string) {
    this.category = category;
    return this;
  }

  setProviderName(providerName: string) {
    this.providerName = providerName;
    return this;
  }

  setExecutor(executor: (args: Record<string, any>) => Promise<any>) {
    this.executor = executor;
    return this;
  }
}
