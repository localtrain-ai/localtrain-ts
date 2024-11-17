import { v4 as uuid } from 'uuid';
import {
  ContextDTO,
  LLMSessionError,
  LLMSessionMetrics,
  LLMSessionTrace,
  LLMSessionTraceEvent,
} from '../types';

export class LLMStateManager {
  public sessionId: string;
  public startTime: number;
  public events: LLMSessionTraceEvent[];
  public metrics: LLMSessionMetrics;
  public errors: LLMSessionError[];

  constructor() {
    this.sessionId = uuid();
    this.startTime = Date.now();
    this.events = [];
    this.metrics = { tokenUsage: 0, latency: 0 };
    this.errors = [];
  }

  // Log each input and output with related metadata
  recordInput(input: any) {
    this.events.push({ type: 'input', timestamp: Date.now(), data: input });
  }

  recordOutput(output: any) {
    this.events.push({ type: 'output', timestamp: Date.now(), data: output });
  }

  recordEvent(eventName: string, eventProperties: Partial<LLMSessionTraceEvent>) {
    this.events.push({type: eventName, timestamp: Date.now(), data: eventProperties});
  }

  // Track each tool interaction with detailed info
  recordToolCall(toolName: string, toolArgs: any, result: any) {
    this.events.push({
      type: 'tool_call',
      toolName,
      toolArgs,
      result,
      timestamp: Date.now(),
    });
  }

  // Track any data transformation with input, output, and method used
  recordTransformation(method: string, input: any, output: any) {
    this.events.push({
      type: 'transformation',
      method,
      input,
      output,
      timestamp: Date.now(),
    });
  }

  // Track errors with error message and stack
  recordError(error: Error) {
    this.errors.push({
      message: error.message,
      stack: error.stack,
      timestamp: Date.now(),
    });
  }

  // Track token usage and latency metrics
  trackMetrics(tokenUsage: number, latency: number) {
    this.metrics.tokenUsage += tokenUsage;
    this.metrics.latency += latency;
  }

  finalizeSession(context: ContextDTO) {
    const endTime = Date.now();
    context.llmSessionTrace = {
      sessionId: this.sessionId,
      duration: endTime - this.startTime,
      events: this.events,
      metrics: this.metrics,
      errors: this.errors,
    } as LLMSessionTrace;
  }
}
