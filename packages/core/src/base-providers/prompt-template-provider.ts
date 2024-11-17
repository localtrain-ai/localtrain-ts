import { ContextDTO } from '../types';

export type MessageType = 'system' | 'user' | 'assistant';
export type PromptTemplateMessage = { type: MessageType; content: string };

export abstract class BasePromptTemplateProvider<
  TVariables extends Record<string, any>,
  TOutput
> {
  protected messages: PromptTemplateMessage[] = [];
  protected placeholderRegex: RegExp;
  isPromptTemplate = true;
  protected variables: Partial<TVariables> = {};

  protected constructor(protected template: string, syntax = '{{ }}') {
    const [start, end] = syntax.split(' ');
    this.placeholderRegex = new RegExp(`${start}(.*?)${end}`, 'g');
  }

  protected compileTemplate(content: string) {
    return content.replace(this.placeholderRegex, (_, key) => {
      const value = this.variables[key.trim() as keyof TVariables];
      return value !== undefined ? String(value) : '';
    });
  }

  abstract substituteContextVariables(context: ContextDTO): this;

  abstract withVariables(inputs: TVariables): this;

  abstract addMessage(type: MessageType, content: string): this;

  abstract render(): TOutput;
}
