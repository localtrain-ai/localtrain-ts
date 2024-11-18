import {BaseLLMProvider} from "../providers/BaseLLMProvider";

export interface GenerateTextOptions {
    model?: BaseLLMProvider;
    prompt: string;
    system?: string;
    temperature?: number;
    maxTokens?: number;
    debug?: boolean;
}
