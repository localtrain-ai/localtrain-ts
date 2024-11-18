import {
  ContextDTO,
  FileLoaderInputDTO,
  FileLoaderStepOutBaseDto, IBaseSupportedInputs
} from '@localtrain.ai/core';
import { FileLoaderProvider } from '@localtrain.ai/core';
import * as fs from 'node:fs';
import * as path from 'path';
import * as console from 'node:console';

export class LocalFileLoader extends FileLoaderProvider {
  key = 'local_file_loader';
  category = "file_loader";
  description = "Read local file from path.";
  supportedInputs: IBaseSupportedInputs[] = [
    {
      type: "input",
      label: "PATH",
      name: "path",
      description: "Path to local file"
    }
  ];

  constructor() {
    super();
  }

  private validateInput(inputDto: FileLoaderInputDTO): void {
    if (!inputDto.inputs.path) {
      throw 'Path is required in input DTO';
    }
  }

  async execute(
    inputDto: FileLoaderInputDTO,
    context: ContextDTO
  ): Promise<FileLoaderStepOutBaseDto<{fileName: string, metadata: string, fileSize: string, contents: string, fileType: string}>> {
    this.validateInput(inputDto); // Ensure input validity

    // Track time for execution metrics
    const startTime = Date.now();
    const result = await readLocalFile(inputDto.inputs.path!)
    const timeTaken = Date.now() - startTime;
    console.log('timeTaken', timeTaken);

    // Extract the response content and return in the standardized format
    return {
      output: result,
      timeTaken,
    } as FileLoaderStepOutBaseDto<{fileName: string, metadata: string, fileSize: string, contents: string, fileType: string}>;
  }
}

function readLocalFile(filePath: string): Promise<{fileName: string, metadata: string, fileSize: string, contents: string, fileType: string}> {
  return new Promise((resolve, reject) => {
    fs.readFile(filePath, 'utf8', (err, data) => {
      if (err) {
        reject(`Error reading file: ${err}`);
        return;
      }

      fs.stat(filePath, (err, stats) => {
        if (err) {
          reject(`Error getting file metadata: ${err}`);
          return;
        }

        const output = {
          fileName: path.basename(filePath),
          metadata: JSON.stringify(stats),
          fileSize: `${stats.size}`,
          contents: data,
          fileType: path.extname(filePath).slice(1) || 'unknown'
        };

        // Resolve the output to be used as a result
        resolve(output);
      });
    });
  });
}
