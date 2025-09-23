import { BaseGame, getEngine } from "../core";

/**
 * Base class for all components.
 * Provides lifecycle methods that can be overridden.
 */
export class Component {
  public conf: any;
  public gameObject: unknown;
  public game: BaseGame = getEngine();

  constructor(gameObject: unknown, conf?: any) {
    this.conf = conf;
    this.gameObject = gameObject;
  }

  /**
   * Called when the component is added to an entity.
   */
  onAdded?(): void;

  /**
   * Called when the component is removed from an entity.
   */
  onRemoved?(): void;

  /**
   * Called every frame.
   * @param deltaTime Time since the last frame.
   */
  update?(deltaTime: number): void;

  /**
   * Called when the component is destroyed.
   */
  destroy?(): void;
}
