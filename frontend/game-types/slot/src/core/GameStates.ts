import { Engine, Logger } from "game-engine";
import { assign, fromPromise, setup, StateFrom } from "xstate";
import {
  AutoplaySettings,
  GameSpeedMode,
  IMachine,
  IServer,
  RequestAdapterFn,
  ResponseAdapterFn,
  ServerData,
  FeatureList,
  GameContext,
  GameMode,
  GameRules,
  IGameUI,
  WinRunnerData,
  CascadeRunnerData,
} from "../interfaces";
import { MachineEvent } from "../events";

// Actions
// Guards
const hasBigWin = ({ context }: { context: GameContext }) => {
  return (context.bigWins || []).length > 0;
};
const hasWin = ({ context }: { context: GameContext }) => {
  // Check if win exists (by amount or win details)
  return Boolean(context.wins && context.wins.length > 0);
};
const shouldStopAutoplay = ({ context }: { context: GameContext }) => {
  if (isAutoplayDisabled({ context })) {
    return true; // Autoplay is disabled by rules
  }
  const winLimitReached =
    context.autoplayWinLimit !== null &&
    (context.autoplayTotalWin ?? 0) >= (context.autoplayWinLimit ?? 0);
  const lossLimitReached =
    context.autoplayLossLimit !== null &&
    (context.initialAutoplayCredits ?? 0) - (context.credits ?? 0) >=
      (context.autoplayLossLimit ?? 0);
  const countReached = (context.autoplayCount ?? 0) <= 0;
  const stopOnFeatureTriggered = shouldStopOnFeature({ context });
  // Stop autoplay if any limit or condition is met
  return (
    (context.isAutoplayActive ?? false) &&
    (winLimitReached ||
      lossLimitReached ||
      countReached ||
      stopOnFeatureTriggered)
  );
};
const isAutoplayActiveAndLimitsOk = ({ context }: { context: GameContext }) => {
  // Check if autoplay is active and limits are met
  return (
    (context.isAutoplayActive ?? false) && !shouldStopAutoplay({ context })
  );
};
const shouldStopOnFeature = ({ context }: { context: GameContext }) => {
  // Stop autoplay if feature is triggered in special mode
  return (
    (context.isAutoplayActive ?? false) &&
    (context.autoplaySettings?.stopOnFeature ?? false) &&
    (context.isNonBaseGameActive ?? false)
  );
};
const isAutoplayDisabled = ({ context }: { context: GameContext }) => {
  // Check if autoplay is disabled by rules
  return context.rules?.disableAutoplay ?? false;
};
const isBuyFeatureAvailable = ({ context }: { context: GameContext }) => {
  // Check if buy feature is available
  return (
    !context.rules?.disableBuyFeature &&
    canSpin({ context }) &&
    (context.ui?.availableBuyFeatures?.length ?? 0) > 0
  );
};
const isFreeRoundsPackageActive = ({ context }: { context: GameContext }) => {
  return (
    context.activeFreeRoundPackage !== null &&
    (context.activeFreeRoundPackage?.roundCount ?? 0) > 0
  );
};
const canSpin = ({ context }: { context: GameContext }) => {
  const isBlocked = context.isSpinBlocked;
  const isAutoplayActive = context.isAutoplayActive;
  const hasPopup = context.popup !== null;
  //const hasWins = (context.wins || []).length > 0;

  return !isBlocked && !isAutoplayActive && !hasPopup /*&& !hasWins*/;
};

// Event types
export type GameEvent =
  | { type: "UI_SPIN_TRIGGERED" }
  | { type: "UI_START_AUTOPLAY_TRIGGERED"; settings: AutoplaySettings }
  | { type: "UI_STOP_AUTOPLAY_TRIGGERED" }
  | { type: "AUTOPLAY_CANCELED" }
  | { type: "GAME_START_NEXT_AUTOPLAY" }
  | { type: "UI_SKIP_WIN_PRESENTATION_TRIGGERED" }
  | {
      type: "UI_BET_CHANGED";
      betAmount: number;
      betLine: number;
      betLevel: number;
      coinValue: number;
    }
  | {
      type: "UI_SET_BET_VALUES";
      betAmount: number;
      betLine: number;
      betLevel: number;
      coinValue: number;
    }
  | { type: "UI_SPEED_MODE_CHANGED"; mode: GameSpeedMode }
  | { type: "UI_SKIP_SWITCH_CHANGED"; enabled: boolean }
  | { type: "GAME_FREE_SPIN_INTRO_CLOSED" }
  | { type: "GAME_FREE_SPIN_OUTRO_CLOSED" }
  | { type: "ERROR"; message: string }
  | { type: "RESOLVE_ERROR" }
  | { type: "RESET_TO_PREVIOUS_STATE" }
  | { type: "MACHINE_SPIN_STARTED" }
  | { type: "MACHINE_REEL_STOPPED"; reelIndex: number }
  | { type: "MACHINE_ALL_REELS_STOPPED"; landingSymbols?: string[][] }
  | { type: "MACHINE_WIN_PROCESSING_COMPLETE" }
  | { type: "GAME_PLAY_FREE_SPIN_MULTIPLIER_COMPLETE" }
  | {
      type: "MACHINE_ERROR";
      reelIndex?: number;
      phase?: string;
      message?: string;
    }
  | {
      type: "MACHINE_WIN_CURRENT_START";
      data: WinRunnerData | CascadeRunnerData;
      state: Engine.RunnerState;
    }
  | { type: "MACHINE_BIG_WIN_COMPLETE" }
  | { type: "MACHINE_NUDGE_COMPLETE" }
  | { type: "UI_FORCE_STOP_TRIGGERED" }
  | { type: "UI_BUY_FEATURE_BUTTON_CLICKED" }
  | { type: "UI_BUY_FEATURE_OPTION_SELECTED"; featureId: string }
  | { type: "UI_BUY_FEATURE_CONFIRMED"; featureId: string }
  | {
      type: "UI_BET_HISTORY_FETCH";
      path: string;
      onDone: (data: any) => void;
      onError: (data: any) => void;
    }
  | {
      type: "UI_BET_TOP_WINS_HISTORY_FETCH";
      path: string;
      onDone: (data: any) => void;
      onError: (data: any) => void;
    }
  | { type: "UI_BUY_FEATURE_CANCELLED" }
  | { type: "EXTRA_FREE_SPIN_ANIMATION_COMPLETE" }
  | { type: "UI_START_FREE_ROUNDS_PACKAGE"; packageId: string }
  | { type: "UI_DEFER_FREE_ROUNDS_PACKAGE" }
  | { type: "FREE_ROUNDS_INTRO_CLOSED" }
  | { type: "FREE_ROUNDS_OUTRO_CLOSED" }
  | { type: "RESTART_REPLAY_ROUND" };

