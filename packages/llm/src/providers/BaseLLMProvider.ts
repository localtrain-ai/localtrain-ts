import {ChatCompletionCreateParamsBase} from "openai/src/resources/chat/completions";

export abstract class BaseLLMProvider {

    abstract completion(options?: ChatCompletionCreateParamsBase):  Promise<{}>;

    chat() {

    }
}