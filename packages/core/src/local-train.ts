import { ConfigManager } from './config-manager';
import { BaseProvider } from './base-providers/index';
import { ProviderRegistry } from './sdk/index';

export class LocalTrain {
  static initialize(
    apiKey: string,
    options?: { providerRegistry?: ProviderRegistry }
  ) {
    ConfigManager.setApiKey(apiKey);
    if (options?.providerRegistry) {
      ConfigManager.setProviderRegistry(options.providerRegistry);
    }
    return LocalTrain;
  }

  static useProviders(...providers: BaseProvider<any, any>[]) {
    providers.forEach((provider) => ConfigManager.attachProvider(provider));
    return LocalTrain;
  }

  static listRegisteredProviders() {
    return ((ConfigManager.getProviderRegistry()?.listProviders()) || []).map((provider) => provider.toJSON());
  }
}
