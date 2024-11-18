// import { LLMProvider } from '@localtrain.ai/core';
// import { LLMStepInputDto, ContextDTO, LLMStepOutputBaseDTO } from '@localtrain.ai/core';
// import axios from 'axios';
//
// export class StableDiffusion extends LLMProvider {
//   key = 'stable-diffusion';
//   description = 'Stable Diffusion Text to Image Generation';
//   category = 'llm';
//   apiKey: string;
//
//   constructor(apiKey: string) {
//     super();
//     this.apiKey = apiKey;
//   }
//
//   private generateSystemMessages(prompt: string): any {
//     return {
//       prompt: prompt,
//     };
//   }
//
//   private validateInput(inputDto: LLMStepInputDto): void {
//     if (!inputDto.inputs.prompt) {
//       throw new Error('Prompt is required in input DTO');
//     }
//   }
//
//   async execute(
//     inputDto: LLMStepInputDto,
//     context: ContextDTO
//   ): Promise<LLMStepOutputBaseDTO<string>> {
//     this.validateInput(inputDto);
//
//     const messages = this.generateSystemMessages(inputDto.inputs.prompt);
//     let model = inputDto.inputs.model;
//     if (!model) {
//       model = 'runwayml/stable-diffusion-v1-5';
//       console.log(`No model specified. Using ${model} as default.`);
//     }
//     const payload = {
//       ...messages,
//       key: this.apiKey,
//       width: inputDto.inputs.width || 512,
//       height: inputDto.inputs.height || 512,
//       samples: inputDto.inputs.samples || 1,
//       num_inference_steps: inputDto.inputs.num_inference_steps || 20,
//       guidance_scale: inputDto.inputs.guidance_scale || 7.5,
//       seed: inputDto.inputs.seed,
//       safety_checker: inputDto.inputs.safety_checker || 'yes',
//       multi_lingual: inputDto.inputs.multi_lingual || 'no',
//       panorama: inputDto.inputs.panorama || 'no',
//       self_attention: inputDto.inputs.self_attention || 'no',
//       upscale: inputDto.inputs.upscale || 'no',
//       embeddings_model: inputDto.inputs.embeddings_model,
//       webhook: inputDto.inputs.webhook,
//       track_id: inputDto.inputs.track_id,
//       negative_prompt: inputDto.inputs.negative_prompt,
//       enhance_prompt: inputDto.inputs.enhance_prompt || 'yes',
//       model: model,
//     };
//
//     const startTime = Date.now();
//
//     console.log('payload', payload);
//
//     try {
//       const response = await axios.post('https://stablediffusionapi.com/api/v3/text2img', payload);
//       const timeTaken = Date.now() - startTime;
//       return {
//         output: response.data.output[0],
//         timeTaken,
//         tokensConsumed: null,
//         inputTokens: null,
//         outputTokens: null,
//       } as LLMStepOutputBaseDTO<string>;
//     } catch (error) {
//       console.error('Error during Stable Diffusion API call:', error);
//       throw error;
//     }
//   }
// }
