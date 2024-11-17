import { ContextDTO, ProviderType, IBaseSupportedInputs } from '../types';
import {BaseProvider} from "../base-providers";

export class Iterator extends BaseProvider<any, any> {
  category = 'Flow Control';
  description = 'Iterates over provided behaviours and executes the provided provider.';
  key = 'iterator';
  providerType: ProviderType = "flow-control";
  supportedInputs: IBaseSupportedInputs[] = [
    {
      type: "dropdown",
      label: "Parallel",
      name: "parallel",
      description: "Allows running the behaviours in parallel",
      required: false,
      options: [{label: "Yes", value: true}, {label: "No", value: false}],
    },
    {
      type: "input",
      label: "Total Number of iterations",
      name: "iterations",
      description: "Configure the total iterations. Can be dynamic or static.",
      required: true
    },
    {
      type: "input",
      label: "Maximum Number of iterations",
      name: "maxIterations",
      description: "Configure the maximum number of iterations. This property stops execution after the limit."
    },
  ];

  execute(inputDto: any, context: ContextDTO): Promise<any> {
    for (let i = 0; i <= 1; i++) {
      console.log('Hello', inputDto);
    }
    return new Promise(() => undefined);
  }
}
