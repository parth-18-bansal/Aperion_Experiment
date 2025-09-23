import { ActorRef } from "xstate";
import { HttpServer, Machine, GameMachineType } from "./src";
import {
  ServerOptions,
  GameOptions,
  IGameUI,
  IMachine,
} from "./src/interfaces";

declare module "pixi.js" {
  interface ApplicationOptions extends PixiAppOptions {
    server: ServerOptions;
  }
}
declare module "game-engine" {
  namespace Engine {
    interface BaseGame extends import("pixi.js").Application {
      slot: {
        server: HttpServer;
        machine: IMachine;
        actor: ActorRef<GameMachineType>;
        ui: IGameUI;
        currency: Intl.NumberFormat;
        boot: (options: GameOptions) => Promise<void>;
        openCheatTool: () => void;
        destroy: () => void;
      };
    }
  }
}
