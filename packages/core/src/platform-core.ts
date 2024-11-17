import { Agent } from './sdk/agent/agent';
import { IAgent, IBehaviour } from './types';

const agent: IAgent = {
  name: 'Code generator for library integration',
  description: '',
  inputs: [
    {
      name: 'documentation_url',
      title: 'Documentation URL',
      type: 'text',
    },
    {
      name: 'template_path',
      title: 'Template Path',
      type: 'text',
    },
    {
      name: 'source_branch',
      title: 'The source branch to clone',
      type: 'text',
    },
    {
      name: 'slack_id',
      title: 'Slack ID to notify',
      type: 'text',
    },
  ],
  behaviours: [
    {
      name: 'load_template',
      provider: 'local_file_loader',
      providerType: 'file_loader',
      providerParams: {},
      inputs: {
        path: '@template_path',
      },
    } as IBehaviour,
    {
      name: 'load_documentation',
      provider: 'scraper',
      providerParams: {
        nested: true,
      } as Record<string, any>,
      inputs: {
        url: '@documentation_url',
      },
      providerType: 'scraper',
    } as IBehaviour,
    {
      name: 'loop_and_summarize_docs',
      providerType: 'iterator',
      provider: 'looper',
      providerParams: {} as Record<string, any>,
      inputs: {
        parallel: true,
        iterations: '@load_documentation.output.pagesCount',
      },
      behaviours: [
        {
          name: 'summarize_docs',
          providerType: 'llm',
          provider: 'claude-3.5-sonnet',
          providerParams: {} as Record<string, any>,
          inputs: {
            prompt:
              'As advanced developer, summarize the apis, methods, body, authentication supported by this page @load_documentation.output.[@iterationIndex].text in a concise format.',
          },
        } as IBehaviour,
      ],
    } as IBehaviour,
    {
      name: 'plan_docs',
      provider: 'open-ai',
      providerType: 'llm',
      providerParams: {
        streaming: false,
      } as Record<string, any>,
      inputs: {
        prompt: `As a advanced developer, you job is to write an SDK with the following instructions @load_template.output.contents. Here are a list of methods and actions it supports. @loop_and_summarize_docs.output. Plan the files based on the instructions provided and the contents in plain english.`,
      },
    } as IBehaviour,
    {
      name: 'generate_files',
      provider: 'open-ai',
      providerType: 'llm',
      providerParams: {
        streaming: false,
      } as Record<string, any>,
      inputs: {
        prompt: `As a advanced developer, you job is to write an SDK with the following instructions @load_template.output.contents. Generate the files for the SDK supporting these instructions @plan_docs.output`,
        responseType: 'json_schema',
        json_schema: {
          type: 'object',
          // Further schema to generate the files
        },
      },
    } as IBehaviour,
    {
      name: 'create_branch',
      provider: 'bitbucket',
      providerType: 'integration',
      providerAction: 'CREATE_BRANCH',
      providerParams: {
        branchName: '@generate_files.output.name_integration',
        sourceBranch: '@source_branch',
        output: 'branch.name',
      },
    },
    {
      name: 'save_files',
      provider: 'looper',
      providerType: 'iterator',
      inputs: {
        iterations: '@generate_files.output.fileCount',
        parallel: true,
      },
      behaviours: [
        {
          name: 'save_file',
          provider: 'bitbucket',
          providerType: 'integration',
          providerAction: 'SAVE_FILE',
          providerParams: {
            sourceBranch: '@create_branch.output',
            fileName: '@generate_files.output.files[@iterationIndex].file_name',
            fileContents:
              '@generate_files.output.files[@iterationIndex].contents',
            commitMessage:
              'Adding @generate_files.output.files[@iterationIndex].file_name',
          } as Record<string, any>,
        } as IBehaviour,
      ],
    },
    {
      name: 'create_pull_request',
      provider: 'bitbucket',
      providerType: 'integration',
      providerAction: 'CREATE_PULL_REQUEST',
      providerParams: {
        sourceBranch: '@source_branch',
        message: `Adds @generate_files.output.name_integration integration`,
        output: 'pr.link',
      },
    },
    {
      name: 'notify_user',
      provider: 'slack',
      providerType: 'integration',
      providerAction: 'SEND_MESSAGE',
      providerParams: {
        recipient: '@slack_id',
        message: `Adds @generate_files.output.name_integration integration. PR Link: @create_pull_request.output `,
      },
    },
  ],
} as IAgent;

export class AgenticWorkflow {
  run() {
    const agi = new Agent();

    agi.addConfig(agent);

    // console.log('ahu', agi.toJSON());

    // agent.addBehaviour({
    //   name: 'get_data_from_google',
    // });
  }
}

const  a = new AgenticWorkflow()

