import { Spine } from "@esotericsoftware/spine-pixi-v8";
import { Engine } from "game-engine";
import type { Ticker } from "pixi.js";
import { Assets, Container, isMobile, RenderLayer, Text } from "pixi.js";
import { Slot } from "slot-game-engine";
import { UI } from "slot-game-ui";
import { BackgroundMobileScreen } from "./BackgroundMobileScreen";
import { BackgroundScreen } from "./BackgroundScreen";
import { FreeSpinIntroScreen } from "./FreeSpinIntroScreen";
import { BigwinScreen } from "./BigwinScreen";
import { AnubisCharacter } from "../components/AnubisCharacter";
import { ReelFrameContainer } from "../components/ReelFrameContainer";
import { FreeSpinOutroScreen } from "./FreeSpinOutroScreen";
import { MultiplierFeature } from "../components/MultiplierFeature";
import { TumbleWinContainer } from "../components/TumbleWinContainer";
import { ActorRef } from "xstate";
import { SymbolWinLabels } from "../components/SymbolWinLabels";
import { FreeSpinExtra } from "../components/FreeSpinExtra";
import { BuyFeatureButton } from "../components/BuyFeatureButton";
import { BuyFeatureConfirmation } from "../components/BuyFeatureConfirmation";
import { SoundManager } from "../components/SoundManager";
import { isPortrait } from "game-engine/src/utils";
import { VERSION } from "../main";

/** The screen that holds the app */
export class MainScreen extends Container {
  /** Assets bundles required by this screen */
  public static assetBundles = ["main", "ui"];
  private slotMachine!: Container;
  private reelFrame!: ReelFrameContainer;
  private bigWinScreen!: BigwinScreen;
  private freeSpinIntro!: FreeSpinIntroScreen;
  private freeSpinOutro!: FreeSpinOutroScreen;
  private freeSpinExtra!: FreeSpinExtra;
  private multiplierFeature!: MultiplierFeature;
  private symbolWinLabel!: SymbolWinLabels;
  private gameLogo!: Spine;
  private tumbleContainer!: TumbleWinContainer;

  private anubisCharacter!: AnubisCharacter;
  private buyFeatureButton!: BuyFeatureButton;
  private soundManager!: SoundManager;
  private paused = false;

  async create() {
    // Oyun alanı tıklamalarını yakalamak için şeffaf capture katmanı
    const gameClickLayer = this.game.make.graphics({
      label: "GameClickLayer",
    });
    gameClickLayer.rect(-500, -500, this.game.renderer.width + 2500, this.game.renderer.height + 2500);
    gameClickLayer.fill({ color: 0x0, alpha: 0 });
    gameClickLayer.eventMode = "static";
    gameClickLayer.zIndex = -100; // Görselde en arkada
    this.sortableChildren = true;
    gameClickLayer.on("pointerup", () => {
      (this.game.slot.ui as any)?.handleGameCanvasClick?.();
    });

    this.freeSpinExtra = new FreeSpinExtra();
    this.tumbleContainer = new TumbleWinContainer();
    this.multiplierFeature = new MultiplierFeature();
    this.symbolWinLabel = new SymbolWinLabels();
    this.freeSpinIntro = new FreeSpinIntroScreen(gameClickLayer);
    this.freeSpinOutro = new FreeSpinOutroScreen(gameClickLayer);
    this.buyFeatureButton = new BuyFeatureButton();
    this.bigWinScreen = new BigwinScreen();
    this.anubisCharacter = new AnubisCharacter();

    await this.game.slot.boot({
      machine: this.getMachineConfig(),
      ui: this.getUIConfig(),
      rules: {
        minimumSpinDuration: 1000,
        forceMinimumSpinDuration: false,
        winStartDelay: 500,
        delayAfterFreeSpinIntro: 2600,
        delayShowWinMessageUI: 0.3, // This is to sync UI counting (tickup )with tumble win counting animation, as there is a fade-in animation in tumble win before starting the counting
        delayShowWinMessageUITurbo: 0.1,
        winTickupDuration: 0.75,
        winTickupDurationTurbo: 0.15,
        longRequestDelay: 5000,
        delayAfterSpinEnd: 350,
        autoplayDelay: 350,
      },
      //ui,
      requestAdapterFn: Slot.HttpRequestAdapterFn,
      responseAdapterFn: this.normalizeResponse.bind(this),
      provideConf: this.customizeGame(),
      features: this.getFeatures(),
    });

    this.slotMachine = this.game.make.container({
      components: [
        {
          type: Engine.Components.GridPositionComponent,
          params: [
            {
              portrait: {
                columns: 2,
                rows: 2,
                position: { x: -0.92, y: -0.62 },
              },
            },
          ],
        },
        {
          type: Engine.Components.ResizeComponent,
          params: [
            {
              desktop: {
                landscape: { scale: 0.85, x: 525, y: 235 },
              },
              mobile: {
                landscape: { scale: 1, x: 475, y: 172 },
                portrait: { scale: 1 },
              },
              tablet: {
                landscape: { scale: 1, x: 475, y: 172 },
                portrait: { scale: 1.2, x: -53, y: 310},
              },
            },
          ],
        },
      ],
    });

    this.reelFrame = new ReelFrameContainer();
    this.game.slot.machine.scale.set(0.98);
    this.game.slot.machine.position.set(10, 0);
    this.slotMachine.addChild(
      this.reelFrame,
      this.game.slot.machine,
      this.symbolWinLabel
    );
    this.slotMachine.zIndex = -1;

    this.makeGameLogo();
    this.addChild(this.anubisCharacter);

    await this.game.navigation.setBackground(
      isMobile.any ? BackgroundMobileScreen : BackgroundScreen
    );

    const layer = new RenderLayer();
    layer.attach(this.freeSpinIntro.stormSpine);
    layer.attach(this.freeSpinOutro.stormSpine);
    layer.attach(this.bigWinScreen);



    this.addChild(
      gameClickLayer,
      this.slotMachine,
      this.freeSpinExtra,
      this.buyFeatureButton.container,
      this.tumbleContainer,
      this.multiplierFeature,
      this.freeSpinIntro,
      this.freeSpinOutro,
      this.game.slot.ui,
      this.bigWinScreen,
      layer
    );

    if (this.game.options.debug) {
      this.game.make.text(
        {
          text: `Game Version: ${VERSION}`,
          alpha: 0.35,
          anchor: { x: 0.5, y: 0 },
          style: {
            fontSize: 36,
            fill: "#ffffff",
          },
          components: [
            {
              type: Engine.Components.GridPositionComponent,
              params: [
                {
                  landscape: { position: { x: 0, y: -1 } },
                  portrait: { position: { x: -1, y: -1 } },
                },
              ],
            },
          ],
        },
        this
      );
    }

    await Assets.loadBundle("sounds");
    // play basegame music
    this.soundManager = new SoundManager();
    const currentState = this.game.slot.actor.getSnapshot();
    if (currentState.context.gameMode === "spin") {
      this.soundManager.playBaseGameMusic();
    } else {
      this.soundManager.playFreeSpinMusic();
    }

    this.tumbleContainer.on("START_LABEL_ANIM", (data, isTurbo) => {
      this.symbolWinLabel.show(data, isTurbo);
      this.soundManager.playSymbolSound(data);
      if (isMobile.any && isPortrait()) this.toggleGameLogoVisibility(false);
    });
    this.tumbleContainer.on("HIDE_LABEL_ANIM", () => {
      this.symbolWinLabel.hide();
    });
    this.bigWinScreen.on("BIG_WIN_INITIATED", (data, isTurbo) => {
      this.soundManager.playBigWinSound(data.winType, isTurbo);
    });
    this.bigWinScreen.on("BIG_WIN_END", (data) => {
      this.soundManager.playBigWinEndSound(data.winType);
    });
  }