// State machine setup
export const slotGameLogic = setup({
  types: {
    context: {} as GameContext,
    events: {} as GameEvent,
    input: {} as {
      game: Engine.BaseGame;
      machine: IMachine;
      ui: IGameUI;
      server: IServer;
      requestAdapterFn?: RequestAdapterFn;
      responseAdapterFn?: ResponseAdapterFn;
      rules?: GameRules;
      features?: FeatureList;
    },
  },
  actors: {
    sendRequest: fromPromise(
      async ({
        input, // This 'input' comes from the invoke call, e.g. { path: 'spin', payload: { betLevel: 1, coinValue:1 } }
      }: {
        input: { path: string; payload?: any; context: GameContext }; // context is the current machine context
      }) => {
        const startTime = performance.now(); // Start timing

        Logger.log("sendRequest: Original params:", input);
        const { context } = input; // Extract context from input

        // Define inline defaults for adapter functions, similar to initial context setup
        const defaultReqAdapter: RequestAdapterFn = (params) => params;
        const defaultRespAdapter: ResponseAdapterFn = (rawResp) => ({
          nextGameState: rawResp as ServerData | null,
          rawGameState: rawResp,
        });

        const reqAdapterToUse = context.requestAdapterFn || defaultReqAdapter;
        const respAdapterToUse =
          context.responseAdapterFn || defaultRespAdapter;

        const adaptedRequestParams = reqAdapterToUse({
          path: input.path,
          payload: input.payload,
        });
        Logger.log(
          "sendRequest: Adapted request params:",
          adaptedRequestParams
        );

        if (!context.server) {
          Logger.error(
            "sendRequest: Server instance is not available in context."
          );
          throw new Error("Server instance is not available.");
        }

        const rawResponse = await context.server.request<any>({
          path: adaptedRequestParams.path,
          payload: adaptedRequestParams.payload,
        });

        const endTime = performance.now(); // End timing
        const ping = Math.round(endTime - startTime); // Calculate ping in milliseconds

        Logger.log("sendRequest: Raw server response:", rawResponse);
        Logger.log(`sendRequest: Response time: ${ping}ms`);

        const { nextGameState, rawGameState } = respAdapterToUse(rawResponse);
        Logger.log(
          "sendRequest: Adapted response - nextGameState:",
          nextGameState
        );
        Logger.log(
          "sendRequest: Adapted response - rawGameState:",
          rawGameState
        );

        context.game?.registry.set("ping", ping); // Store ping in game registry
        context.game?.registry.set("nextGameState", nextGameState); // Store current game state in registry
        context.game?.registry.set("rawGameState", rawGameState); // Store raw game state in registry
        // Actor resolves with the necessary data for assignment including ping
        return { nextGameState, rawGameState, ping };
      }
    ),
  },
  actions: {
    // Custom actions
    customMachineSpinStarted: () => {},
    customMachineReelStopped: () => {},
    customMachineAllReelsStopped: () => {},
    customFreeSpinIntroClosed: () => {},
    customFreeSpinOutroClosed: () => {},
    customShowLoadingScreen: () => {},
    // Called when a request is taking longer than threshold
    customShowRequestLoading: () => {
      const loadingBar = document.getElementById("loadingBar");
      if (loadingBar) {
        loadingBar.classList.remove("invisible");
      }
    },
    // Called when the slow request finishes (hide overlay)
    customHideRequestLoading: () => {
      const loadingBar = document.getElementById("loadingBar");
      if (loadingBar) {
        loadingBar.classList.add("invisible");
      }
    },
    customInitialStateCheck: () => {},
    customPlayFreeSpinMultiplier: () => {},
    customWinCurrentStart: () => {},
    customBigWinProcessingComplete: () => {},
    customEvaluateSpinResult: () => {},
    customSkipWinPresentation: () => {},
    customStopWinPresentation: () => {},
    customExtraFreeSpinAnimation: () => {},
    customFreeSpinIntro: () => {},
    customFreeSpinOutro: () => {},
    customFreeSpinPlaying: () => {},
    // Stop the machine immediately on error during spinning
    forceStopMachine: ({ context }) => {
      try {
        context.machine.provideStopData({
          reelStopDelay: 0,
          landingSymbols: context.reels || [],
        });
      } catch (e) {
        Logger.error("Failed to force stop machine", e);
      }
    },
    sendOtherRequest: ({ event, context }) => {
      if (
        event.type === "UI_BET_HISTORY_FETCH" ||
        event.type === "UI_BET_TOP_WINS_HISTORY_FETCH"
      ) {
        const path = event.path || "history";
        const onDone = event.onDone || (() => {});
        const onError = event.onError || (() => {});

        if (context.server) {
          context.server
            .request({
              path: path,
              payload: {},
            })
            .then(onDone)
            .catch((error) => {
              // Note: Implement error handling with popup system
              Logger.error("Request failed:", error);
              // onDone([]);
              onError(JSON.stringify({ error: error.code || "Unknown error" }));
            });
        }
      }
    },
    setSlotMachine: assign(({ context, self }) => {
      // Setup event listeners
      if (context.machine) {
        context.machine.events.removeAllListeners();

        context.machine.events.on(MachineEvent.MACHINE_REEL_STOPPED, (reel) => {
          self.send({
            type: "MACHINE_REEL_STOPPED",
            reelIndex: reel?.reelIndex,
          });
        });

        context.machine.events.on(
          MachineEvent.MACHINE_ALL_REELS_STOPPED,
          (_machine, landingSymbols) => {
            self.send({
              type: "MACHINE_ALL_REELS_STOPPED",
              landingSymbols: landingSymbols,
            });
          }
        );

        if (context.finalReels && context.finalReels.length > 0) {
          context.machine.refresh(context.finalReels);
        }
      }

      return {
        isSpinning: false,
        isWaitingForStopData: false,
        isForceStopped: false,
        reelsExpectedToStop: 0,
      };
    }),
    setSlotUI: ({ context }) => {
      if (context.ui) {
        context.ui.initialize(context.game.slot.actor, {
          availableBuyFeatures: context.ui.availableBuyFeatures || [],
          bets: {
            betLevels: context.betLevels || [],
            coinValues: context.coinValues || [],
            betWayValues: context.betWayValues || [context.betLine || 1],
            betLine: context.betLine || 1,
            betAmount: context.betAmount || 1,
            betAmounts: context.betAmounts || [],
          },
          credits: context.credits || 0,
          currencyCode: context.server.provider.currency || "USD",
          language: context.game.locale.getCurrentLang() || "en",
          autoplayValues: context.rules?.autoplayValues || [
            0,
            10,
            20,
            30,
            40,
            50,
            60,
            70,
            80,
            90,
            100,
            500,
            1000,
            Number.MAX_SAFE_INTEGER,
          ],
        });
      }
    },
    startAutoplaySpin: ({ context }) => {
      Logger.log(
        `Starting autoplay spin. Remaining: ${context.autoplayCount ?? 0}`
      );
      if (context.isNonBaseGameActive ?? false) {
        Logger.log("Autoplay spin not triggered in special mode.");
        return;
      }
      // Delay logic is now handled by 'after' in autoplay state
    },
    stopAutoplay: assign(() => ({
      isAutoplayActive: false,
      isAutoplayStopped: true,
      autoplayCount: 0,
      autoplayTotalWin: 0,
      autoplayWinLimit: null,
      autoplayLossLimit: null,
      initialAutoplayCredits: 0,
      autoplaySettings: null,
      isNonBaseGameActive: false,
      isSpinBlocked: false, // Unblock spin when autoplay stops
      isWinRunning: false, // NEW: Reset win processing when autoplay stops
    })),
    // Machine communication actions - sadece gerekli olanlar
    sendSpinToMachine: ({ context, self }) => {
      if (!context.machine) {
        Logger.error("Machine instance is not available in context.");
        return;
      }
      if (context.deferMachineSpin) {
        Logger.log("Deferred spin: skipping immediate machine start");
        return;
      }
      context.machine.spinMachine({
        reelSpinDelay: context.gameSpeed !== "normal" ? 0 : undefined,
      });
      self.send({ type: "MACHINE_SPIN_STARTED" });
    },
    maybeStartDeferredSpin: ({ context, self }) => {
      if (!context.deferMachineSpin) return;
      if (!context.machine) return;
      Logger.log("Starting deferred machine spin after server response");
      context.machine.spinMachine({
        reelSpinDelay: context.gameSpeed !== "normal" ? 0 : undefined,
      });
      self.send({ type: "MACHINE_SPIN_STARTED" });
    },
    sendStopDataToMachine: assign(({ context }) => {
      const minimumDuration = context.rules?.minimumSpinDuration ?? 0;
      const forceMinimumDuration =
        context.rules?.forceMinimumSpinDuration ?? true;
      const ping = context.ping ?? 0;
      const shouldApplyDelay =
        forceMinimumDuration ||
        context.gameSpeed === "normal" ||
        !context.isForceStopped;
      const delay = shouldApplyDelay ? Math.max(0, minimumDuration - ping) : 0;

      Logger.log(
        `Delaying stop data by ${delay}ms (minimumDuration: ${minimumDuration}ms, ping: ${ping}ms, forceMinimumDuration: ${forceMinimumDuration})`
      );

      const timeout = setTimeout(() => {
        // Server cevabı geldi ve machine'e gönderildi, şimdi force stop kontrolü yap
        if (context.isForceStopped) {
          Logger.log("Executing delayed force stop after server response");
          context.machine.forceStop();
        }
        if (context.machine) {
          context.machine.provideStopData({
            reelStopDelay: context.gameSpeed !== "normal" ? 0 : undefined,
            landingSymbols: context.nextGameState?.reels || [],
          });
        }
      }, delay);

      if (context.timeouts?.minimumDuration) {
        clearTimeout(context.timeouts.minimumDuration); // Clear previous timeout if exists
      }

      return {
        timeouts: {
          ...context.timeouts,
          minimumDuration: timeout, // Store the timeout reference
        },
      };
    }),
    // Send wins to machine for processing
    startWinShow: ({ context, self }) => {
      Logger.log("Starting win show with runner...");

      if (
        !context.features?.["win"] ||
        !context.wins ||
        context.wins.length === 0
      ) {
        Logger.warn("No wins to process");
        self.send({ type: "MACHINE_WIN_PROCESSING_COMPLETE" });
        return;
      }

      // Create big win runner instance
      const winRunner = Engine.Runner.Create(context.features["win"]);
      if (winRunner && typeof winRunner.initialize === "function") {
        winRunner.events.onCurrentStart = (data: any) => {
          self.send({
            type: "MACHINE_WIN_CURRENT_START",
            data,
            state: winRunner.getState(),
          });
        };
        winRunner.events.onFinish = (datas: any[], state: any) => {
          Logger.log("Win runner finished", { datas, state });
          self.send({ type: "MACHINE_WIN_PROCESSING_COMPLETE" });
        };

        // Initialize and start the runner
        try {
          winRunner.initialize(context.wins);
        } catch (error) {
          Logger.error("Failed to initialize win runner", error);
          self.send({ type: "MACHINE_WIN_PROCESSING_COMPLETE" });
        }
      } else {
        Logger.warn("Win feature not available");
        self.send({ type: "MACHINE_WIN_PROCESSING_COMPLETE" });
      }
    },
    startBigWinShow: ({ context, self }) => {
      Logger.log("Starting big win show with runner...");

      if (
        !context.features?.["bigWin"] ||
        !context.bigWins ||
        context.bigWins.length === 0
      ) {
        Logger.warn("No big wins to process");
        self.send({ type: "MACHINE_BIG_WIN_COMPLETE" });
        return;
      }

      // Create big win runner instance
      const bigWinRunner = Engine.Runner.Create(context.features["bigWin"]);
      if (bigWinRunner && typeof bigWinRunner.initialize === "function") {
        bigWinRunner.events.onFinish = (datas: any[], state: any) => {
          Logger.log("Big win runner finished", { datas, state });
          self.send({ type: "MACHINE_BIG_WIN_COMPLETE" });
        };

        // Initialize and start the runner
        try {
          bigWinRunner.initialize(context.bigWins);
        } catch (error) {
          Logger.error("Failed to initialize big win runner", error);
          self.send({ type: "MACHINE_BIG_WIN_COMPLETE" });
        }
      } else {
        Logger.warn("Big win feature not available");
        self.send({ type: "MACHINE_BIG_WIN_COMPLETE" });
      }
    },
    showFreeSpinIntro: ({ context, self }) => {
      Logger.log("Showing free spin intro...");
      if (!context.features?.["freeSpinIntro"]) {
        Logger.warn("Free spin intro feature not available");
        self.send({ type: "GAME_FREE_SPIN_INTRO_CLOSED" });
        return;
      }

      const freeSpinIntroRunner = Engine.Runner.Create(
        context.features["freeSpinIntro"]
      );

      if (
        freeSpinIntroRunner &&
        typeof freeSpinIntroRunner.initialize === "function"
      ) {
        freeSpinIntroRunner.events.onInteraction = (
          type: string,
          data: any
        ) => {
          Logger.log("Free spin intro interaction:", type, data);
          if (type === "close") {
            Logger.log("Free spin intro closed by user");
            self.send({ type: "GAME_FREE_SPIN_INTRO_CLOSED" });
          }
        };
        freeSpinIntroRunner.events.onFinish = () => {
          Logger.log("Free spin intro finished");
          self.send({ type: "GAME_FREE_SPIN_INTRO_CLOSED" });
        };
        try {
          freeSpinIntroRunner.initialize([
            { totalFreeSpin: context.freeSpins || 0 },
          ]);
        } catch (error) {
          Logger.error("Failed to initialize free spin intro runner", error);
          self.send({ type: "GAME_FREE_SPIN_INTRO_CLOSED" });
        }
      } else {
        Logger.warn("Free spin intro feature not available");
        self.send({ type: "GAME_FREE_SPIN_INTRO_CLOSED" });
      }
    },
    showFreeSpinOutro: ({ context, self }) => {
      Logger.log("Showing free spin outro...");
      if (!context.features?.["freeSpinOutro"]) {
        Logger.warn("Free spin outro feature not available");
        self.send({ type: "GAME_FREE_SPIN_OUTRO_CLOSED" });
        return;
      }

      const freeSpinOutroRunner = Engine.Runner.Create(
        context.features["freeSpinOutro"]
      );

      if (
        freeSpinOutroRunner &&
        typeof freeSpinOutroRunner.initialize === "function"
      ) {
        freeSpinOutroRunner.events.onInteraction = (
          type: string,
          data: any
        ) => {
          Logger.log("Free spin outro interaction:", type, data);
          if (type === "close") {
            Logger.log("Free spin outro closed by user");
            self.send({ type: "GAME_FREE_SPIN_OUTRO_CLOSED" });
          }
        };
        freeSpinOutroRunner.events.onFinish = () => {
          Logger.log("Free spin outro finished");
          self.send({ type: "GAME_FREE_SPIN_OUTRO_CLOSED" });
        };
        try {
          freeSpinOutroRunner.initialize([
            {
              totalFreeSpin: context.freeSpinsUsed || 0,
              totalWin: context.totalWinAmount || 0,
            },
          ]);
        } catch (error) {
          Logger.error("Failed to initialize free spin outro runner", error);
          self.send({ type: "GAME_FREE_SPIN_OUTRO_CLOSED" });
        }
      } else {
        Logger.warn("Free spin outro feature not available");
        self.send({ type: "GAME_FREE_SPIN_OUTRO_CLOSED" });
      }
    },

    handleMachineReelStopped: assign(({ context }) => {
      const newReelsExpected = Math.max(0, context.reelsExpectedToStop - 1);
      return {
        reelsExpectedToStop: newReelsExpected,
      };
    }),

    handleMachineError: ({ event }) => {
      if (event.type === "MACHINE_ERROR") {
        Logger.error("Machine error:", event.message || "Unknown error");
      }
    },
    updateCurrentWin: ({ event, context }) => {
      if (event.type === "MACHINE_WIN_CURRENT_START") {
        let tickupDuration: number;
        let delayShowWin: number;
        if (context.gameSpeed === "turbo") {
          tickupDuration = context.rules.winTickupDurationTurbo || 0;
          delayShowWin = context.rules.delayShowWinMessageUITurbo || 0;
        } else {
          tickupDuration = context.rules.winTickupDuration || 0;
          delayShowWin = context.rules.delayShowWinMessageUI || 0;
        }

        context.ui?.showCurrentWin?.(
          event.data,
          context.gameMode,
          tickupDuration,
          delayShowWin
        );
      }
    },
  },
  guards: {
    hasBigWin,
    hasWin,
    shouldStopAutoplay,
    isAutoplayActiveAndLimitsOk,
    shouldStopOnFeature,
    isAutoplayDisabled,
    isBuyFeatureAvailable,
    isFreeRoundsPackageActive,
    canSpin,
  },
  delays: {
    autoplayDelay: ({ context }: { context: GameContext }) =>
      context.rules?.autoplayDelay ?? 500,
    winStartDelay: ({ context }: { context: GameContext }) =>
      context.rules?.winStartDelay ?? 500,
    autoSpinStartDelay: 750,
    delayAfterBigWin: ({ context }: { context: GameContext }) =>
      context.rules?.delayAfterBigWin ?? 1000,
    delayAfterFreeSpinIntro: ({ context }: { context: GameContext }) =>
      context.rules?.delayAfterFreeSpinIntro ?? 1000,
    delayAfterFreeSpinOutro: ({ context }: { context: GameContext }) =>
      context.rules?.delayAfterFreeSpinOutro ?? 1000,
    longRequestDelay: ({ context }: { context: GameContext }) =>
      context.rules?.longRequestDelay ?? 5000,
    delayAfterSpinEnd: ({ context }: { context: GameContext }) =>
      context.rules?.delayAfterSpinEnd ?? 250,
    postFreeSpinsDelay: ({ context }: { context: GameContext }) =>
      context.rules?.postFreeSpinsDelay ?? 1000,
  },
}).createMachine({
  id: "slotGame",
  initial: "loading",
  context: ({ input }) => {
    const defaultRequestAdapter: RequestAdapterFn = (params) => params;
    const defaultResponseAdapter: ResponseAdapterFn = (rawResponse) => ({
      nextGameState: rawResponse as ServerData | null,
      rawGameState: rawResponse,
    });

    // Default rules
    const defaultRules: GameRules = {
      disableAutoplay: false,
      disableBuyFeature: false,
      autoplayDelay: 500, // 0.5 second default delay between autoplay spins
      minimumSpinDuration: 1000, // 1 seconds minimum spin duration
      forceMinimumSpinDuration: true, // Whether to enforce minimum spin duration even if server response is fast
      winStartDelay: 500, // 1 second default delay before starting win presentation
      delayAfterBigWin: 1000, // 1 second default delay after big win completion
      delayAfterFreeSpinIntro: 1000, // 1 second default delay after free spin intro completion
      delayAfterFreeSpinOutro: 1000, // 1 second default delay after free spin outro completion
      delayShowWinMessageUI: 0, // 0 second default delay to show winning amounts in win area
      delayShowWinMessageUITurbo: 0, // 0.75 second default delay to show winning amounts in win area in turbo mode
      winTickupDuration: 0.75, // 0.15 second default duration to show counting of wins
      winTickupDurationTurbo: 0.15, // 0.75 second default duration to show counting of wins in turbo
      longRequestDelay: 800, // Show request loading if response takes longer than this
      delayAfterSpinEnd: 250, // Pause after each spin before continuing
    };

    // Merge user rules with defaults
    const mergedRules: GameRules = {
      ...defaultRules,
      ...input.rules,
    };

    return {
      game: input.game,
      server: input.server,
      machine: input.machine,
      ui: input.ui,
      requestAdapterFn: input.requestAdapterFn || defaultRequestAdapter,
      responseAdapterFn: input.responseAdapterFn || defaultResponseAdapter,
      rules: mergedRules,
      features: input.features || {}, // Optional features

      // default context properties
      currentAction: "spin",
      nextAction: "spin",
      prevCredits: 0,
      credits: 0,
      betAmount: 1,
      betLine: 1,
      betLevel: 10,
      coinValue: 5,
      roundWinAmount: 0,
      totalWinAmount: 0,
      freeSpins: 0,
      freeSpinsUsed: 0,
      freeSpinMultiplier: 1,
      freeSpinExtra: 0, // NEW: Extra free spins to animate
      reels: [],
      finalReels: [],
      wins: [],
      nudges: [],
      bigWins: [],

      error: null,
      popup: null,
      timeouts: {}, // Store timeouts for later cleanup
      nextGameState: null,
      rawGameState: null,
      savedGameData: null,
      stateBeforeAction: null,
      stateBeforePopup: null,

      // autoplay properties
      autoplayCount: 0,
      autoplayTotalWin: 0,
      autoplayWinLimit: null,
      autoplayLossLimit: null,
      isAutoplayActive: false,
      isAutoplayStopped: false,
      initialAutoplayCredits: 0,
      autoplaySettings: null,

      // other properties
      gameSpeed: "normal" as GameSpeedMode,
      isNonBaseGameActive: false,
      isSpinBlocked: false, // Initialize spin blocking flag
      isBigWinRunning: false, // Initialize big win processing flag
      isWinRunning: false, // Initialize win processing flag
      isNudgeRunning: false, // NEW: Initialize nudge flag
      deferMachineSpin: false, // If true, wait for server response before starting reels
      ping: 0,
      isSpinning: false, // Initialize spinning flag
      isForceStopped: false, // Initialize force stop flag
      isWaitingForStopData: false, // Initialize waiting for stop data flag
      reelsExpectedToStop: 0, // Initialize expected reels to stop
      featureId: "",
      skipSwitch: false,

      // ui properties
      gameMode: "spin" as GameMode, // Initialize with normal spin mode
      gameplayMode: input.server.provider.gameplayMode || "fun", // Default to 'fun' gameplay mode

      // Free Rounds Package özellikleri
      availableFreeRoundPackages: [],
      activeFreeRoundPackage: null,
      freeRoundRejected: false,
      oldBetAmount: 0,
      replayRoundPackage: null,
    };
  },
  states: {
    loading: {
      tags: ["loading"],
      entry: "customShowLoadingScreen",
      invoke: [
        {
          id: "initSlotGame",
          src: "sendRequest",
          input: ({ context }) => ({
            context,
            path: "initialGameState",
          }),
          onError: {
            target: "error",
            actions: assign({
              error: ({ event }: any) => `${event.error?.message}`,
            }),
          },
          onDone: {
            target: "initialStateCheck",
            actions: [
              assign(({ event }) => {
                // First action: assign to context
                const { nextGameState, rawGameState, ping } = event.output;
                const gameStateToSpread = nextGameState || {};
                return {
                  ...gameStateToSpread,
                  currentAction: "init",
                  rawGameState: rawGameState,
                  nextGameState,
                  savedGameData: nextGameState,
                  ping: ping,
                };
              }),
              "setSlotMachine",
              "setSlotUI",
            ],
          },
        },
      ],
    },
    initialStateCheck: {
      tags: ["loading"],
      entry: "customInitialStateCheck",
      always: [
        {
          target: "freeSpins.playing",
          guard: ({ context }) =>
            context.savedGameData !== null &&
            (context.savedGameData?.freeSpins ?? 0) > 0 && context.gameplayMode !== "replay",
          actions: assign(({ context }) => ({
            serverGameState: { ...context.savedGameData! },
            savedGameData: null,
            isNonBaseGameActive: true,
            gameMode: "freespin",
          })),
        },
        {
          target: "idle",
          actions: assign({
            savedGameData: null,
            isNonBaseGameActive: false,
            gameMode: "spin",
          }),
        },
      ],
    },
    idle: {
      tags: [
        "spinEnabled",
        "autoplayEnabled",
        "betChangeEnabled",
        "buyFeatureEnabled",
      ],
      always: [
        {
          target: "freeRoundIntro",
          guard: ({ context }) =>
            !context.freeRoundRejected &&
            (context.availableFreeRoundPackages?.length ?? 0) > 0 &&
            context.popup === null &&
            !context.activeFreeRoundPackage, // Sadece aktif package yokken
          actions: assign(({ context }) => ({
            popup: {
              type: "freeRoundIntro",
              data: {
                packages: context.availableFreeRoundPackages, // Tüm packages'ları gönder
              },
            },
          })),
        },
        {
          target: "autoplay",
          guard: ({ context }) =>
            isAutoplayActiveAndLimitsOk({ context }) &&
            !context.isAutoplayStopped,
          actions: assign({
            stateBeforeAction: null,
            isNonBaseGameActive: false,
            gameMode: "spin", // Reset to normal spin mode
            isSpinBlocked: false, // Unblock spin for autoplay
          }),
        },
        {
          target: "autoplay",
          guard: ({ context }) =>
            isAutoplayActiveAndLimitsOk({ context }) &&
            context.isAutoplayStopped,
          actions: assign({
            isAutoplayActive: false,
            stateBeforeAction: null,
            isNonBaseGameActive: false,
            gameMode: "spin", // Reset to normal spin mode
            isSpinBlocked: false, // Unblock spin for autoplay
          }),
        },
      ],
      on: {
        UI_BET_CHANGED: {
          actions: [
            // Önce kontrol et, sonra ya güncelle ya da geri set et
            ({ self, context, event }) => {
              // Sadece geçerli durumlarda bet değişikliğine izin ver
              // Diğer durumlarda mevcut değerleri geri gönder
              if (context.isAutoplayActive || !canSpin({ context })) {
                // Geri gönderme işlemi
                self.send({
                  type: "UI_SET_BET_VALUES",
                  betAmount: event.betAmount ?? 1,
                  betLine: event.betLine,
                  betLevel: event.betLevel ?? 10,
                  coinValue: event.coinValue ?? 5,
                });
              }
            },
            // Geçerli durumlarda bet değerlerini güncelle
            assign(({ context, event }) => {
              // Sadece geçerli durumlarda güncelle
              if (!context.isAutoplayActive && canSpin({ context })) {
                return {
                  betAmount: event.betAmount,
                  betLevel: event.betLevel,
                  coinValue: event.coinValue,
                };
              }
              return {}; // Hiçbir şey değiştirme
            }),
          ],
        },
        UI_SPIN_TRIGGERED: {
          target: "spinning",
          actions: assign(({ context }) => {
            const isFreeRound = isFreeRoundsPackageActive({ context });
            const hasCredits =
              (context.credits ?? 0) >= (context.betAmount ?? 0);
            const shouldDefer =
              !isFreeRound && context.featureId === "" && !hasCredits;
            return {
              stateBeforeAction: { ...context },
              roundWinAmount: 0,
              wins: [],
              isNonBaseGameActive: false,
              gameMode: "spin", // Reset to normal spin mode
              nextGameState: null, // Clear previous game state
              rawGameState: null, // Clear previous raw state
              deferMachineSpin: shouldDefer,
            };
          }),
          // Allow request even if credits are insufficient; machine spin may be deferred
          guard: ({ context }) => canSpin({ context }),
        },
        UI_START_AUTOPLAY_TRIGGERED: {
          target: "autoplay",
          actions: assign(({ context, event }) => {
            
            const isFreeRound = isFreeRoundsPackageActive({ context });
            const hasCredits =
              (context.credits ?? 0) >= (context.betAmount ?? 0);
            const shouldDefer = !isFreeRound && context.featureId === "" && !hasCredits;
              return {
              autoplayCount: event.settings.count,
              autoplayWinLimit: event.settings.winLimit,
              autoplayLossLimit: event.settings.lossLimit,
              isAutoplayActive: true,
              isAutoplayStopped: false,
              initialAutoplayCredits: context.credits ?? 0,
              autoplayTotalWin: 0,
              autoplaySettings: event.settings,
              isNonBaseGameActive: false,
              gameMode: "spin", // Reset to normal spin mode
              deferMachineSpin: shouldDefer,
            }
          }),
          guard: ({ context }) => {
            return canSpin({ context }) && !isAutoplayDisabled({ context }) ;
          },
        },
        UI_BUY_FEATURE_BUTTON_CLICKED: {
          actions: assign(() => ({
            popup: {
              type: "buyFeatureMenu",
              data: {},
            },
          })),
          guard: "isBuyFeatureAvailable",
        },
        UI_BUY_FEATURE_OPTION_SELECTED: {
          actions: assign(({ context, event }) => {
            const selectedFeature = context.ui?.availableBuyFeatures?.find(
              (feature) => feature.id === event.featureId
            );
            if (selectedFeature) {
              const calculatedPrice =
                selectedFeature.basePrice * (context.betAmount ?? 1);
              return {
                popup: {
                  type: "buyFeatureConfirmation",
                  data: {
                    feature: selectedFeature,
                    price: calculatedPrice,
                  },
                },
              };
            }
            return {};
          }),
        },
        UI_BUY_FEATURE_CONFIRMED: {
          target: "spinning",
          actions: assign(({ context, event }) => {
            const selectedFeature = context.ui?.availableBuyFeatures?.find(
              (feature) => feature.id === event.featureId
            );
            const calculatedPrice = selectedFeature
              ? selectedFeature.basePrice * (context.betAmount ?? 1)
              : 0;

            return {
              stateBeforeAction: { ...context },
              popup: null,
              credits: (context.credits ?? 0) - calculatedPrice,
              gameMode: "spin",
              featureId: selectedFeature?.id,
              isNonBaseGameActive: false,
              nextGameState: null,
              rawGameState: null,
            };
          }),
          guard: ({ context, event }) => {
            const selectedFeature = context.ui?.availableBuyFeatures?.find(
              (feature) => feature.id === event.featureId
            );
            const calculatedPrice = selectedFeature
              ? selectedFeature.basePrice * (context.betAmount ?? 1)
              : 0;
            return (context.credits ?? 0) >= calculatedPrice;
          },
        },
        UI_BUY_FEATURE_CANCELLED: {
          actions: assign(() => ({
            popup: null,
          })),
        },
      },
    },
    autoplay: {
      tags: ["autoplayActive"],
      after: {
        autoplayDelay: {
          target: "autoplay",
          actions: ({ context, self }) => {
            if (context.isAutoplayActive) {
              if ((context.autoplayCount ?? 0) > 0) {
                self.send({ type: "GAME_START_NEXT_AUTOPLAY" });
              } else {
                self.send({ type: "AUTOPLAY_CANCELED" });
              }
            } else {
              self.send({ type: "AUTOPLAY_CANCELED" });
            }
          },
          guard: ({ context }) => !shouldStopAutoplay({ context }),
        },
      },
      always: [
        {
          target: "idle",
          guard: "shouldStopAutoplay",
          actions: "stopAutoplay",
        },
      ],
      on: {
        GAME_START_NEXT_AUTOPLAY: {
          target: "spinning",
          actions: assign(({ context }) => {
            
            const isFreeRound = isFreeRoundsPackageActive({ context });
            const hasCredits =
              (context.credits ?? 0) >= (context.betAmount ?? 0);
            const shouldDefer = !isFreeRound && context.featureId === "" && !hasCredits;
            return {
              stateBeforeAction: { ...context },
              autoplayCount: (context.autoplayCount ?? 0) - 1,
              roundWinAmount: 0,
              totalWinAmount: 0,
              wins: [],
              isNonBaseGameActive: false,
              gameMode: "spin", // Reset to normal spin mode
              nextGameState: null, // Clear previous game state
              rawGameState: null, // Clear previous raw state
              deferMachineSpin: shouldDefer,
            };
          })
        },
      },
    },
    spinning: {
      tags: ["forceStopEnabled"],
      entry: [
        "sendSpinToMachine",
        assign(({ context }) => {
          const isFreeRound = isFreeRoundsPackageActive({ context });
          const shouldDefer = context.deferMachineSpin ?? false;
          return {
            credits:
              shouldDefer ||
              isFreeRound ||
              context.featureId !== "" ||
              context.gameMode === "freespin"
                ? context.credits
                : Math.max(
                    0,
                    (context.credits ?? 0) - (context.betAmount ?? 0)
                  ), // Deduct only when not deferring
            isSpinning: shouldDefer ? false : true, // Only mark spinning when reels actually start
            isForceStopped: false, // Reset force stop state
            isWaitingForStopData: true, // Set to true while waiting for stop data
            isSpinBlocked: true,
          };
        }),
      ],
      after: {
        longRequestDelay: {
          actions: "customShowRequestLoading",
          guard: ({ context }) => context.isWaitingForStopData === true,
        },
      },
      invoke: {
        id: "spinRequest",
        src: "sendRequest",
        input: ({ context }) => ({
          context,
          path:
            context.featureId !== "" ? "bonusBuy" : context.gameMode || "spin", // Use bonusBuy for buy feature, otherwise use gameMode
          payload: {
            amount: context.betAmount ?? 0,
            isFreeRound: isFreeRoundsPackageActive({ context }),
            bonusId: context.activeFreeRoundPackage?.id ?? null, // Use active package ID if available
            betLevel: context.betLevel ?? 1, // Default to 1 if not set
            coinValue: context.coinValue ?? 1, // Default to 5 if not set
          },
        }),
        onDone: {
          actions: [
            "customHideRequestLoading",
            assign(({ event, context }) => {
              const { nextGameState, rawGameState, ping } = event.output;
              return {
                rawGameState,
                nextGameState,
                featureId: "",
                isForceStopped:
                  context.gameSpeed === "turbo" ? true : context.isForceStopped,
                roundWinAmount: nextGameState?.roundWinAmount || 0,
                totalWinAmount: nextGameState?.totalWinAmount || 0,
                isWaitingForStopData: false, // Reset after receiving data
                reelsExpectedToStop: nextGameState?.reels?.length || 0, // Reset expected reels to stop
                ping: ping,
              };
            }),
            "maybeStartDeferredSpin",
            "sendStopDataToMachine",
          ],
        },
        onError: {
          target: "error",
          actions: [
            "customHideRequestLoading",
            "forceStopMachine",
            assign(({ context, event }: any) => {
              return {
                ...(context.stateBeforeAction || {}),
                error: `${event.error?.message}`,
                isSpinning: false,
                isWaitingForStopData: false,
                isSpinBlocked: false,
                isForceStopped: false,
                deferMachineSpin: false,
                nextGameState: null,
                rawGameState: null,
              } as Partial<GameContext> as any;
            }),
          ],
        },
      },
      on: {
        UI_FORCE_STOP_TRIGGERED: {
          actions: assign(({ context }) => {
            const forceMinimumDuration =
              context.rules?.forceMinimumSpinDuration ?? true;
            const shouldStop =
              context.isSpinning &&
              !context.isWaitingForStopData &&
              !forceMinimumDuration;
            if (context.machine && shouldStop) {
              context.machine.forceStop();
              if (context.timeouts?.minimumDuration) {
                clearTimeout(context.timeouts.minimumDuration); // Clear any existing timeout
                context.machine.provideStopData({
                  reelStopDelay: context.gameSpeed !== "normal" ? 0 : undefined,
                  landingSymbols: context.nextGameState?.reels || [],
                });

                return {
                  isForceStopped: true,
                  timeouts: {
                    ...context.timeouts,
                    minimumDuration: null,
                  },
                };
              }
            }
            return {
              isForceStopped: true,
            };
          }),
          guard: ({ context }) => !context.isForceStopped, // Only allow force stop if not already in that state
        },
        MACHINE_SPIN_STARTED: {
          actions: [
            "customMachineSpinStarted",
            assign(() => ({
              isSpinning: true,
              deferMachineSpin: false,
            })),
          ],
        },
        MACHINE_REEL_STOPPED: {
          actions: ["handleMachineReelStopped", "customMachineReelStopped"],
        },
        MACHINE_ALL_REELS_STOPPED: {
          target: "evaluatingSpin",
          actions: [
            "customHideRequestLoading",
            assign(({ context }) => {
              const newWins = context.nextGameState?.wins;
              const newBigWins = context.nextGameState?.bigWins || [];
              const newFreeSpins = context.nextGameState?.freeSpins;

              return {
                isSpinning: false, // Reset spinning state
                wins: newWins,
                freeSpins: newFreeSpins,
                freeSpinsUsed: context.freeSpinsUsed || 0,
                bigWins: newBigWins,
                freeSpinMultiplier:
                  context.nextGameState?.freeSpinMultiplier || 1,
                freeSpinExtra: context.nextGameState?.freeSpinExtra || 0,
                roundWinAmount: context.nextGameState?.roundWinAmount, // CRITICAL: Assign round win amount!
                totalWinAmount: context.nextGameState?.totalWinAmount,
                // Reset for new spin result
                // CRITICAL: Don't reset isSpinBlocked here!
              };
            }),
            "customMachineAllReelsStopped",
          ],
        },
        MACHINE_ERROR: {
          target: "error",
          actions: [
            "handleMachineError",
            assign({
              error: ({ event }) => event.message || "Machine error occurred",
            }),
          ],
        },
      },
      exit: "customHideRequestLoading",
    },
    evaluatingSpin: {
      tags: ["evaluating"],
      entry: [
        "customEvaluateSpinResult",
        assign(() => {
          return { isSpinBlocked: true };
        }), // Block spin during evaluation
      ],

      always: [
        // SIMPLIFIED FLOW: wins → bigWin (standard slot flow)
        {
          target: "winPresentation",
          guard: "hasWin",
        },
        {
          target: "bigWin",
          guard: "hasBigWin",
        },
        {
          target: "extraFreeSpinAnimation",
          guard: ({ context }: { context: GameContext }) =>
            (context.freeSpinExtra ?? 0) > 0 && context.gameMode === "freespin",
        },
        { target: "postWinEvaluation" },
      ],
    },
    winPresentation: {
      tags: ["winPresenting", "skipWinEnabled"],
      entry: [
        assign(() => {
          return {
            isSpinBlocked: true, // Block spin during win presentation
            isWinRunning: true, // Mark win processing as active
          };
        }),
      ],
      after: {
        winStartDelay: {
          actions: ["startWinShow"],
        },
      },
      on: {
        MACHINE_WIN_PROCESSING_COMPLETE: [
          {
            target: "playFreeSpinMultiplier",
            guard: ({ context }: { context: GameContext }) =>
              (context.freeSpinMultiplier ?? 1) > 1 &&
              (context.roundWinAmount ?? 0) > 0 &&
              context.gameMode === "freespin",
            actions: assign(() => ({ wins: [], isWinRunning: false })),
          },
          {
            target: "extraFreeSpinAnimation",
            guard: ({ context }: { context: GameContext }) =>
              (context.freeSpinExtra ?? 0) > 0 &&
              context.gameMode === "freespin",
            actions: assign(() => ({ wins: [], isWinRunning: false })),
          },
          {
            target: "postWinEvaluation",
            actions: assign(() => ({ wins: [], isWinRunning: false })),
          },
        ],
        UI_SKIP_WIN_PRESENTATION_TRIGGERED: {
          target: "postWinEvaluation",
          actions: [
            "customSkipWinPresentation",
            assign(() => {
              return {
                wins: [], // Clear wins after skipping
                isWinRunning: false,
              }; // Reset win processing flag
            }),
          ],
        },
      },
      exit: ["customStopWinPresentation"],
    },
    postWinEvaluation: {
      tags: ["evaluating"],
      entry: assign(({ context }) => {
        const coinValue = context.coinValue ?? 1;
        const betLevel = context.betLevel ?? 1;

        return {
          ...(context.nextGameState || {}),
          betLevel,
          coinValue,
          wins: [], // Clear wins after evaluation
          isWinRunning: false, // Reset win processing flag
          isBigWinRunning: false, // Reset big win processing flag
          isSpinBlocked: true, // Keep blocked until final decision
        };
      }),
      after: {
        // Pause after each spin before next step
        delayAfterSpinEnd: [
          // Single frame delay
          {
            target: "bigWin",
            guard: "hasBigWin",
          },
          {
            target: "freeSpins.showingIntro",
            guard: ({ context }) =>
              (context.currentAction === "spin" ||
                context.currentAction === "bonusBuy") &&
              context.nextAction === "freespin" &&
              (context.freeSpins ?? 0) > 0,
            actions: assign({
              gameMode: "freespin" as GameMode,
              isNonBaseGameActive: true,
            }),
          },
          {
            target: "freeSpins.playing",
            guard: ({ context }) =>
              context.gameMode === "freespin" && (context.freeSpins ?? 0) > 0,
          },
          {
            target: "freeSpins.showingOutro",
            guard: ({ context }) =>
              context.currentAction === "freespin" &&
              context.nextAction === "spin" &&
              context.gameMode === "freespin" &&
              (context.freeSpins ?? 0) <= 0,
            actions: assign({
              freeSpins: 0,
              gameMode: "spin" as GameMode,
            }),
          },
          {
            target: "freeRoundOutro",
            guard: ({ context }) =>
              context.activeFreeRoundPackage !== null &&
              (context.activeFreeRoundPackage?.roundCount ?? 0) === 0 &&
              context.nextAction === "spin",
          },
          {
            target: "replayPopup",
            guard: ({ context }) =>
              context.replayRoundPackage !== null &&
              context.replayRoundPackage?.isReplayModeCompleted === true &&
              context.nextAction === "spin",
          },
          {
            target: "idle",
            guard: ({ context }) => {
              // FIXED: More robust idle check - since wins are already cleared in entry,
              // we just need to ensure other processing flags are false
              const isWinRunning = context.isWinRunning ?? false;
              const isNudgeRunning = context.isNudgeRunning ?? false;
              const isBigWinRunning = context.isBigWinRunning ?? false;
              const hasWins = (context.wins || []).length > 0;

              // Don't check hasWin here since wins are already cleared in entry
              const canGoToIdle =
                !isWinRunning &&
                !isNudgeRunning &&
                !isBigWinRunning &&
                !hasWins;

              return Boolean(canGoToIdle);
            },
            actions: assign(() => {
              return {
                wins: [], // Ensure wins are cleared
                stateBeforeAction: null,
                isSpinBlocked: false, // CRITICAL: Unblock spinning
                isNonBaseGameActive: false,
                gameMode: "spin" as GameMode,
                isWinRunning: false, // Ensure win processing is reset
                isBigWinRunning: false, // Reset big win processing
                isNudgeRunning: false, // Reset nudge processing,
                //isAutoplayStopped: false,
                //isAutoplayActive: false, // Reset autoplay state
              };
            }),
          },
        ],
      },
    },
    playFreeSpinMultiplier: {
      entry: "customPlayFreeSpinMultiplier",
      on: {
        GAME_PLAY_FREE_SPIN_MULTIPLIER_COMPLETE: [
          {
            target: "extraFreeSpinAnimation",
            guard: ({ context }: { context: GameContext }) =>
              (context.freeSpinExtra ?? 0) > 0 &&
              context.gameMode === "freespin",
            actions: assign(() => ({ freeSpinMultiplier: 1 })),
          },
          {
            target: "postWinEvaluation",
            actions: assign(() => ({ freeSpinMultiplier: 1 })),
          },
        ],
      },
    },
    extraFreeSpinAnimation: {
      entry: ["customExtraFreeSpinAnimation"], // User should implement animation in this action
      on: {
        EXTRA_FREE_SPIN_ANIMATION_COMPLETE: {
          target: "postWinEvaluation",
          actions: assign(({ context }) => ({
            freeSpins: (context.freeSpins ?? 0) + (context.freeSpinExtra ?? 0),
            freeSpinExtra: 0,
          })),
        },
      },
    },
    freeSpins: {
      tags: ["freeSpins"],
      initial: "showingIntro",
      states: {
        showingIntro: {
          tags: ["freeSpinIntro", "popup"],
          entry: [
            assign(({ context }) => ({
              stateBeforeAction: { ...context },
              isNonBaseGameActive: true,
              gameMode: "freespin" as GameMode, // Set to free spin mode
            })),
            "showFreeSpinIntro",
            "customFreeSpinIntro",
          ],
          on: {
            GAME_FREE_SPIN_INTRO_CLOSED: {
              target: "introComplete",
              actions: ["customFreeSpinIntroClosed", assign({ popup: null })],
            },
          },
        },
        introComplete: {
          tags: ["freeSpinIntroComplete"],
          after: {
            delayAfterFreeSpinIntro: {
              target: "playing",
            },
          },
        },
        playing: {
          tags: ["freeSpinPlaying"],
          entry: "customFreeSpinPlaying",
          always: [
            {
              target: "#slotGame.spinning",
              guard: ({ context }) => (context.freeSpins ?? 0) > 0,
              actions: assign(({ context }) => ({
                stateBeforeAction: { ...context },
                freeSpins: (context.freeSpins ?? 0) - 1,
                nextGameState: null, // Clear previous game state
                rawGameState: null, // Clear previous raw state
              })),
            },
            {
              target: "showingOutro",
              guard: ({ context }) => (context.freeSpins ?? 0) <= 0,
            },
          ],
        },
        showingOutro: {
          tags: ["freeSpinOutro", "popup"],
          entry: ["showFreeSpinOutro", "customFreeSpinOutro"],
          on: {
            GAME_FREE_SPIN_OUTRO_CLOSED: {
              target: "outroComplete",
              actions: ["customFreeSpinOutroClosed", assign({ popup: null })],
            },
          },
        },
        outroComplete: {
          tags: ["freeSpinOutroComplete"],
          after: {
            delayAfterFreeSpinOutro: {
              target: "#slotGame.postFreeSpinsEvaluation",
            },
          },
        },
      },
    },
    postFreeSpinsEvaluation: {
      tags: ["evaluating"],
      entry: assign(({ context }) => ({
        autoplayTotalWin:
          context.isAutoplayActive ?? false
            ? (context.autoplayTotalWin ?? 0) + (context.roundWinAmount ?? 0)
            : context.autoplayTotalWin ?? 0,
      })),
      after: {
        postFreeSpinsDelay: [
          {
            target: "freeRoundOutro",
            guard: ({ context }) =>
              context.activeFreeRoundPackage !== null &&
              (context.activeFreeRoundPackage?.roundCount ?? 0) === 0 &&
              context.nextAction === "spin",
          },
          // If autoplay is still active and we're not configured to stop on feature,
          // resume autoplay immediately after free spins without passing through idle.
          {
            target: "autoplay",
            guard: ({ context }) =>
              isAutoplayActiveAndLimitsOk({ context }) &&
              !shouldStopOnFeature({ context }),
            actions: assign({
              stateBeforeAction: null,
              isNonBaseGameActive: false,
              gameMode: "spin" as GameMode,
              isSpinBlocked: false,
            }),
          },
          {
            target: "replayPopup",
            guard: ({ context }) =>
              context.replayRoundPackage !== null &&
              context.replayRoundPackage?.isReplayModeCompleted === true &&
              context.nextAction === "spin",
          },
          {
            target: "idle",
            guard: ({ context }) =>
              isAutoplayActiveAndLimitsOk({ context }) &&
              shouldStopOnFeature({ context }),
            actions: assign(({ context }) => ({
              ...context.nextGameState,
              stateBeforeAction: null,
              isNonBaseGameActive: false,
              gameMode: "spin", // Reset to normal spin mode
              isSpinBlocked: false, // Unblock spin when going to idle
            })),
          },
          {
            target: "idle",
            actions: assign(({ context }) => ({
              ...context.nextGameState,
              stateBeforeAction: null,
              isNonBaseGameActive: false,
              gameMode: "spin", // Reset to normal spin mode
              isSpinBlocked: false, // Unblock spin when going to idle
            })),
          },
        ],
      },
    },
    bigWin: {
      tags: ["bigWin", "skipBigWinEnabled"],
      entry: [
        "startBigWinShow", // NEW: Send to machine processor first
        assign(() => ({
          isNonBaseGameActive: true,
          isBigWinRunning: true, // Mark big win processing as active
        })),
      ],
      on: {
        MACHINE_BIG_WIN_COMPLETE: {
          target: "bigWinComplete",
          actions: "customBigWinProcessingComplete",
        },
      },
      exit: assign({
        popup: null,
        isSpinBlocked: false, // Unblock spin when big win ends
        isBigWinRunning: false, // Reset win processing flag
      }),
    },
    bigWinComplete: {
      tags: ["bigWinComplete"],
      after: {
        delayAfterBigWin: {
          target: "postWinEvaluation",
        },
      },
    },
    freeRoundIntro: {
      tags: ["popup"],
      // Popup artık entry action'da değil, transition'larda set ediliyor
      on: {
        UI_START_FREE_ROUNDS_PACKAGE: {
          // User popup'tan bir package seçtiğinde
          actions: assign(({ context, event }) => {
            const selectedPackage = context.availableFreeRoundPackages?.find(
              (pkg) => pkg.id === event.packageId
            );
            return {
              activeFreeRoundPackage: selectedPackage || null,
              oldBetAmount: context.betAmount, // Store old bet amount for later
              popup: {
                type: "freeRoundIntro",
                data: {
                  package: selectedPackage, // Seçilen package'ı confirmation için gönder
                },
              },
            };
          }),
        },
        UI_DEFER_FREE_ROUNDS_PACKAGE: {
          target: "idle",
          actions: assign(() => ({
            popup: null,
            freeRoundRejected: true,
          })),
        },
        FREE_ROUNDS_INTRO_CLOSED: [
          {
            target: "spinning",
            guard: ({ context }) =>
              context.activeFreeRoundPackage?.isBonus === true,
            actions: assign(({ context }) => ({
              popup: null,
              featureId: "buyFeature",
              betAmount:
                context.activeFreeRoundPackage?.betValue ?? context.betAmount,
            })),
          },
          {
            target: "idle",
            actions: assign(({ context }) => ({
              popup: null,
              betAmount:
                context.activeFreeRoundPackage?.betValue ?? context.betAmount,
            })),
          },
        ],
      },
    },
    freeRoundOutro: {
      tags: ["popup"],
      entry: assign(({ context }) => ({
        popup: {
          type: "freeRoundOutro",
          data: {
            package: context.activeFreeRoundPackage,
          },
        },
      })),
      on: {
        FREE_ROUNDS_OUTRO_CLOSED: {
          target: "idle",
          actions: assign(({ context }) => ({
            popup: null,
            betAmount: context.oldBetAmount || 10,
            activeFreeRoundPackage: null,
            isSpinBlocked: false,
          })),
        },
      },
    },
    replayPopup: {
      tags: ["replayPopup"],
      entry: assign(() => ({
        popup: {
          type: "replayPopup",
          data: "",
        },
      })),
      on: {
        RESTART_REPLAY_ROUND: {
          target: "spinning",
          actions: assign({
            popup: null,
          }),
        },
      },
    },
    error: {
      tags: ["error"],
      entry: [
        "stopAutoplay",
        assign(({ context }) => {
          const err = context.error;
          let errObj: any = null;
          if (typeof err === "string") {
            try {
              errObj = JSON.parse(err); // valid JSON from API
            } catch {
              // covers HTML (404 page), "Failed to fetch", etc.
              errObj = {
                error: {
                  code: "server",
                  message: "api_error",
                },
              };
            }
          }

          if ((err as any) instanceof Error) {
             errObj = {
                error: {
                  code: "server",
                  message: "api_error",
                },
              };
          }

          return {
            popup: { type: "error", data: errObj },
          };
        }),
      ],
      on: {
        RESOLVE_ERROR: {
          target: "idle",
          actions: assign({
            error: null,
            popup: null,
            stateBeforeAction: null,
            isAutoplayActive: false,
            isNonBaseGameActive: false,
            gameMode: "spin" as GameMode, // Reset to normal spin mode
            autoplaySettings: null,
            stateBeforePopup: null,
            // Don't reset server values like totalWinAmount, roundWinAmount
          }),
        },
        RESET_TO_PREVIOUS_STATE: {
          target: "idle",
          actions: assign(({ context }) => ({
            ...(context.stateBeforeAction || {}),
            error: null,
            popup: null,
            stateBeforeAction: null,
            isAutoplayActive: false,
            isAutoplayStopped: false,
            isNonBaseGameActive: false,
            autoplaySettings: null,
            stateBeforePopup: null,
            // Don't reset server values like totalWinAmount, roundWinAmount
          })),
          guard: ({ context }) => context.stateBeforeAction !== null,
        },
      },
    },
  },
  on: {
    MACHINE_WIN_CURRENT_START: {
      actions: ["customWinCurrentStart", "updateCurrentWin"],
    },
    UI_SPEED_MODE_CHANGED: {
      actions: [
        assign(({ context, event }) => {
          context.game.registry.set("gameSpeed", event.mode);
          return {
            gameSpeed: event.mode,
          };
        }),
      ],
    },
    UI_SKIP_SWITCH_CHANGED: {
      actions: [
        assign(({ context, event }) => {
          context.game.registry.set("skipSwitch", event.enabled);
          return {
            skipSwitch: event.enabled,
          };
        }),
      ],
    },
    UI_SET_BET_VALUES: {
      actions: assign(({ event }) => ({
        betAmount: event.betAmount,
        betLine: event.betLine,
        betLevel: event.betLevel,
        coinValue: event.coinValue,
      })),
    },
    UI_STOP_AUTOPLAY_TRIGGERED: {
      //target: ".idle",
      actions: "stopAutoplay",
      guard: ({ context }) =>
        context.isAutoplayActive && !context.isAutoplayStopped,
    },
    AUTOPLAY_CANCELED: {
      target: ".idle",
      actions: [
        "stopAutoplay",
        assign(() => {
          return {
            isAutoplayActive: false,
            isAutoplayStopped: false,
          };
        }),
      ],
    },
    UI_BET_HISTORY_FETCH: {
      actions: "sendOtherRequest",
    },
    UI_BET_TOP_WINS_HISTORY_FETCH: {
      actions: "sendOtherRequest",
    },
    // Global nudge completion handler
    /*MACHINE_NUDGE_COMPLETE: {
      actions: assign(() => {
        return {
          isNudgeRunning: false, // NEW: Reset nudge flag
        };
      }),
    },*/

    ERROR: {
      target: ".error",
      actions: assign({
        error: ({ event }) => event.message,
        isAutoplayActive: false,
        autoplaySettings: null,
      }),
    },
  },
});

// Export types for type-safe configuration
export type GameMachineType = StateFrom<typeof slotGameLogic>;
export type GameLogicType = typeof slotGameLogic;
