import {
  BasePromptTemplateProvider,
  MessageType,
} from '../base-providers/prompt-template-provider';
import { ContextDTO } from '../types';
import { resolveDynamicVariables } from '../utils/utils';

export class ChatPromptTemplate<
  TVariables extends Record<string, any>
> extends BasePromptTemplateProvider<
  TVariables,
  { role: MessageType; content: string }[]
> {
  constructor(template: string, syntax = '{{ }}') {
    super(template, syntax);
  }

  /**
   * Sets all variables in a single step.
   */
  withVariables(inputs: TVariables): this {
    this.variables = inputs;
    return this;
  }

  /**
   * Adds a message of a specific type to the message queue, replacing placeholders.
   */
  addMessage(type: MessageType, content: string): this {
    const compiledContent = this.compileTemplate(content);
    this.messages.push({ type, content: compiledContent });
    return this;
  }

  /**
   *
   * @param context
   * Resolved the dynamic variable from intermediate steps to ensure the final output can be a part of the chain.
   */
  substituteContextVariables(context: ContextDTO): this {
    try {
      this.messages = this.messages.map(message=> {
        try {
          const resolvedContent = resolveDynamicVariables(message.content, context, {
            debug: false,
          });
          message.content = resolvedContent;
        } catch (e) {
          console.log("Failed To Resolve Dynamic Variables At substituteContextVariables", message)
        }
        return message;
      })
    } catch (e) {
      console.log('Printing resolution', resolveDynamicVariables(JSON.stringify(this.messages), context, {debug: true}));
      console.log('Error substituteContextVariables', e);
    }

    this.template = resolveDynamicVariables(this.template, context, {
      debug: false,
    });
    return this;
  }

  canParse(str: string) {
    try {
      JSON.parse(str)
      return true;
    }
    catch (e) {
      return false;
    }
  }

  /**
   * Serializes messages in an LLM-compatible format.
   */
  render(): { role: MessageType; content: string }[] {
    const compiledMessages = this.messages.map(({ type, content }) => {
      const compiledContent = this.compileTemplate(content);
      return { role: type, content: compiledContent };
    });

    if (this.template) {
      const userMessage = this.compileTemplate(this.template);
      compiledMessages.push({ role: 'user', content: userMessage });
    }
    return compiledMessages;
  }
}
