import {TokenManager} from "./TokenManager";
import {GenerateTextManager} from "./GenerateText";

export type WrappedOptions<T> = T & {
    tokenManager?: TokenManager;
    generateTextManager?: GenerateTextManager;
}

export interface LLMWrapperOptions extends WrappedOptions<{}> {

}
