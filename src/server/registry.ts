import type { LabServerModule } from '../shared/contracts/lab.js';
import { curriculumPosition } from '../shared/curriculum.js';
import { xssServerModule } from '../labs/xss-csp/server/index.js';
import { cookieStorageServerModule } from '../labs/cookie-storage/server/index.js';
import { samesiteCsrfServerModule } from '../labs/samesite-csrf/server/index.js';
import { jwtServerModule } from '../labs/exployting-jwt-tokens/server/index.js';
import { accessServerModule } from '../labs/broken-access-control/server/index.js';
import { privilegeServerModule } from '../labs/privilege-escalation/server/index.js';
import { injectionServerModule } from '../labs/injection-attacks/server/index.js';

class ServerLabRegistry {
  private modules: Map<string, LabServerModule> = new Map();

  public register(module: LabServerModule): void {
    this.modules.set(module.manifest.id, module);
  }

  public get(id: string): LabServerModule | undefined {
    return this.modules.get(id);
  }

  public getAll(): LabServerModule[] {
    return Array.from(this.modules.values()).sort((a, b) => curriculumPosition(a.manifest.id) - curriculumPosition(b.manifest.id));
  }

  public resetAll(): void {
    for (const mod of this.modules.values()) {
      mod.resetState();
    }
  }
}

export const serverRegistry = new ServerLabRegistry();
serverRegistry.register(cookieStorageServerModule);
serverRegistry.register(samesiteCsrfServerModule);
serverRegistry.register(jwtServerModule);
serverRegistry.register(accessServerModule);
serverRegistry.register(privilegeServerModule);
serverRegistry.register(injectionServerModule);
serverRegistry.register(xssServerModule);
