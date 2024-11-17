import { BaseProvider } from './base-provider';
import {ContextDTO, CreateAndCommitStepOutputBaseDTO, ProviderType} from "../types";


export abstract class RepositoryProvider extends BaseProvider<
  any,
  CreateAndCommitStepOutputBaseDTO<{
    success: boolean,
    commitSha: string,
    branch: string,
    message: string,
  }>
> {
  override providerType: ProviderType = "repository-manager";
  abstract override execute(inputDto: any, context: ContextDTO): Promise<CreateAndCommitStepOutputBaseDTO<{
    success: boolean,
    commitSha: string,
    branch: string,
    message: string,
  }>>;
}
