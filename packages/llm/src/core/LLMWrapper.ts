// import {TokenManager} from "./TokenManager";
// import {GenerateTextOptions} from "./GenerateText.types";
// import {GenerateTextManager} from "./GenerateText";
// import {LLMWrapperOptions, WrappedOptions} from "./Wrapped.types";
// import {LTOpenAI} from "../providers";
//
//
// export class LLMWrapper {
//     private readonly tokenManager: TokenManager;
//     private readonly generateTextManager: GenerateTextManager;
//     private readonly wrappedOptions: WrappedOptions<{}>;
//
//     constructor(options?: LLMWrapperOptions) {
//         this.tokenManager = options?.tokenManager ?? new TokenManager();
//         this.generateTextManager = options?.generateTextManager ?? new GenerateTextManager();
//         this.wrappedOptions = {
//             tokenManager: this.tokenManager,
//             generateTextManager: this.generateTextManager,
//         };
//     }
//
//     async generateText(options: GenerateTextOptions) {
//         if (!options.model) {
//             options.model = new LTOpenAI({apiKey: ""})
//         }
//         return this.generateTextManager.generateText({...this.wrappedOptions, ...options});
//     }
//
//     getUsage() {
//         return this.tokenManager.getUsage();
//     }
// }
