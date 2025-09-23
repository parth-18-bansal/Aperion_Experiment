import { Engine, Logger } from "game-engine";
import { ApplicationOptions, extensions } from "pixi.js";
import { SlotPlugin } from "./SlotPlugin";
import { VERSION } from "../.";
extensions.add(SlotPlugin);

export async function CreateSlotGame(
  conf: Partial<ApplicationOptions>
): Promise<Engine.BaseGame> {
  return new Promise((resolve, reject) => {
    Engine.CreateGame(conf)
      .then((game: Engine.BaseGame) => {
        Logger.info("Slot version:", VERSION);

        // Resolve with the created game instance
        resolve(game);
      })
      .catch((error) => {
        // Reject with any errors that occur during game creation
        reject(error);
      });
  });
}