  private getMachineConfig(): {
    className: Slot.MachineClassConstructor | string;
    options: Slot.MachineOptions;
  } {
    return {
      className: Slot.Machine as any,
      options: {
        reelConfig: [
          {
            type: "normal",
            count: 5,
            options: {
              direction: "down",
              extraCount: 1,
              useMask: false,
              reelSet: [
                "1",
                "4",
                "3",
                "9",
                "5",
                "6",
                "7",
                "8",
                "3",
                "10",
                "9",
                "8",
                "7",
                "6",
                "5",
                "4",
                "3",
                "2",
                "1",
                "3",
                "5",
                "9",
                "4",
                "2",
                "5",
                "7",
                "3",
              ],
              /*stripeBlur: {
                strenght: 10,
              },*/
            },
          },
        ],
        symbolConfig: this.getSpineSymbolConfig(),
        machineConfig: {
          defaultShuffleReels: true,
          initialSymbols: [],
          useMask: true,
          mask: {
            x: -10,
            y: -8,
            points: [
              0, 0, 460, 0, 495, 15, 520, 15, 555, 0, 1020, 0, 1020, 740, 0,
              740,
            ],
          },
          cellHeight: 185,
          reelSpacing: 0,
          cellWidth: 205,
          visibleCount: 4,
          reelSpinDelay: 0.075,
          reelStopDelay: 0.35,
          defaultSpinParams: {
            duration: 0.25,
            easeInDuration: 0.7,
            easeInType: "back.in(1.2)",
          },
          defaultStopParams: {
            landingSymbols: [],
            stopDuration: 0.5,
            stopEase: "back.out(0.8)",
          },
        },
      },
    };
  }

  private getUIConfig(): {
    className: Slot.GameUIConstructor | string;
    options?: Partial<Slot.InitialUIOptions>;
    visual?: Slot.UIVisualOptions;
  } {
    return {
      className: UI,
      options: {
        availableBuyFeatures: [
          {
            id: "1",
            name: "Buy Free Spins",
            description: "Purchase free spins feature",
            basePrice: 100,
            isAvailable: true,
          },
        ],
      },
      visual: {
        buyFeature: {
          buyFeatureButton: this.buyFeatureButton,
          buyFeatureConfirmation: new BuyFeatureConfirmation(),
          enabled: true,
        },
        symbolTextures: this.getUISymbolConfig(),
      },
    };
  }

