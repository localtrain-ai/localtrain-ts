import {
  ContextDTO,
  FileWriterInputDTO,
  FileWriterProviderInputs,
  FileWriterStepOutBaseDto,
  IBaseSupportedInputs,
} from '@localtrain.ai/core';
import { FileWriterProvider } from '@localtrain.ai/core';
import { put } from '@vercel/blob';

export class VercelFileWriter extends FileWriterProvider {
  key = 'vercel-file-writer';
  category = 'file_writer';
  description =
    'Uploads a file to Vercel Blob Storage publicly on the cloud and returns a public URL';
  supportedInputs: IBaseSupportedInputs[] = [
    {
      type: 'input',
      label: 'File Name',
      name: 'fileName',
      description: 'Name of the file along with the extension',
    },
    {
      type: 'input',
      label: 'File Type',
      name: 'fileType',
      description: 'Type of the file (html/pdf/json/csv/xls etc)',
    },
    {
      type: 'textarea',
      label: 'File Contents',
      name: 'contents',
      description: 'The contents of the file',
    },
  ];

  constructor() {
    super();
  }

  private validateInput(inputDto: FileWriterInputDTO): void {
    if (!inputDto.inputs.fileName) {
      throw new Error('fileName is required in input DTO');
    }
    if (!inputDto.inputs.fileType) {
      throw new Error('fileType is required in input DTO');
    }
    if (!inputDto.inputs.contents) {
      throw new Error('contents is required in input DTO');
    }
  }

  // The method to handle file upload and return the public URL
  async uploadFile(fileName: string, contents: string): Promise<string> {
    const response = await put(fileName, contents, {
      access: 'public',
      token: process.env['VERCEL_BLOB_TOKEN'], // Ensure this is available in the environment
    });
    return response.url;
  }

  async execute(
    inputDto: FileWriterInputDTO,
    context: ContextDTO
  ): Promise<FileWriterStepOutBaseDto<string>> {
    this.validateInput(inputDto); // Ensure input validity
    const { fileName, contents } = inputDto.inputs as FileWriterProviderInputs; // Expecting fileName and contents in the input

    // Track time for execution metrics
    const startTime = Date.now();

    const url = await this.uploadFile(fileName as string, contents as string);

    const timeTaken = Date.now() - startTime;
    console.log('timeTaken', timeTaken);

    // Extract the response content and return in the standardized format
    return {
      output: url,
      timeTaken,
      context,
    } as FileWriterStepOutBaseDto<string>;
  }
}
