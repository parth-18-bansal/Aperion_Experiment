import { Logger } from "../logger";
import { Component } from "./Component";

/**
 * Represents an entity in the game world.
 * An entity can have multiple components attached to it.
 */
export class ComponentManager {
  private components: Map<string, Component> = new Map();
  public gameObject: unknown;

  constructor(gameObject: unknown) {
    this.gameObject = gameObject;
  }

  /**
   * Adds a component to the entity.
   * @param component The component to add.
   */
  addComponent<T extends Component>(component: T): void {
    const name = component.constructor.name;
    if (this.components.has(name)) {
      Logger.warn(`Component ${name} already exists on this entity.`);
      return;
    }

    this.components.set(name, component);
    component.onAdded?.();
  }

  /**
   * Removes a component from the entity.
   * @param componentType The type of the component to remove.
   */
  removeComponent<T extends Component>(
    componentType: new (...args: any[]) => T
  ): void {
    const name = componentType.name;
    const component = this.components.get(name);
    if (!component) {
      Logger.warn(`Component ${name} does not exist on this entity.`);
      return;
    }

    component.onRemoved?.();
    this.components.delete(name);
  }

  /**
   * Gets a component from the entity.
   * @param componentType The type of the component to get.
   * @returns The component, or null if it doesn't exist.
   */
  getComponent<T extends Component>(
    componentType: new (...args: any[]) => T
  ): T | null {
    const name = componentType.name;
    return (this.components.get(name) as T) || null;
  }

  /**
   * Checks if the entity has a component.
   * @param componentType The type of the component to check.
   * @returns True if the entity has the component, false otherwise.
   */
  hasComponent<T extends Component>(
    componentType: new (...args: any[]) => T
  ): boolean {
    return this.components.has(componentType.name);
  }

  /**
   * Updates all components on the entity.
   * @param deltaTime Time since the last frame.
   */
  update(deltaTime: number): void {
    this.components.forEach((component) => {
      component.update?.(deltaTime);
    });
  }

  destroy(): void {
    this.components.forEach((component) => {
      component.destroy?.();
    });
    this.components.clear();
  }

  /**
   * Removes all components from the entity.
   * Calls onRemoved for each component before clearing the list.
   */
  removeAllComponents(destroy = false): void {
    this.components.forEach((component) => {
      component.onRemoved?.();
      if (destroy === true) {
        component.destroy?.();
      }
    });
    this.components.clear();
  }
}
