import {
  APIInputDTO, APIStepOutBaseDto, BaseProvider,
  ContextDTO, IBaseSupportedInputs, ProviderType
} from '@localtrain.ai/core';
import axios, { AxiosResponse } from 'axios';

export class ApiCall extends BaseProvider<APIInputDTO, APIStepOutBaseDto<{status: number, data: any}>> {
  key = 'api-call';
  category = "api";
  description = "Request API Calls";
  providerType: ProviderType = "api";
  supportedInputs: IBaseSupportedInputs[] = [
    {
      type: 'input',
      label: 'API URL',
      name: "url",
      description: 'The URL to make the API Call',
    },
    {
      type: 'dropdown',
      label: 'API Method',
      name: "method",
      description: 'The API request method',
      options: [
        {
          label: 'GET',
          value: 'GET',
        },
        {
          label: 'POST',
          value: 'POST',
        },
        {
          label: 'PUT',
          value: 'PUT',
        },
        {
          label: 'PATCH',
          value: 'PATCH',
        },
        {
          label: 'DELETE',
          value: 'DELETE',
        },
      ],
    },
    {
      type: 'textarea',
      label: 'API Request Body',
      name: "data",
      description: 'The body to pass to the request',
    },
  ];

  constructor() {
    super();
  }

  private validateInput(inputDto: APIInputDTO): void {
    if (!inputDto.inputs.url) {
      throw new Error('URL is required in input DTO');
    }
  }

  async execute(
    inputDto: APIInputDTO,
    context: ContextDTO
  ): Promise<APIStepOutBaseDto<{status: number, data: any}>> {
    this.validateInput(inputDto); // Ensure input validity

    // Track time for execution metrics
    const startTime = Date.now();
    const apiData = {
      method: inputDto.inputs.method || "GET",
      url: inputDto.inputs.url,
      data: inputDto.inputs.body || {},
      headers: {
        "content-type": 'application/json; charset=utf-8',
        ...inputDto.inputs.headers
      }
    }
    const result: AxiosResponse = await axios(apiData);
    const timeTaken = Date.now() - startTime;
    console.log('timeTaken', timeTaken);
    // Extract the response content and return in the standardized format
    return {
      output: {
        status: result.status,
        data: result.data,
      },
      timeTaken,
    } as APIStepOutBaseDto<{status: number, data: any}>;
  }

}
