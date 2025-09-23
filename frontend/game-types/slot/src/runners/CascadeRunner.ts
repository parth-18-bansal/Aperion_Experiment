import { Engine } from "game-engine";
import { CascadeRunnerData, CascadeRunnerOptions } from "../interfaces";

export class CascadeRunner extends Engine.Runner<
  CascadeRunnerData,
  CascadeRunnerOptions
> {
  runNext(): void {
    super.runNext();
    if (this.state.currentData && this.game.slot.machine) {
      this.game.slot.machine
        .triggerMultipleCascades(
          this.state.currentData.matrix,
          this.options,
          this.state.currentData.animationName
        )
        .then(() => {
          this.completeCurrent();
        });
    }
  }
}
