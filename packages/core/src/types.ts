import { BasePromptTemplateProvider } from './base-providers/prompt-template-provider';
import { Behaviour } from './sdk/agent/behaviour';
import { ITool } from './types/tool-types';

export interface IAgent {
  name: string;
  behaviours: IBehaviour[];
  description: string;
  appId?: string;
  industry?: string;
  isTemplate?: boolean;
  outputType?: string;
  inputs: { name: string; title: string; type: string; options?: string[] }[];
}

export type BaseIteratorInputs = {
  parallel?: boolean,
  iterations?: number | string ,
  maxIterations?: string | number,
}


export type InputType =
  | BaseIteratorInputs
  | LLMProviderInputs
  | APIProviderInputs
  | LooperProviderInputs
  | FileLoaderProviderInputs;

export interface IBehaviour {
  name: string;
  stepId?: string;
  providerType: ProviderType;
  provider: string;
  providerAction?: string;
  providerParams?: Record<string, any>;
  model?: string;
  inputs: InputType;
  behaviours?: IBehaviour[];
  referencedAgentId?: string;
  referencedAgent?: IAgent;
  behaviourId?: string;
}

export type ProviderType =
  | 'llm'
  | 'api'
  | 'scraper'
  | 'file_loader'
  | 'iterator'
  | 'file_writer'
  | 'integration'
  | 'behaviour'
  | 'flow-control'
  | 'code-executor'
  | 'repository-manager'
  ;
export type ProviderName = 'open-ai' | 'api';

export interface LLMProviderBase {
  strict?: boolean;
  stream?: boolean;
  temperature?: number;
  model?: string;
  responseType?: string;
  json_schema?: Record<string, any>;
  tools?: ITool[];
}
// Version 1: With a string prompt
export interface LLMProviderInputsString extends LLMProviderBase{
  inputType?: 'string';
  prompt: string;
}

// Version 2: With a BasePromptTemplateProvider prompt
export interface LLMProviderInputsTemplate<TPromptTemplate extends BasePromptTemplateProvider<Record<string, any>, any>> extends LLMProviderBase{
  inputType: 'template';
  prompt: TPromptTemplate;
}

// Combine both into a discriminated union type
export type LLMProviderInputs = LLMProviderInputsString | LLMProviderInputsTemplate<any>;


export interface LooperProviderInputs {
  iterations?: number | string;
  // nestedBehaviours?: IBehaviour[];
  // agentReference?: string;
  parallel?: boolean;
  maxIterations?: number;
}

export interface APIProviderInputs {
  url: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  body?: Record<any, any>;
  headers?: Record<string, any>;
}

export interface FileLoaderProviderInputs {
  path?: string;
}

export interface FileWriterProviderInputs {
  path?: string;
  contents?: string;
  fileName?: string
  fileType?: string;
}

export class StepInputDTO<T extends InputType> {
  inputs!: T;
}

export class LLMStepInputDto extends StepInputDTO<LLMProviderInputs> {
  chat?: string;
  messages?: {role: string, content: string, tool_call_id?: string}[]
}

export class FileLoaderInputDTO extends StepInputDTO<FileLoaderProviderInputs> {}

export class APIInputDTO extends StepInputDTO<APIProviderInputs> {}

export class FileWriterInputDTO extends StepInputDTO<FileWriterProviderInputs> {
  path!: string;
}

export interface LLMSessionTraceEvent {
  type: string;
  method?: string;
  input?: any;
  output?: any;
  timestamp: number;
  data?: any;
  toolName?: string;
  toolArgs?: string;
  result?: any
  interruptDetected?: boolean;
  usage?: any;
  timeTaken?: number;
  interruptSignal?: InterruptSignal;
  chatCompletion?: any
}

export interface LLMSessionMetrics {
  type?: string,
  timestamp?: number,
  data?: any;
  tokenUsage:  number;
  latency: number;
}

export interface LLMSessionError {
  message: string, stack: any, timestamp: number
}

export interface LLMSessionTrace {
  sessionId: string;
  duration: number;
  events: LLMSessionTraceEvent[],
  metrics: LLMSessionMetrics,
  errors: LLMSessionError[]
}

export class ContextDTO {
  stepResults!: { [key: string]: any };
  result!: any;
  userInput!: Record<string, any>;
  systemExecutionContext!: Record<string, any>;
  runId!: string;
  behaviourRunId?: string;
  startTime?: number;
  totalTokens?: number;
  totalTimeTaken?: number;
  inputTokens?: number;
  outputTokens?: number;
  currentBehaviour?: Behaviour;
  currentBehaviourName?: string;
  currentBehaviorTraces?: any[];
  interrupted?: boolean;
  interruptSignal?: InterruptSignal;
  llmSessionTrace?: LLMSessionTrace;
  currentExecutionBehaviourIndex?: number;
  isLastExecutionBehaviour?: boolean;
}

export class LLMContextDTO extends ContextDTO {}

export class StepOutputDTO<T> {
  timeTaken!: number;
  error?: string;
  errorTrace?: string;
  traceId?: string;
  tokensConsumed?: number;
  inputTokens?: number;
  outputTokens?: number;
  output!: T;
  context!: ContextDTO;
}

export class LLMStepOutputBaseDTO<T> extends StepOutputDTO<T> {
  override output!: T;
}

export class CreateAndCommitStepOutputBaseDTO<T> extends StepOutputDTO<T> {
  override output!: T;
}

export class FileLoaderStepOutBaseDto<T> extends StepOutputDTO<T> {
  override output!: T;
}

export class APIStepOutBaseDto<T> extends StepOutputDTO<T> {
  override output!: T;
}

export class FileWriterStepOutBaseDto<T> extends StepOutputDTO<T> {}

export interface IToolCallParams {
  type: 'object' | "string" | number | "array";
  properties?: {
    [key: string]: {
      type: string;
      description: string;
      enum?: any[],
      items?: {
        type: string;
        description: string;
        properties?: any
      }
    };
  };
  required?: string[];
  additionalProperties?: boolean;
  strict?: boolean
}



export interface IBaseSupportedInputs {
  label: string;
  name: string;
  type: 'input' | 'textarea' | 'dropdown' | "codeEditor" | "nestedSteps" | 'date';
  options?: { label: string; value: string | boolean | number }[];
  description: string;
  required?: boolean;
}

type AtLeastOne<T, U = {[K in keyof T]: Pick<T, K> }> = Partial<T> & U[keyof U]


export interface InterruptSignal {
  type: 'HUMAN_INPUT_REQUIRED' | 'ERROR' | 'PAUSE';
  reason: string;
  data?: any;
}
