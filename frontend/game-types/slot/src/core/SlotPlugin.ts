/* eslint-disable @typescript-eslint/no-unused-vars */
import { Engine, Logger } from "game-engine";
import { ApplicationOptions, ExtensionMetadata, ExtensionType } from "pixi.js";
import { ActorRef, createActor } from "xstate";
import { GameOptions, IGameUI, IMachine } from "../interfaces";
import { HttpServer } from "./HttpServer";
import { GameEvent, GameMachineType, slotGameLogic } from "./GameStates";
import { String2Ref } from "game-engine/src/utils";

// Define default request adapter function
const defaultRequestAdapterFn = (params: { path: string; payload?: any }) => {
  // Default behavior: log and pass through.
  Logger.log("[SlotPlugin] DefaultRequestAdapter: Adapting request:", params);
  return params;
};

// Define default response adapter function
// The type for currentContext would ideally be GameContext for more complex default logic.
const defaultResponseAdapterFn = (rawResponse: any) => {
  return {
    nextGameState: rawResponse, // This should conform to GameContext structure or be null
    rawGameState: rawResponse,
  };
};

export class SlotPlugin {
  /** @ignore */
  public static extension: ExtensionMetadata = ExtensionType.Application;

  /**
   * Initialize the plugin with scope of application instance
   */
  public static init(opt: Partial<ApplicationOptions>): void {
    const app = this as unknown as Engine.BaseGame;
    let appCheattool: WindowProxy | null = null;
    const keyUpFn = (e: KeyboardEvent) => {
      if (e.shiftKey && e.code === "KeyX") {
        app.slot.openCheatTool();
      }
    };
    document.addEventListener("keyup", keyUpFn);
    const beforeUnloadEvent = () => {
      window.removeEventListener("beforeunload", beforeUnloadEvent);
      app.slot.destroy();
    };
    window.addEventListener("beforeunload", beforeUnloadEvent);
    app.slot = {
      server: new HttpServer(opt.server),
      machine: {} as IMachine as any,
      ui: {} as IGameUI,
      actor: {} as ActorRef<GameMachineType, any, GameEvent>,
      currency: null as unknown as Intl.NumberFormat,
      boot: (options: GameOptions) => {
        return new Promise<void>((resolve, reject) => {
          try {
            // ---> Initialize the slot currency formatter <---
            app.slot.currency = new Intl.NumberFormat(
              app.locale.getCurrentLang() || "en",
              {
                style: "currency" /*, notation: "compact"*/,
                currency: app.slot.server.provider.currency || "EUR",
                currencyDisplay: "narrowSymbol",
              }
            );
            // ---> Initialize the slot machine <---
            const createSlotMachine: Promise<IMachine> = new Promise(
              (resolve, reject) => {
                try {
                  Logger.log("Slot machine booting...", this);
                  if (!options || !options.machine) {
                    throw new Error("Slot machine options are required");
                  }
                  let machineClass: any = options.machine.className;

                  if (typeof machineClass === "string") {
                    machineClass = String2Ref(
                      options.machine.className as string
                    );
                  }
                  if (!machineClass) {
                    throw new Error(
                      `Machine class not found: ${options.machine.className}`
                    );
                  }

                  const machine = new machineClass(options.machine.options);
                  if (!machine) {
                    throw new Error(
                      `Machine class must be an instance of Machine: ${options.machine.className}`
                    );
                  }
                  resolve(machine);
                } catch (error) {
                  Logger.error("Error creating slot machine:", error);
                  reject(error);
                }
              }
            );

            // ---> Initialize the slot ui <---
            const createSlotUI: Promise<IGameUI> = new Promise(
              (resolve, reject) => {
                try {
                  Logger.log("Slot ui booting...", this);
                  if (!options || !options.ui) {
                    throw new Error("Slot ui options are required");
                  }
                  let uiClass: any = options.ui.className;

                  if (typeof uiClass === "string") {
                    uiClass = String2Ref(options.ui.className as string);
                  }
                  if (!uiClass) {
                    throw new Error(
                      `UI class not found: ${options.ui.className}`
                    );
                  }

                  const uiClassName = options.ui.className || "UI";
                  const uiOptions = options.ui.options || {};
                  const uiVisual = options.ui.visual || {};

                  if (
                    uiClass.loadFonts &&
                    typeof uiClass.loadFonts === "function"
                  ) {
                    // Load custom fonts if the UI class has a loadFonts method
                    uiClass
                      .loadFonts()
                      .then(() => {
                        Logger.log("Fonts loaded successfully.");
                        if (
                          uiClass.checkFontsLoaded &&
                          typeof uiClass.checkFontsLoaded === "function"
                        ) {
                          uiClass.checkFontsLoaded();
                        }
                        const ui = new uiClass(uiOptions, uiVisual);
                        if (!ui) {
                          throw new Error(
                            `UI class must be an instance of UI: ${uiClassName}`
                          );
                        }

                        resolve(ui);
                      })
                      .catch((error: Error) => {
                        Logger.error("Error loading fonts:", error);
                      });
                  } else {
                    const ui = new uiClass(uiOptions, uiVisual);
                    if (!ui) {
                      throw new Error(
                        `UI class must be an instance of UI: ${uiClassName}`
                      );
                    }
                    resolve(ui);
                  }
                } catch (error) {
                  Logger.error("Error creating slot UI:", error);
                  reject(error);
                }
              }
            );

            Promise.all([createSlotMachine, createSlotUI]).then(
              ([machine, ui]) => {
                app.slot.machine = machine;
                app.slot.ui = ui;

                if (!machine.parent && app.navigation.currentScreen) {
                  app.navigation.currentScreen.addChild(app.slot.machine);
                }

                if (!ui.parent && app.navigation.currentScreen) {
                  app.navigation.currentScreen.addChild(app.slot.ui);
                }

                // ---> Prepare the slot game logic <---
                const customGameLogic = options.provideConf
                  ? slotGameLogic.provide(options.provideConf)
                  : slotGameLogic;
                const customGameLogicOptions = {
                  input: {
                    game: app,
                    server: app.slot.server, // Cast to IServer
                    machine: app.slot.machine,
                    ui: app.slot.ui, // Cast to IGameUI
                    features: options.features || {},
                    rules: options.rules || {},
                    // Provide the default adapter functions defined in this plugin
                    requestAdapterFn:
                      options.requestAdapterFn || defaultRequestAdapterFn,
                    responseAdapterFn:
                      options.responseAdapterFn || defaultResponseAdapterFn,
                  },
                };
                // Create the actor with
                app.slot.actor = createActor(
                  customGameLogic,
                  customGameLogicOptions
                );
                app.slot.actor.subscribe((state: any) => {
                  //console.log("SLOT GAME STATE:", state);
                });
                app.slot.actor.start();

                resolve();
              }
            );
          } catch (error) {
            Logger.error("Error during slot boot:", error);
            reject(error);
          }
        });
      },
      openCheatTool: () => {
        if (app.options?.debug) {
          if (appCheattool && !appCheattool.closed) {
            // If the cheat tool is already open, close it
            appCheattool.close();
          }
          // Placeholder for opening a cheat tool
          Logger.log("Opening cheat tool...");
          // Implement the logic to open the cheat tool here
          const baseUrl = `https://cdn.${app.slot.server.domain}/ct/${app.slot.server.provider.gameId}/index.html`;
          const url = `${baseUrl}?id=${encodeURIComponent(
            app.slot.server.provider.gameId
          )}&token=${encodeURIComponent(app.slot.server.sessionId)}`;
          appCheattool = window.open(url, "_blank");
        }
      },
      destroy: () => {
        // Placeholder for destroying the slot plugin
        Logger.log("Destroying SlotPlugin...");
        if (appCheattool && !appCheattool.closed) {
          // If the cheat tool is already open, close it
          appCheattool.close();
        }
        document.removeEventListener("keyup", keyUpFn);
        app.slot.server.destroy();
        app.slot.machine.destroy();
        app.slot.actor.stop();
        app.slot.actor = {} as ActorRef<GameMachineType, any, GameEvent>;
        if (app.canvas && app.canvas.parentNode) {
          app.canvas.parentNode.removeChild(app.canvas);
        }
        app.destroy(); // Call the destroy method of the base game
      },
    };
  }

  /**
   * Clean up the ticker, scoped to application
   */
  public static destroy(): void {
    const app = this as unknown as Engine.BaseGame;
    app.slot = null as unknown as Engine.BaseGame["slot"];
  }
}
