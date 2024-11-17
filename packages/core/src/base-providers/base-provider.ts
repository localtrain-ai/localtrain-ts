import {
  ContextDTO,
  IBaseSupportedInputs,
  InputType,
  ProviderType,
  StepInputDTO,
  StepOutputDTO,
} from '../types';

export abstract class BaseProvider<
  I extends StepInputDTO<InputType>,
  O extends StepOutputDTO<any>
> {
  static options?: any;
  abstract key: string;
  abstract category: string;
  abstract providerType: ProviderType;
  abstract description: string;
  abstract supportedInputs: IBaseSupportedInputs[];

  abstract execute(inputDto: I, context: ContextDTO): Promise<O>;

  static initialize(options: any) {
    this.options = options;
  }

  toJSON() {
    return {
      name: this.key,
      type: this.providerType,
      description: this.description,
      supportedInputs: this.supportedInputs,
      category: this.category,
    };
  }
}
