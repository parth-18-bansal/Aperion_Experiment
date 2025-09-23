import { ApplicationOptions } from "pixi.js";
import { Logger } from "../logger";
import { BaseGame, setEngine } from "./BaseGame";
import { VERSION } from "../.";

export function CreateGame(
  conf: Partial<ApplicationOptions>
): Promise<BaseGame> {
  return new Promise((resolve, reject) => {
    import("./BaseGame")
      .then(({ BaseGame }) => {
        const game = new BaseGame();
        game
          .init(conf)
          .then(() => {
            setEngine(game);
            const consoleDebug =
              typeof conf.debug === "boolean"
                ? conf.debug
                : conf.debug?.console ?? false;
            const pixiExtensionDebug =
              typeof conf.debug === "boolean"
                ? conf.debug
                : conf.debug?.pixiExtension ?? false;
            if (consoleDebug) {
              Logger.enable();
            } else {
              Logger.disable();
            }
            if (pixiExtensionDebug) {
              (globalThis as any).__PIXI_APP__ = game;
              (globalThis as any).game = game;
            }

            Logger.info("Game engine version:", VERSION);
            resolve(game);
          })
          .catch((error) => {
            reject(error);
          });
      })
      .catch((error) => {
        reject(error);
      });
  });
}
