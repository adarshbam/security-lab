import { attachTeaching } from '../shared/teaching.js';
import { curriculumPosition } from '../shared/curriculum.js';
import { xssClientModule } from '../labs/xss-csp/client/index.js';
import type { LabClientModule } from '../shared/contracts/lab.js';
import { cookieStorageClientModule } from '../labs/cookie-storage/client/index.js';
import { samesiteCsrfClientModule } from '../labs/samesite-csrf/client/index.js';
import { jwtClientModule } from '../labs/exployting-jwt-tokens/client/index.js';
import { accessClientModule } from '../labs/broken-access-control/client/index.js';
import { privilegeClientModule } from '../labs/privilege-escalation/client/index.js';
import { injectionClientModule } from '../labs/injection-attacks/client/index.js';

class ClientLabRegistry {
  private modules: Map<string, LabClientModule> = new Map();

  constructor() {
    this.register(cookieStorageClientModule);
    this.register(samesiteCsrfClientModule);
    this.register(jwtClientModule);
    this.register(accessClientModule);
    this.register(privilegeClientModule);
    this.register(injectionClientModule);
    this.register(xssClientModule);
  }

  public register(module: LabClientModule): void {
    attachTeaching(module);
    this.modules.set(module.manifest.id, module);
  }

  public get(id: string): LabClientModule | undefined {
    return this.modules.get(id);
  }

  public getAll(): LabClientModule[] {
    return Array.from(this.modules.values()).sort((a, b) => curriculumPosition(a.manifest.id) - curriculumPosition(b.manifest.id));
  }
}

export const clientRegistry = new ClientLabRegistry();
