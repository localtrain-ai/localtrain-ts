// import {v4 as uuidV4} from "uuid";
// import {GenerateTextOptions} from "./GenerateText.types";
// import {WrappedOptions} from "./Wrapped.types";
// import {BaseLLMProvider} from "../providers";
//
// export class GenerateTextManager {
//
//     async generateText(options: WrappedOptions<GenerateTextOptions>): Promise<void> {
//         const {
//             model = 'gpt-4o',
//             system = 'You are a friendly assistant.',
//             prompt,
//             temperature = 0.7,
//             maxTokens = 2000,
//             debug = false,
//         } = options;
//
//         const traceId = uuidV4();
//         if (debug) console.log(`[Trace ${traceId}] Request Start`);
//
//         const startTime = Date.now();
//
//         // console.log('options?.model', (options?.model as BaseLLMProvider).completion(options))
//         try {
//             const response = await (options?.model as BaseLLMProvider).completion({
//                 prompt,
//                 system,
//                 temperature,
//                 max_tokens: maxTokens,
//             });
//
//             const duration = Date.now() - startTime;
//             const tokenUsage = response.usage?.total_tokens || 0;
//             const cost = tokenUsage * 0.00002;
//
//             options.tokenManager.addUsage(response.usage.input_token, 'input');
//             options.tokenManager.addUsage(response.usage.output_token, 'output');
//
//             if (debug) {
//                 console.log(`[Trace ${traceId}] Success`);
//                 console.log(`Execution Time: ${duration}ms`);
//                 console.log(`Token Usage: ${tokenUsage}, Estimated Cost: $${cost.toFixed(4)}`);
//             }
//
//             return response.text;
//         } catch (error) {
//             console.error(`[Trace ${traceId}] Error: ${error.message}`);
//             throw error;
//         }
//     }
// }