import { Container, ContainerOptions, Ticker, assignWithIgnore } from "pixi.js";
import { ComponentManager } from "../components";
import { getEngine } from "../core";
import { Logger } from "../logger";
import { String2Ref } from "./string2Ref";
/**
 * Apply common properties to a display object.
 * This method is called by all the game object creation methods to apply common properties
 * such as position, scale, rotation, and component management.
 * @param object The display object to apply properties to.
 * @param parent Optional parent container.
 */
export function ApplyCommonProperties<T extends Container = Container>(
  object: T,
  config: ContainerOptions,
  parent?: Container,
  ignore?: Record<string, boolean>
): T {
  object.game = getEngine();
  if (!object.components && config.components && config.components.length > 0) {
    object.components = new ComponentManager(object);

    object.updateComponents = function (ticker: Ticker) {
      this.components.update(ticker.deltaMS);
    };
    object.destroyComponents = function () {
      this.game.ticker.remove(object.updateComponents, object);
      this.components.destroy();
    };
    object.once("destroyed", object.destroyComponents, object);
    object.game.ticker.add(object.updateComponents, object);
  }
  if (object.components && config.components) {
    config.components.forEach((component: any) => {
      let ref = component.type;
      if (typeof component.type === "string") {
        ref = String2Ref(component.type);
      }
      if (ref) {
        Logger.log("Adding component", ref);
        object.components.addComponent(
          new ref(object, ...(component.params || []))
        );
      }
    });
  }
  if (!ignore) {
    ignore = {};
  }
  if (ignore) {
    ignore.components = true;
  }
  assignWithIgnore(object, config as any, ignore);
  if (parent && !object.parent) {
    parent.addChild(object);
  }

  return object;
}