  private normalizeResponse(data: any) {
    const { nextGameState, rawGameState } = Slot.HttpResponseAdapterFn(data);
    const orderWinsFn = (
      wins: any[],
      index: number
    ): {
      earn: number;
      subEarns: number[];
      symbol: (string | number)[];
      counts: number[];
      positions: { [reelIndex: string]: { [rowIndex: string]: string } };
    } | null => {
      // order by column
      let orderedWin: any = {
        earn: null,
        symbol: [],
        counts: [],
        positions: {},
        winSymbols: wins[index].wins,
        winnerSymbols: wins[index].winnerSymbols,
      };

      data.symbols =
        rawGameState.cascadeResults.symbols ?? data.cascadeResults[0].symbols;
      for (let index = 0; index < data.symbols.length; index++) {
        // If the all symbols 10 then show BIG WILD
        if (data.symbols[index].every((symbol: any) => symbol === 10)) {
          data.symbols[index] = [15, 14, 13, 12];
        }
      }

      let combinedArray: any[] = [];

      if (wins[index].winnerSymbols) {
        const rowCounter: any = {};
        wins[index].winnerSymbols.forEach((element: any) => {
          combinedArray = combinedArray.concat(element[1]);
        });
        combinedArray.sort((a, b) => a[1] - b[1]);
        combinedArray.forEach((pos) => {
          const [column, row] = pos;

          // Eğer bu sütun için bir rowCounter yoksa, başlat
          if (!rowCounter[column]) {
            rowCounter[column] = 0;
          }

          // Eğer bu sütun için pozisyonlar tanımlanmamışsa, tanımla
          if (!orderedWin.positions[column]) {
            orderedWin.positions[column] = {};
          }
          // rowCounter kullanarak uygun pozisyona yeni sembolü kaydet
          if (!orderedWin.positions[column][row]) {
            orderedWin.positions[column][row] =
              wins[index].newSymbols[column][rowCounter[column]];
            rowCounter[column]++;
          }
        });
        orderedWin.earn = wins[index].winAmount;
        orderedWin.subEarns = wins[index].wins.map((win: any) => win.amount);
        orderedWin.symbol = wins[index].wins.map((win: any) => win.symbol);
      }
      if (Object.keys(orderedWin.positions).length === 0) {
        orderedWin = null;
      }
      return orderedWin;
    };
    const wins = rawGameState.cascadeResults || null;
    const orderedWins = [];
    let findedWins;

    if (wins !== null && Array.isArray(wins) && wins.length > 0) {
      for (let index = 0; index < wins.length; index++) {
        findedWins = orderWinsFn(wins, index);
        if (findedWins !== null) {
          orderedWins.push(findedWins);
        }
      }
    }
    const cascadeDatas: Slot.CascadeRunnerData[] = [];
    orderedWins.forEach((win: any) => {
      const cascadeData: Slot.CascadeRunnerData = {
        amount: win.earn,
        matrix: {},
        finalAmount: data.win.amount,
        subAmounts: win.subEarns,
        symbols: win.symbol,
        animationName: win.animationName || "win-cascade",
        winnerSymbols: win.winnerSymbols,
        waysWins: win.winSymbols,
      };
      for (const rIndex in win.positions) {
        if (Object.prototype.hasOwnProperty.call(win.positions, rIndex)) {
          const reelCascade = win.positions[rIndex];
          const reelIndex = parseInt(rIndex, 10);
          cascadeData.matrix[reelIndex] = {
            extract: Object.keys(reelCascade).map((rowIndex) =>
              parseInt(rowIndex, 10)
            ),
            insert: Object.values(reelCascade),
          };
        }
      }
      cascadeDatas.push(cascadeData);
    });
    const currentReels =
      rawGameState.cascadeResults.symbols ||
      rawGameState.cascadeResults[0].symbols;
    const finalReels =
      rawGameState.cascadeResults.symbols ||
      rawGameState.cascadeResults[0].newSymbols ||
      currentReels;

    const customNextGameState = {
      reels: currentReels.map((reel: any) => {
        return reel.map((symbol: any) => symbol.toString());
      }),
      finalReels: finalReels.map((reel: any) => {
        return reel.map((symbol: any) => symbol.toString());
      }),
      wins: cascadeDatas.length > 0 ? cascadeDatas : [],
      bigWins: [],
      freeSpinMultiplier:
        data.win?.multiplier > 1 && data.win.amount > 0
          ? data.win.multiplier
          : 1,
    };
    if (data.win.type !== null) {
      (customNextGameState.bigWins as Slot.BigWinRunnerData[]).push({
        winType: data.win.type.toUpperCase(),
        amount: data.win.amount,
        duration: data.win.amount * 0.025,
      });
    }
    return {
      nextGameState: {
        ...nextGameState,
        ...customNextGameState,
      },
      rawGameState,
    };
  }

  switchTo(state: Slot.GameMode, context: Slot.GameContext) {
    switch (state) {
      case "spin":
        (this.game.navigation?.background as any).setBackgroundSpine("spin", 0);
        this.reelFrame.setReelFrameSpine("spin", 0);
        this.anubisCharacter.setAnubisCharacter("spin", 0);
        this.multiplierFeature.hide();
        this.freeSpinExtra.hide();
        this.buyFeatureButton.setActiveText?.(false);
        this.buyFeatureButton.setVisible(true);
        this.soundManager?.playBaseGameMusic();
        this.tumbleContainer.toggleVisibility(false);
        this.game.slot.ui.setTurboSwitchVisible(true);
        break;
      case "freespin":
        (this.game.navigation?.background as any).setBackgroundSpine(
          "freespin",
          0
        );
        this.reelFrame.setReelFrameSpine("freespin", 0);
        this.anubisCharacter.setAnubisCharacter("freespin", 0);
        this.multiplierFeature.show();
        this.freeSpinExtra.show(context.freeSpins || 1);
        this.buyFeatureButton.setVisible(false);
        this.soundManager?.playFreeSpinMusic();
        this.game.slot.ui.setTurboSwitchVisible(false);
        this.game.slot.ui?.showFreespinCountStart?.(context.freeSpins || 0);
        // show total win in freespin in case recovering from a previous session too
        context.ui?.setFreespinTotalWin?.(
          { amount: context.totalWinAmount || 0 },
          0,
          "freespin"
        );
        // update multiplier in case recovering from a previous session
        ((context.freeSpinMultiplier || 1) > 1) && this.multiplierFeature.updateWonMultiplierValue(context.freeSpinMultiplier);
        break;
    }
  }

