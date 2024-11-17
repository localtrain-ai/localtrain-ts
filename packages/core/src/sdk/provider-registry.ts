import { BaseProvider } from '../base-providers/base-provider';

export class ProviderRegistry {
  private providers: Map<string, BaseProvider<any, any>> = new Map();

  attachProvider(provider: BaseProvider<any, any>) {
    this.providers.set(provider.key, provider);
  }

  getProviderByKey(key: string) {
    return this.providers.get(key);
  }

  hasProvider(key: string) {
    return this.providers.has(key);
  }

  listProviders() {
    return Array.from(this.providers).map(p => p[1]);
  }

  isEmpty() {
    return this.providers.size === 0;
  }
}
