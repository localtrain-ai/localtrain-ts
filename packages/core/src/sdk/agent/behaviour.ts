// src/agent/behaviour.ts

import { ContextDTO, IBehaviour, LLMProviderBase, StepOutputDTO } from '../../types';
import { BasePromptTemplateProvider, BaseProvider } from '../../base-providers/index';
import { resolveDynamicVariables } from '../../utils/utils';
import { logger } from '../../utils/logger';
import { Tool } from '../tool';


export class Behaviour {
  private _data!: IBehaviour;

  constructor(behaviour?: IBehaviour) {
    if (behaviour) {
      this.setParams(behaviour);
    }
  }

  setParams(behaviour: IBehaviour): void {
    this._data = behaviour;
    if((this._data.inputs as LLMProviderBase).tools?.length) {
      (this._data.inputs as LLMProviderBase).tools = (this._data.inputs as LLMProviderBase).tools?.map(tool => {
        return new Tool(tool)
      })
    }
  }

  getName(): string {
    return this._data.name;
  }

  getProvider(): string {
    return this._data.provider;
  }

  getProviderType(): string {
    return this._data.providerType;
  }

  getInputs(): Record<string, any> {
    return this._data.inputs;
  }

  getNestedBehaviors(): Behaviour[] | undefined {
    return this._data.behaviours?.map(behaviour => new Behaviour(behaviour));
  }

  getBehaviourId(): string | undefined {
    return this._data.behaviourId;
  }

  async execute(
    provider: BaseProvider<any, any>,
    context: ContextDTO
  ): Promise<StepOutputDTO<any>> {
    if (!provider) {
      throw new Error('Cannot find provider');
    }

    const substitutedInputs = this.substituteInputs(context);

    return provider.execute({ inputs: substitutedInputs }, context)
      .then((result) => {
        result.context = context;
        return result;
      })
      .catch(er => {
        logger.error(`Failed to execute provider: ${provider.key}`);
        return { context };
      });
  }

  private substituteInputs(context: ContextDTO): Record<string, any> {
    return Object.entries(this._data.inputs).reduce((acc, [key, value]) => {
      let resolvedVariable;
      if(typeof value === 'object') {
        if(value.isPromptTemplate) {
          resolvedVariable = value.substituteContextVariables(context);
        } else {
          //TODO: handle for nested template substitutions
          if(key !== "tools") {
            resolvedVariable = resolveDynamicVariables(JSON.parse(JSON.stringify(value)), context, { debug: false })
          } else {
            resolvedVariable = value;
          }
        }
      } else {
        resolvedVariable = resolveDynamicVariables(value, context, { debug: false });
      }
      acc[key] = resolvedVariable;
      return acc;
    }, {} as Record<string, any>);
  }

  toJSON() {
    return { ...this._data };
  }
}