  private customizeGame() {
    return {
      actions: {
        customInitialStateCheck: ({
          context,
          self
        }: {
          context: Slot.GameContext;
          self: ActorRef<Slot.GameMachineType, any, Slot.GameEvent>;
        }) => {
          const isFreeSpin =
            context.savedGameData !== null &&
            (context.savedGameData?.freeSpins ?? 0) > 0;
          // if we are in replay mode, always go to spin mode first
          if (context.gameplayMode === "replay") {
            this.switchTo("spin", context);
            setTimeout(() => {
              self.send({ type: "UI_SPIN_TRIGGERED" });
              context.nextAction === "freespin" && this.buyFeatureButton.setActiveText?.(true);
            }, 1000);
          } else {
            this.switchTo(isFreeSpin ? "freespin" : "spin", context);
          }
        },
        customFreeSpinPlaying: ({ context }: { context: Slot.GameContext }) => {
          this.freeSpinExtra.fsCounter.updateText(
            ((context.freeSpins || 1) - 1).toString()
          );
          this.freeSpinExtra.updateFreeSpinLeftText((context.freeSpins || 1) - 1);
        },
        customMachineSpinStarted: ({ context }: {context: Slot.GameContext}) => {
          this.tumbleContainer.toggleVisibility(false);
          this.toggleGameLogoVisibility(true);
          if (context.gameplayMode === "replay") {
            context.nextAction === "freespin" && this.buyFeatureButton.setActiveText?.(true);
          }
        },
        customMachineReelStopped: ({
          context,
        }: {
          context: Slot.GameContext;
        }) => {
          if (
            (context.roundWinAmount ?? 0) > 0 &&
            context.reelsExpectedToStop === 4
          ) {
            this.anubisCharacter.playAnubisAnimation(
              context.gameMode === "spin"
                ? "Symbol_animation_action"
                : "Symbol_animation_action_v1",
              context.gameSpeed === "turbo" || context.gameSpeed === "quick"
            );
          }
        },
        customMachineAllReelsStopped: ({
          context,
        }: {
          context: Slot.GameContext;
        }) => {
          if ((context.roundWinAmount ?? 0) > 0 && context.isForceStopped) {
            this.anubisCharacter.playAnubisAnimation(
              context.gameMode === "spin"
                ? "Symbol_animation_action"
                : "Symbol_animation_action_v1",
              context.gameSpeed === "turbo" || context.gameSpeed === "quick"
            );
          }
        },
        customWinCurrentStart: ({
          event,
          context,
        }: {
          event: Slot.GameEvent;
          context: Slot.GameContext;
        }) => {
          if (
            event.type === "MACHINE_WIN_CURRENT_START" &&
            event.state.rIndex > 1
          ) {
            this.anubisCharacter.playAnubisAnimation(
              context.gameMode === "spin"
                ? "Symbol_animation_action"
                : "Symbol_animation_action_v1",
              context.gameSpeed === "turbo" || context.gameSpeed === "quick"
            );
          }
        },
        customFreeSpinIntroClosed: ({
          context,
        }: {
          context: Slot.GameContext;
        }) => {
          this.freeSpinIntro.playStormAnimaion();
          this.freeSpinIntro.once("START_ASSET_TRANSITIONS", () => {
            this.switchTo("freespin", context);
          });
        },
        customFreeSpinOutroClosed: ({
          context,
        }: {
          context: Slot.GameContext;
        }) => {
          this.freeSpinOutro.playStormAnimaion();
          this.freeSpinOutro.once("START_ASSET_TRANSITIONS", () => {
            this.switchTo("spin", context);
          });
        },
        customPlayFreeSpinMultiplier: ({
          context,
          self,
        }: {
          context: Slot.GameContext;
          self: ActorRef<Slot.GameMachineType, any, Slot.GameEvent>;
        }) => {
          this.anubisCharacter.playAnubisAnimation(
            "Symbol_animation_action_v2",
            context.gameSpeed === "turbo" || context.gameSpeed === "quick"
          );
          setTimeout(() => {
            this.multiplierFeature.onStartMultiplierSpin(
              context.freeSpinMultiplier || 1
            );
          }, 500);
          this.multiplierFeature.once(
            "START_TUMBLE_MULTIPLIER_ANIMATION",
            () => {
              this.tumbleContainer
                .playTumbleMultiplierAnim(
                  context.freeSpinMultiplier || 1,
                  context.roundWinAmount || 0,
                  this.game.slot.server.response?.win?.type === "Max"
                )
                .then(async () => {
                  context.ui?.setFreespinTotalWin?.(
                    { amount: context.totalWinAmount },
                    0.5,
                    "freespin"
                  );
                  await Engine.Utils.WaitFor(0.5);
                  self.send({
                    type: "GAME_PLAY_FREE_SPIN_MULTIPLIER_COMPLETE",
                  });
                });
            }
          );
        },
        customExtraFreeSpinAnimation: ({
          context,
          self,
        }: {
          context: Slot.GameContext;
          self: ActorRef<Slot.GameMachineType, any, Slot.GameEvent>;
        }) => {
          this.freeSpinExtra.on("FS_COUNT_INCREMENTED", () => {
            this.game.slot.ui?.incrementFreespinCount?.(1);
          });

          this.freeSpinExtra
            .playExtraSpinAnimation(
              context.machine as any,
              context.freeSpinExtra || 0
            )
            .then(async () => {
              this.freeSpinExtra.off("FS_COUNT_INCREMENTED");
              await Engine.Utils.WaitFor(
                context.gameSpeed === "turbo" ? 0.15 : 0.5
              );
              self.send({
                type: "EXTRA_FREE_SPIN_ANIMATION_COMPLETE",
              });
            });
        },
      },
    };
  }

