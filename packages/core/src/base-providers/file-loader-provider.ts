import { BaseProvider } from './base-provider';
import {
  ContextDTO,
  FileLoaderInputDTO,
  FileLoaderStepOutBaseDto,
  ProviderType,
} from '../types';

export abstract class FileLoaderProvider extends BaseProvider<
  FileLoaderInputDTO,
  FileLoaderStepOutBaseDto<{fileName: string, metadata: string, fileSize: string, contents: string, fileType: string}>
> {
  override providerType: ProviderType = "file_loader";

  abstract override execute(
    inputDto: FileLoaderInputDTO,
    context: ContextDTO,
  ): Promise<FileLoaderStepOutBaseDto<{fileName: string, metadata: string, fileSize: string, contents: string, fileType: string}>>;
}
