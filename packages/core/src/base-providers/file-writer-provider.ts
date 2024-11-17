import { BaseProvider } from './base-provider';
import {
  ContextDTO,
  FileLoaderInputDTO,
  FileLoaderStepOutBaseDto, FileWriterInputDTO, FileWriterStepOutBaseDto,
  ProviderType
} from '../types';

export abstract class FileWriterProvider extends BaseProvider<
  FileWriterInputDTO,
  FileWriterStepOutBaseDto<string>
> {
  override providerType: ProviderType = "file_loader";

  abstract override execute(
    inputDto: FileWriterInputDTO,
    context: ContextDTO,
  ): Promise<FileWriterStepOutBaseDto<string>>;
}