  private getFeatures(): Slot.FeatureList {
    return {
      win: {
        className: Slot.Runners.CascadeRunner,
        visual: this.tumbleContainer,
        options: {
          /*//delayBetweenReels: 0.5,
            sequential: true,*/
          symbolWinAmountLabelsAllowed: true,
          configs: {
            dropDuration: 0.3,
            staggerDelay: 0.04,
            easing: "power1",
          },
        },
      },
      bigWin: {
        className: Engine.Runner,
        visual: this.bigWinScreen,
        options: {
          autoStart: true,
          autoStartDelay: 500,
        },
      },
      freeSpinIntro: {
        className: Engine.Runner,
        visual: this.freeSpinIntro,
        options: {
          autoStart: true,
          autoStartDelay: 500,
        },
      },
      freeSpinOutro: {
        className: Engine.Runner,
        visual: this.freeSpinOutro,
        options: {
          autoStart: true,
          autoStartDelay: 500,
        },
      },
    };
  }

  private getSpineSymbolConfig(): {
    [symbolId: string]: Slot.SymbolOptions;
  } {
    const symbolCovers = Assets.get("textures");
    return {
      "1": {
        visualType: "spine",
        visualOptions: {
          atlas: "symbols.atlas",
          skeleton: "symbols.json",
          skin: "ankh",
          x: 95,
          y: 85,
          scale: 0.85,
          cover: {
            texture: symbolCovers.textures["ankh.png"],
            x: -34,
            y: -4,
            scale: 0.8,
          },
        },
        symName: "ankh",
        description: "ankh symbol",
        payouts: { 1: 1, 2: 2, 3: 3 },
        isWild: false,
        isScatter: false,
        isBonus: false,
        animations: {
          //idle: "idle",
          "win-cascade": "win",
        },
      },
      "2": {
        visualType: "spine",
        visualOptions: {
          atlas: "symbols.atlas",
          skeleton: "symbols.json",
          skin: "pot",
          x: 95,
          y: 85,
          scale: 0.85,
          cover: {
            texture: symbolCovers.textures["pot.png"],
            x: -34,
            y: -14,
            scale: 0.8,
          },
        },
        symName: "pot",
        description: "pot  symbol",
        payouts: { 1: 1, 2: 2, 3: 3 },
        isWild: false,
        isScatter: false,
        isBonus: false,
        animations: {
          //idle: "idle",
          "win-cascade": "win",
        },
      },
      "3": {
        visualType: "spine",
        visualOptions: {
          atlas: "symbols.atlas",
          skeleton: "symbols.json",
          skin: "sheet",
          x: 95,
          y: 85,
          scale: 0.85,
          cover: {
            texture: symbolCovers.textures["sheet.png"],
            x: -34,
            y: -14,
            scale: 0.8,
          },
        },
        symName: "sheet",
        description: "sheet symbol",
        payouts: { 1: 1, 2: 2, 3: 3 },
        isWild: false,
        isScatter: false,
        isBonus: false,
        animations: {
          //idle: "idle",
          "win-cascade": "win",
        },
      },
      "4": {
        visualType: "spine",
        visualOptions: {
          atlas: "symbols.atlas",
          skeleton: "symbols.json",
          skin: "sword",
          x: 95,
          y: 85,
          scale: 0.85,
          cover: {
            texture: symbolCovers.textures["sword.png"],
            x: -34,
            y: -7,
            scale: 0.8,
          },
        },
        symName: "sword",
        description: "sword symbol",
        payouts: { 1: 1, 2: 2, 3: 3 },
        isWild: false,
        isScatter: false,
        isBonus: false,
        animations: {
          //idle: "idle",
          "win-cascade": "win",
        },
      },
      "5": {
        visualType: "spine",
        visualOptions: {
          atlas: "symbols.atlas",
          skeleton: "symbols.json",
          skin: "a",
          x: 90,
          y: 90,
          scale: 0.84,
          cover: {
            texture: symbolCovers.textures["sym-a.png"],
            x: -38,
            y: -11,
            scale: 0.8,
          },
        },
        symName: "a",
        description: "a symbol",
        payouts: { 1: 1, 2: 2, 3: 3 },
        isWild: false,
        isScatter: false,
        isBonus: false,
        animations: {
          //idle: "idle",
          "win-cascade": "win",
        },
      },
      "6": {
        visualType: "spine",
        visualOptions: {
          atlas: "symbols.atlas",
          skeleton: "symbols.json",
          skin: "k",
          x: 90,
          y: 90,
          scale: 0.84,
          cover: {
            texture: symbolCovers.textures["sym-k.png"],
            x: -37,
            y: -15,
            scale: 0.8,
          },
        },
        symName: "k",
        description: "k symbol",
        payouts: { 1: 1, 2: 2, 3: 3 },
        isWild: false,
        isScatter: false,
        isBonus: false,
        animations: {
          //idle: "idle",
          "win-cascade": "win",
        },
      },
      "7": {
        visualType: "spine",
        visualOptions: {
          atlas: "symbols.atlas",
          skeleton: "symbols.json",
          skin: "q",
          x: 90,
          y: 90,
          scale: 0.84,
          cover: {
            texture: symbolCovers.textures["sym-q.png"],
            x: -39,
            y: -13,
            scale: 0.8,
          },
        },
        symName: "q",
        description: "q symbol",
        payouts: { 1: 1, 2: 2, 3: 3 },
        isWild: false,
        isScatter: false,
        isBonus: false,
        animations: {
          //idle: "idle",
          "win-cascade": "win",
        },
      },
      "8": {
        visualType: "spine",
        visualOptions: {
          atlas: "symbols.atlas",
          skeleton: "symbols.json",
          skin: "j",
          x: 90,
          y: 90,
          scale: 0.84,
          cover: {
            texture: symbolCovers.textures["sym-j.png"],
            x: -35,
            y: -13,
            scale: 0.8,
          },
        },
        symName: "j",
        description: "j symbol",
        payouts: { 1: 1, 2: 2, 3: 3 },
        isWild: false,
        isScatter: false,
        isBonus: false,
        animations: {
          //idle: "idle",
          "win-cascade": "win",
        },
      },
      "9": {
        visualType: "spine",
        visualOptions: {
          atlas: "symbols.atlas",
          skeleton: "symbols.json",
          skin: "scatter",
          x: 90,
          y: 94,
          scale: 0.8,
          cover: {
            texture: symbolCovers.textures["scatter.png"],
            x: -55,
            y: -32,
            scale: 0.92,
          },
        },
        symName: "scatter",
        description: "scatter symbol",
        payouts: { 1: 1, 2: 2, 3: 3 },
        isWild: false,
        isScatter: true,
        isBonus: false,
        animations: {
          //idle: "idle",
          "win-cascade": "scatter_win",
          "scatter-win": "scatter_win",
        },
      },
      "10": {
        visualType: "spine",
        visualOptions: {
          atlas: "symbols.atlas",
          skeleton: "symbols.json",
          skin: "wild",
          x: 93,
          y: 85,
          scale: 0.84,
          cover: {
            texture: symbolCovers.textures["wild.png"],
            x: -61,
            y: -40,
            scale: 0.95,
          },
        },
        symName: "wild",
        description: "wild symbol",
        payouts: { 1: 1, 2: 2, 3: 3 },
        isWild: true,
        isScatter: false,
        isBonus: false,
        animations: {
          //idle: "idle",
          "win-cascade": "win",
        },
      },
      /*"11": {
        visualType: "spine",
        visualOptions: {
          atlas: "symbols.atlas",
          skeleton: "symbols.json",
          skin: "big_wild",
          x: 64,
          y: 64,
          scale: 0.7,
        },
        symName: "big-wild",
        description: "big-wild symbol",
        payouts: { 1: 1, 2: 2, 3: 3 },
        isWild: true,
        isScatter: false,
        isBonus: false,
        animations: {
          "idle": "idle",
          "win-cascade": "win",
        },
      },*/
      "12": {
        visualType: "spine",
        visualOptions: {
          atlas: "symbols.atlas",
          skeleton: "symbols.json",
          skin: "big_wild",
          x: 92,
          y: 63,
          scale: 0.82,
          cover: {
            texture: symbolCovers.textures["big-wild-3.png"],
            x: -27,
            y: -18,
            scale: 0.75,
          },
        },
        symName: "bonus",
        description: "bonus symbol",
        payouts: { 1: 1, 2: 2, 3: 3 },
        isWild: false,
        isScatter: false,
        isBonus: true,
        animations: {
          //"idle": "idle",
          "win-cascade": "big_wild_win",
        },
      },
      "13": {
        visualType: "sprite",
        visualOptions: {
          texture: symbolCovers.textures["big-wild-2.png"],
          x: -27,
          y: -12,
          scale: 0.75,
        },
        symName: "bonus",
        description: "bonus symbol",
        payouts: { 1: 1, 2: 2, 3: 3 },
        isWild: false,
        isScatter: false,
        isBonus: true,
      },
      "14": {
        visualType: "sprite",
        visualOptions: {
          texture: symbolCovers.textures["big-wild-1.png"],
          x: -27,
          y: -2,
          scale: 0.75,
        },
        symName: "bonus",
        description: "bonus symbol",
        payouts: { 1: 1, 2: 2, 3: 3 },
        isWild: false,
        isScatter: false,
        isBonus: true,
      },
      "15": {
        visualType: "sprite",
        visualOptions: {
          texture: symbolCovers.textures["big-wild-0.png"],
          x: -27,
          y: 4,
          scale: 0.75,
        },
        symName: "bonus",
        description: "bonus symbol",
        payouts: { 1: 1, 2: 2, 3: 3 },
        isWild: false,
        isScatter: false,
        isBonus: true,
      },
    };
  }

