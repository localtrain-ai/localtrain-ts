import OpenAI from 'openai';
import { ChatCompletion, ChatCompletionCreateParamsBase } from 'openai/src/resources/chat/completions';
import { Stream } from 'openai/streaming';
import { ChatCompletionChunk, ChatCompletionMessage } from 'openai/resources/chat/completions';
import { EventEmitter } from 'events';
import { Readable } from 'stream';

export class BaseOpenai {
  private openAI: OpenAI;
  private eventEmitter: EventEmitter;
  private _options!: ChatCompletionCreateParamsBase;
  private isStreaming = false;

  constructor(
    options: {
      apiKey: string;
    }
  ) {
    this.openAI = new OpenAI({
      apiKey: options.apiKey,
    });
    this.eventEmitter = new EventEmitter();
  }

  generateText(options: ChatCompletionCreateParamsBase) {
    this._options = options;

    // Return `this` for chaining if streaming is intended
    if (this._options.stream) {
      this.isStreaming = true; // Set stream here if `stream` was called
      return this;
    } else {
      // Otherwise, return a promise with the complete result
      return this.openAI.chat.completions.create(options);
    }
  }

  async handleStreaming(response: Stream<ChatCompletionChunk>, push: (chunk: string) => void, fullMessage: ChatCompletion) {
    for await (const chunk of response) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) {
        fullMessage.choices[0].message.content = fullMessage.choices[0].message.content + content;
        fullMessage.usage = {
          completion_tokens: 0,
          prompt_tokens: 0,
          total_tokens: 0
        };
        push(content); // Push each streamed chunk
      } else if (chunk && chunk.usage) {
        fullMessage.usage = {
          completion_tokens: chunk.usage.completion_tokens!,
          prompt_tokens: chunk.usage.prompt_tokens!,
          total_tokens: chunk.usage.total_tokens!
        };
      }
    }
  }

  public async stream(callback: (chunk: string) => void): Promise<ChatCompletion> {
    this.isStreaming = true;
    this._options.stream = true;

    const fullMessage = {
      choices: [
        {
          message: {
            content: ""
          }
        }
      ],
      usage: {
        completion_tokens: 0,
        prompt_tokens: 0,
        total_tokens: 0
      }
    } as any // Initialize fullMessage array to collect chunks

    const readableStream = new Readable({
      read() {}, // No need to do anything here; we will push data manually
    });

    // Generate a completion with streaming enabled
    const res = await this.openAI.chat.completions.create({
      ...this._options,
      stream_options: { include_usage: true }
    });

    // Process the stream and push each chunk to the readable stream
    await this.handleStreaming(res as any, (chunk) => {
      readableStream.push(chunk);
      callback(chunk); // Call the user-defined callback for each chunk
    }, fullMessage);

    // When the stream ends, push null to signal end of the stream
    readableStream.push(null);

    // Return the entire message after streaming completes
    return fullMessage
  }
}
