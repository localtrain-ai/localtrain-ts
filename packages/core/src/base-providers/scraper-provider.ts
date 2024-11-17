import { ProviderType, ContextDTO, StepOutputDTO } from '../types';
import { BaseProvider } from './base-provider';
// import { resolveDynamicVariables, validateURL } from '../utils/utils';

export abstract class ScraperProvider extends BaseProvider<any, any> {
  override category = "scraper";
  override providerType: ProviderType = "scraper";
}