  // Provides data for showing symbols according to symbolId on the UI win detail messages
  private getUISymbolConfig(): {
    [symbolId: string]: Slot.UISymbolOptions;
  } {
    const symbolCovers = Assets.get("textures");
    return {
      "1": {
        texture: symbolCovers.textures["ankh.png"],
        scale: 0.12,
      },
      "2": {
        texture: symbolCovers.textures["pot.png"],
        scale: 0.12,
      },
      "3": {
        texture: symbolCovers.textures["sheet.png"],
        scale: 0.12,
      },
      "4": {
        texture: symbolCovers.textures["sword.png"],
        scale: 0.12,
      },
      "5": {
        texture: symbolCovers.textures["sym-a.png"],
        scale: 0.12,
      },
      "6": {
        texture: symbolCovers.textures["sym-k.png"],
        scale: 0.12,
      },
      "7": {
        texture: symbolCovers.textures["sym-q.png"],
        scale: 0.12,
      },
      "8": {
        texture: symbolCovers.textures["sym-j.png"],
        scale: 0.12,
      },
      "9": {
        texture: symbolCovers.textures["scatter.png"],
        scale: 0.12,
      },
      "10": {
        texture: symbolCovers.textures["wild.png"],
        scale: 0.12,
      },
    };
  }

  private getSpriteSymbolConfig(): {
    [symbolId: string]: Slot.SymbolOptions;
  } {
    const symbolCovers = Assets.get("textures");
    return {
      "1": {
        visualType: "sprite",
        visualOptions: {
          texture: symbolCovers.textures["ankh.png"],
          x: -34,
          y: -4,
          scale: 0.8,
        },
        symName: "ankh",
        description: "ankh symbol",
        payouts: { 1: 1, 2: 2, 3: 3 },
        isWild: false,
        isScatter: false,
        isBonus: false,
        animations: {
          //idle: "idle",
          "win-cascade": "win",
        },
      },
      "2": {
        visualType: "sprite",
        visualOptions: {
          texture: symbolCovers.textures["pot.png"],
          x: -34,
          y: -14,
          scale: 0.8,
        },
        symName: "pot",
        description: "pot  symbol",
        payouts: { 1: 1, 2: 2, 3: 3 },
        isWild: false,
        isScatter: false,
        isBonus: false,
        animations: {
          //idle: "idle",
          "win-cascade": "win",
        },
      },
      "3": {
        visualType: "sprite",
        visualOptions: {
          texture: symbolCovers.textures["sheet.png"],
          x: -34,
          y: -14,
          scale: 0.8,
        },
        symName: "sheet",
        description: "sheet symbol",
        payouts: { 1: 1, 2: 2, 3: 3 },
        isWild: false,
        isScatter: false,
        isBonus: false,
        animations: {
          //idle: "idle",
          "win-cascade": "win",
        },
      },
      "4": {
        visualType: "sprite",
        visualOptions: {
          texture: symbolCovers.textures["sword.png"],
          x: -34,
          y: -7,
          scale: 0.8,
        },
        symName: "sword",
        description: "sword symbol",
        payouts: { 1: 1, 2: 2, 3: 3 },
        isWild: false,
        isScatter: false,
        isBonus: false,
        animations: {
          //idle: "idle",
          "win-cascade": "win",
        },
      },
      "5": {
        visualType: "sprite",
        visualOptions: {
          texture: symbolCovers.textures["sym-a.png"],
          x: -38,
          y: -11,
          scale: 0.8,
        },
        symName: "a",
        description: "a symbol",
        payouts: { 1: 1, 2: 2, 3: 3 },
        isWild: false,
        isScatter: false,
        isBonus: false,
        animations: {
          //idle: "idle",
          "win-cascade": "win",
        },
      },
      "6": {
        visualType: "sprite",
        visualOptions: {
          texture: symbolCovers.textures["sym-k.png"],
          x: -37,
          y: -15,
          scale: 0.8,
        },
        symName: "k",
        description: "k symbol",
        payouts: { 1: 1, 2: 2, 3: 3 },
        isWild: false,
        isScatter: false,
        isBonus: false,
        animations: {
          //idle: "idle",
          "win-cascade": "win",
        },
      },
      "7": {
        visualType: "sprite",
        visualOptions: {
          texture: symbolCovers.textures["sym-q.png"],
          x: -39,
          y: -13,
          scale: 0.8,
        },
        symName: "q",
        description: "q symbol",
        payouts: { 1: 1, 2: 2, 3: 3 },
        isWild: false,
        isScatter: false,
        isBonus: false,
        animations: {
          //idle: "idle",
          "win-cascade": "win",
        },
      },
      "8": {
        visualType: "sprite",
        visualOptions: {
          texture: symbolCovers.textures["sym-j.png"],
          x: -35,
          y: -13,
          scale: 0.8,
        },
        symName: "j",
        description: "j symbol",
        payouts: { 1: 1, 2: 2, 3: 3 },
        isWild: false,
        isScatter: false,
        isBonus: false,
        animations: {
          //idle: "idle",
          "win-cascade": "win",
        },
      },
      "9": {
        visualType: "sprite",
        visualOptions: {
          texture: symbolCovers.textures["scatter.png"],
          x: -55,
          y: -32,
          scale: 0.92,
        },
        symName: "scatter",
        description: "scatter symbol",
        payouts: { 1: 1, 2: 2, 3: 3 },
        isWild: false,
        isScatter: true,
        isBonus: false,
        animations: {
          //idle: "idle",
          "win-cascade": "win",
        },
      },
      "10": {
        visualType: "sprite",
        visualOptions: {
          texture: symbolCovers.textures["wild.png"],
          x: -61,
          y: -40,
          scale: 0.95,
        },
        symName: "wild",
        description: "wild symbol",
        payouts: { 1: 1, 2: 2, 3: 3 },
        isWild: true,
        isScatter: false,
        isBonus: false,
        animations: {
          //idle: "idle",
          "win-cascade": "win",
        },
      },
      "11": {
        visualType: "spine",
        visualOptions: {
          atlas: "symbols.atlas",
          skeleton: "symbols.json",
          skin: "big_wild",
          x: 64,
          y: 64,
          scale: 0.7,
        },
        symName: "big-wild",
        description: "big-wild symbol",
        payouts: { 1: 1, 2: 2, 3: 3 },
        isWild: true,
        isScatter: false,
        isBonus: false,
        animations: {
          idle: "idle",
          "win-cascade": "win",
        },
      },
      "12": {
        visualType: "sprite",
        visualOptions: {
          texture: symbolCovers.textures["big-wild-3.png"],
          x: -55,
          y: -32,
          scale: 0.8,
        },
        symName: "bonus",
        description: "bonus symbol",
        payouts: { 1: 1, 2: 2, 3: 3 },
        isWild: false,
        isScatter: false,
        isBonus: true,
      },
      "13": {
        visualType: "sprite",
        visualOptions: {
          texture: symbolCovers.textures["big-wild-2.png"],
          x: -55,
          y: -32,
          scale: 0.8,
        },
        symName: "bonus",
        description: "bonus symbol",
        payouts: { 1: 1, 2: 2, 3: 3 },
        isWild: false,
        isScatter: false,
        isBonus: true,
      },
      "14": {
        visualType: "sprite",
        visualOptions: {
          texture: symbolCovers.textures["big-wild-1.png"],
          x: -55,
          y: -32,
          scale: 0.8,
        },
        symName: "bonus",
        description: "bonus symbol",
        payouts: { 1: 1, 2: 2, 3: 3 },
        isWild: false,
        isScatter: false,
        isBonus: true,
      },
      "15": {
        visualType: "sprite",
        visualOptions: {
          texture: symbolCovers.textures["big-wild-0.png"],
          x: -55,
          y: -32,
          scale: 0.8,
        },
        symName: "bonus",
        description: "bonus symbol",
        payouts: { 1: 1, 2: 2, 3: 3 },
        isWild: false,
        isScatter: false,
        isBonus: true,
      },
    };
  }

