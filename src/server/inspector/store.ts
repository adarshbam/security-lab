import type { ExperimentObservation } from '../../shared/contracts/inspector.js';

class InspectorStore {
  private observations: ExperimentObservation[] = [];
  private maxCapacity = 200;

  public record(obs: ExperimentObservation): void {
    this.observations.unshift(obs);
    if (this.observations.length > this.maxCapacity) {
      this.observations.pop();
    }
  }

  public getObservations(experimentId?: string, limit = 50): ExperimentObservation[] {
    let list = this.observations;
    if (experimentId) {
      list = list.filter((o) => o.experimentId === experimentId);
    }
    return list.slice(0, limit);
  }

  public clear(experimentId?: string): void {
    if (experimentId) {
      this.observations = this.observations.filter((o) => o.experimentId !== experimentId);
    } else {
      this.observations = [];
    }
  }
}

export const inspectorStore = new InspectorStore();
