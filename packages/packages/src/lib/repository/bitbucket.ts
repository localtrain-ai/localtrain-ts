import {
  ContextDTO, CreateAndCommitStepOutputBaseDTO,
  FileWriterStepOutBaseDto, IBaseSupportedInputs, ProviderType, RepositoryProvider
} from '@localtrain.ai/core';
import axios from 'axios';
import * as console from 'node:console';

export class BitbucketCommit extends RepositoryProvider {

  private bbInputs = ["workspace", "repoSlug", "filePath", "content", "commitMessage", "username", "token"]

  key = 'bitbucket';
  category = 'repository-manager';
  description = 'Creates  a file and commits';
  supportedInputs: IBaseSupportedInputs[] = [
    {
      type: "input",
      label: "workspace",
      name: "workspace",
      description: "Repository workspace"
    },
    {
      type: "input",
      label: "repoSlug",
      name: "repoSlug",
      description: "Repository filePath"
    },
    {
      type: "input",
      label: "filePath",
      name: "filePath",
      description: "Repository filePath"
    },
    {
      type: "input",
      label: "content",
      name: "content",
      description: "content"
    },
    {
      type: "input",
      label: "commitMessage",
      name: "commitMessage",
      description: "commitMessage"
    },
    {
      type: "input",
      label: "username",
      name: "username",
      description: "username"
    },
    {
      type: "input",
      label: "token",
      name: "token",
      description: "token"
    },
  ];

  constructor() {
    super();
  }

  private validateInput(inputDto: any): void {
    // if (!inputDto.inputs.filePath) {
    //   throw new Error('File Path is required in input DTO');
    // }
    // if (!inputDto.inputs.workspace) {
    //   throw new Error('workspace is required in input DTO');
    // }
    // if (!inputDto.inputs.repoSlug) {
    //   throw new Error('repoSlug is required in input DTO');
    // }
    // if (!inputDto.inputs.username) {
    //   throw new Error('Username is required in input DTO');
    // }
  }

  async execute(
    inputDto: any,
    context: ContextDTO
  ): Promise<
    CreateAndCommitStepOutputBaseDTO<{
      success: boolean,
      commitSha: string,
      branch: string,
      message: string,
    }>
  > {
    this.validateInput(inputDto); // Ensure input validity

    // Track time for execution metrics
    const startTime = Date.now();
    const result = await commitFile(inputDto.inputs);
    const timeTaken = Date.now() - startTime;
    console.log('timeTaken', timeTaken);

    // Extract the response content and return in the standardized format
    return {
      output: result,
      timeTaken,
    } as FileWriterStepOutBaseDto<{
      success: boolean,
      commitSha: string,
      branch: string,
      message: string,
    }>;
  }

}

async function createBranchIfNotExist({
  workspace,
  repoSlug,
  branch,
  username,
  token
}: any): Promise<void> {
  const url = `https://api.bitbucket.org/2.0/repositories/${workspace}/${repoSlug}/refs/branches/${branch}`;

  try {
    await axios.get(url, { auth: { username, password: token } });
    console.log(`Branch "${branch}" already exists.`);
  } catch (error: any) {
    if (error.response.status === 404) {
      console.log(`Branch "${branch}" does not exist. Creating it now.`);
      const baseBranchRefUrl = `https://api.bitbucket.org/2.0/repositories/${workspace}/${repoSlug}/refs/branches/main`;
      const baseBranchResponse = await axios.get(baseBranchRefUrl, { auth: { username, password: token } });
      const baseBranchSha = baseBranchResponse.data.target.hash;

      await axios.post(
        `https://api.bitbucket.org/2.0/repositories/${workspace}/${repoSlug}/refs/branches`,
        { name: branch, target: { hash: baseBranchSha } },
        { auth: { username, password: token } }
      );
      console.log(`Branch "${branch}" created successfully.`);
    }
  }
}

async function commitFile({
  workspace,
  repoSlug,
  filePath,
  content,
  commitMessage,
  branch = `localtraina.ai/commits/${Date.now()}`,
  username,
  token
}: any): Promise<{
  success: boolean,
  commitSha: string,
  branch: string,
  message: string,
}> {
  await createBranchIfNotExist({ workspace, repoSlug, branch, username, token });

  const url = `https://api.bitbucket.org/2.0/repositories/${workspace}/${repoSlug}/src`;

  const data = new URLSearchParams();
  data.append(filePath, content);
  data.append('message', commitMessage);
  data.append('branch', branch);

  const response = await axios.post(url, data, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    auth: { username, password: token }
  });

  const createPR = await createPullRequest({
    workspace: workspace,
    repoSlug: repoSlug,
    title: commitMessage,
    description: commitMessage,
    sourceBranch: branch,
    targetBranch: "main",
    username: username,
    token,
  })

  return {
    success: true,
    commitSha: response.data.commit,
    branch,
    message: `File committed successfully to branch "${branch}".`
  };
}

async function createPullRequest({
  workspace,
  repoSlug,
  title,
  description,
  sourceBranch,
  targetBranch,
  username,
  token
}: any): Promise<{ success: boolean; pullRequestId: string; message: string }> {
  const url = `https://api.bitbucket.org/2.0/repositories/${workspace}/${repoSlug}/pullrequests`;

  const response = await axios.post(
    url,
    {
      title,
      description,
      source: { branch: { name: sourceBranch } },
      destination: { branch: { name: targetBranch } }
    },
    { auth: { username, password: token } }
  );

  const pullRequestId = response.data.id;

  return {
    success: true,
    pullRequestId,
    message: `Pull request created successfully with ID ${pullRequestId}.`
  };
}