  private makeGameLogo() {
    this.gameLogo = this.game.make.spine(
      {
        skeleton: "main/logo/logo.json",
        atlas: "main/logo/logo.atlas",
        skin: "default",
        components: [
          {
            type: Engine.Components.GridPositionComponent,
            params: [
              {
                portrait: { columns: 2, rows: 2, position: { x: 0, y: -0.72 } },
              },
            ],
          },
          {
            type: Engine.Components.ResizeComponent,
            params: [
              {
                desktop: {
                  landscape: { scale: 0.82, x: 1620, y: 220 },
                },
                mobile: {
                  landscape: { scale: 1, x: 1710, y: 220 },
                  portrait: { scale: 0.85, x: 540, y: 330 },
                },
                tablet: {
                  landscape: { scale: 1, x: 1710, y: 220 },
                  portrait: { scale: 1, x: 545, y: 157 },
                },
              },
            ],
          },
        ],
      },
      this
    );
    this.gameLogo.zIndex = 0;
    this.gameLogo.state.setAnimation(0, "idle", true);
  }

  /**
   * Toggles the visibility of the game logo.
   * In Mobile portrait mode, gameLogo hides to show the win tickup and then again shows when next spin starts
   *
   * @param visiblity - A boolean indicating whether the game logo should be visible. Defaults to `true`.
   */
  public toggleGameLogoVisibility(visiblity: boolean = true) {
    if (this.gameLogo) this.gameLogo.visible = visiblity;
  }

  onLoad(progress: number) {
    console.log("MainScreen loaded with progress:", progress);
  }

  /** Prepare the screen just before showing */
  public prepare() {}

  /** Update the screen */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public update(_time: Ticker) {
    if (this.paused) return;
  }

  /** Pause gameplay - automatically fired when a popup is presented */
  public async pause() {
    this.interactiveChildren = false;
    this.paused = true;
  }

  /** Resume gameplay */
  public async resume() {
    this.interactiveChildren = true;
    this.paused = false;
  }

  /** Fully reset */
  public reset() {}

  /** Resize the screen, fired whenever window size changes */

  public resize(_width: number, _height: number, orientation: string) {
    this.bigWinScreen.onResize(_width, _height, orientation);
    this.freeSpinIntro.resize();
    this.freeSpinOutro.resize();
  }

  /** Show screen with animations */
  public async show(): Promise<void> {}

  /** Hide screen with animations */
  public async hide() {}

  /** Auto pause the app when window go out of focus */
  public blur() {
    if (!this.game.navigation.currentPopup) {
      console.log("blur", "paused Game");
    }
  }
}
