import type { LabClientModule } from '../shared/contracts/lab.js';
import { cookieStorageClientModule } from '../labs/cookie-storage/client/index.js';
import { samesiteCsrfClientModule } from '../labs/samesite-csrf/client/index.js';
import { jwtClientModule } from '../labs/exployting-jwt-tokens/client/index.js';

class ClientLabRegistry {
  private modules: Map<string, LabClientModule> = new Map();

  constructor() {
    this.register(cookieStorageClientModule);
    this.register(samesiteCsrfClientModule);
    this.register(jwtClientModule);
  }

  public register(module: LabClientModule): void {
    this.modules.set(module.manifest.id, module);
  }

  public get(id: string): LabClientModule | undefined {
    return this.modules.get(id);
  }

  public getAll(): LabClientModule[] {
    return Array.from(this.modules.values());
  }
}

export const clientRegistry = new ClientLabRegistry();
