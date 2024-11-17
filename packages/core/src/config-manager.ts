import { ProviderRegistry } from './sdk/provider-registry';
import { BaseProvider } from './base-providers/base-provider';

export class ConfigManager {
  private static apiKey: string;
  static providerRegistry: ProviderRegistry = new ProviderRegistry();

  static setApiKey(apiKey: string) {
    ConfigManager.apiKey = apiKey;
    return ConfigManager;
  }

  static setProviderRegistry(registry: ProviderRegistry) {
    ConfigManager.providerRegistry = registry;
    return ConfigManager;
  }

  static getApiKey(): string {
    return ConfigManager.apiKey;
  }

  static getProviderRegistry(): ProviderRegistry | null {
    // return ConfigManager.providerRegistry.isEmpty() ? ConfigManager.providerRegistry : null;
    return ConfigManager.providerRegistry
  }

  static attachProvider(provider: BaseProvider<any, any>) {
    if (!ConfigManager.providerRegistry) {
      ConfigManager.providerRegistry = new ProviderRegistry();
    }
    ConfigManager.providerRegistry.attachProvider(provider);
    return ConfigManager;
  }
}
