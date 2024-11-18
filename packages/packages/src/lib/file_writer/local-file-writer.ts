import {
  ContextDTO,
  FileLoaderInputDTO,
  FileWriterInputDTO,
  FileWriterStepOutBaseDto, IBaseSupportedInputs
} from '@localtrain.ai/core';
import { FileWriterProvider } from '@localtrain.ai/core';
import * as fs from 'node:fs';

export class LocalFileWriter extends FileWriterProvider {
  key = 'local_file_writer';
  category = 'file_writer';
  description = 'Write file to local file';
  supportedInputs: IBaseSupportedInputs[] = [
    {
      type: "input",
      label: "PATH",
      name: "path",
      description: "Path to write."
    },
    {
      type: "input",
      label: "Contents of the file",
      name: "contents",
      description: "The contents to write in the file"
    }
  ];

  constructor() {
    super();
  }

  private validateInput(inputDto: FileLoaderInputDTO): void {
    if (!inputDto.inputs.path) {
      throw new Error('Path is required in input DTO');
    }
  }

  async execute(
    inputDto: FileWriterInputDTO,
    context: ContextDTO
  ): Promise<
    FileWriterStepOutBaseDto<string>
  > {
    this.validateInput(inputDto); // Ensure input validity

    // Track time for execution metrics
    const startTime = Date.now();
    const result = await writeLocalFile(inputDto.inputs.path!, inputDto.inputs.contents!);
    const timeTaken = Date.now() - startTime;
    console.log('timeTaken', timeTaken);

    // Extract the response content and return in the standardized format
    return {
      output: result,
      timeTaken,
    } as FileWriterStepOutBaseDto<string>;
  }
}

function writeLocalFile(filePath: string, contents: string,): Promise<string> {
  return new Promise((resolve, reject) => {
    fs.writeFile(filePath, contents, 'utf8', (err) => {
      if (err) {
        reject(`Error reading file: ${err}`);
        return;
      }
      const output = filePath;

      // Resolve the output to be used as a result
      resolve(output);
    });
  });
}
