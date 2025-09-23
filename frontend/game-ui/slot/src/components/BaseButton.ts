import { Button } from "@pixi/ui";
import { Engine } from "game-engine";
import { Container, ContainerOptions } from "pixi.js";

export class BaseButton extends Button {
  constructor(view?: Container, public options?: ContainerOptions) {
    super(view);
  }
  get game(): Engine.BaseGame | undefined {
    if (this.view && !this.view.game) {
      Engine.Utils.ApplyCommonProperties(this.view, this.options || {});
    }
    return this.view?.game;
  }
  set enabled(value: boolean) {
    super.enabled = value;
    if (this.view) {
      this.view.alpha = value ? 1 : 0.5; // Adjust alpha for visual feedback
      this.view.interactive = value; // Enable/disable interaction
    }
  }
  get enabled(): boolean {
    return super.enabled;
  }
}
