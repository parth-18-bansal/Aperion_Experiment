import { Engine, Logger } from "game-engine";
import { Assets, Container, isMobile, RenderLayer } from "pixi.js";
import {
  AutoPlayButton,
  DesktopFooter,
  FreeRoundIntroPopup,
  FreeRoundOutroPopup,
  FreeRoundTopBar,
  MobileFooter,
  TopHeader,
  UIPopup,
} from "./components";
import { Slot } from "slot-game-engine";
import { ActorRef } from "xstate";
import { GameSpeedMode } from "./components/GameSpeed";
import { BetHistory } from "./components/BetHistoryPanel";
import { VERSION } from ".";
import { isPortrait } from "game-engine/src/utils/isPortrait";

export class UI extends Container implements Slot.IGameUI {
  actor!: ActorRef<Slot.GameMachineType, any, Slot.GameEvent>;
  topBar!: TopHeader;
  footer!: DesktopFooter | MobileFooter;
  loadFonts = UI.loadFonts;
  checkFontsLoaded = UI.checkFontsLoaded;
  currency!: Intl.NumberFormat;
  credits: number = 0;
  betAmount: number = 0;
  betLevels: number[] = [];
  betLevelIndex: number = 0;
  coinValues: number[] = [];
  coinValueIndex: number = 0;
  betWayValues: number[] = [];
  betAmounts: number[] = [];
  betAmountIndex: number = 0;
  betLine: number = 1;
  betValues: Map<
    number,
    { coinValue: number; betLevel: number; betLine: number }
  > = new Map();
  // Cached min/max bet values in cents for InfoButton
  private minBetCents: number = 0;
  private maxBetCents: number = 0;
  availableBuyFeatures: Slot.BuyFeatureOption[] = []; // Available buy features
  private _state = "";
  private canBetChange: boolean = false;

  // Speed mode management
  private currentSpeedMode: GameSpeedMode = "normal";
  private previousSpeedMode: GameSpeedMode = "normal";

  private skipSwitch: boolean = false;

  // Press and hold functionality
  private pressHoldInterval: number | null = null;
  private pressHoldStartTimeout: number | null = null;
  private pressHoldDelay: number = 500;
  private pressHoldRepeatInterval: number = 100;
  private isPressHoldActive: boolean = false;
  private hasPopup: boolean = false;
  private isHoldingPress: boolean = false;
  private holdingPressTimeout: NodeJS.Timeout | null = null;
  private isInFreeSpin = false;
  private tempSpeedMode: GameSpeedMode | null = null;

  // Buy feature properties
  buyFeatureButton!: Slot.IBuyFeatureButton;
  buyFeatureMenu!: Slot.IBuyFeatureMenu;
  buyFeatureConfirmation!: Slot.IBuyFeatureConfirmation;
  private renderLayer: RenderLayer | null = null;
  public visualOptions?: Slot.UIVisualOptions;
  public uiPopup!: UIPopup;
  public freePlaysPopup!: FreeRoundIntroPopup;
  public freePlaysOutroPopup!: FreeRoundOutroPopup;
  public freeRoundTopBar!: FreeRoundTopBar;

  constructor(options?: Slot.InitialUIOptions, visual?: Slot.UIVisualOptions) {
    super(); // Centered position
    Engine.Utils.ApplyCommonProperties(this, {
      ...(visual ?? {}),
      visible: true,
      // zIndex: 1000, // TODO -> Asked Team Lead (Erdem & Mustafa)
    });
    // this.blurBg = new Graphics();
    // this.blurBg.fill({ color: "#000000" });
    // this.blurBg.rect(80, 260, 1080, 2140);
    // this.blurBg.alpha = 0;
    // this.blurBg.fill();
    // this.blurBg.filterArea
    // this.addChild(this.blurBg);
       
    this.availableBuyFeatures = options?.availableBuyFeatures || [];
    this.visualOptions = visual;
    Logger.info("UI version:", VERSION);
    this.game.locale.addTranslation(
      Assets.get(`ui/language/${this.game.locale.getCurrentLang()}.json`)
    );
  }

  /**
   * Initialize buy feature components from visual options
   */
  private initializeBuyFeature() {
    if (this.visualOptions?.buyFeature) {
      const buyFeatureOptions = this.visualOptions.buyFeature;

      // Initialize button component
      if (buyFeatureOptions.buyFeatureButton) {
        this.buyFeatureButton = buyFeatureOptions.buyFeatureButton;
        if (
          this.buyFeatureButton?.container &&
          (this.buyFeatureButton.add ?? true)
        ) {
          this.addChild(this.buyFeatureButton.container);
        }
        this.bindBuyFeatureButton();
      }

      // Initialize menu component
      if (buyFeatureOptions.buyFeatureMenu) {
        this.buyFeatureMenu = buyFeatureOptions.buyFeatureMenu;
        if (
          this.buyFeatureMenu?.container &&
          (this.buyFeatureMenu.add ?? true)
        ) {
          this.addChildAt(this.buyFeatureMenu.container, 0);
        }
        this.bindBuyFeatureMenu();
      }

      // Initialize confirmation component
      if (buyFeatureOptions.buyFeatureConfirmation) {
        this.buyFeatureConfirmation = buyFeatureOptions.buyFeatureConfirmation;
        if (
          this.buyFeatureConfirmation?.container &&
          (this.buyFeatureConfirmation.add ?? true)
        ) {
          this.addChildAt(this.buyFeatureConfirmation.container, 0);
        }
        this.bindBuyFeatureConfirmation();
      }
    }
  }

  /**
   * Bind buy feature button events
   */
  private bindBuyFeatureButton() {
    if (this.buyFeatureButton) {
      this.buyFeatureButton.onButtonClick = () => {
        if (!this.isAutoplayActive && this.availableBuyFeatures.length === 1) {
          // Single option - show confirmation directly
          const feature = this.availableBuyFeatures[0];
          this.showBuyFeatureConfirmation(
            feature.id,
            feature.basePrice * this.betAmount
          );
          this.footer.closeAllPanelsExcept(null);
        } else if (
          !this.isAutoplayActive &&
          this.availableBuyFeatures.length > 1
        ) {
          // Multiple options - show menu
          this.showBuyFeatureMenu();
        }
      };
    }
  }

  /**
   * sets the total won amount in freespins
   */
  public setFreespinTotalWin(params: any, tickupDuration: number = 0, gameMode: Slot.GameMode = "freespin") {
    this.footer.infoTextArea.onSetTotalWin(
      params.amount,
      false,
      tickupDuration,
      "none",
      0,
      gameMode
    );
  }

  /**
   * Start the current win amount counting
   */
  public async showCurrentWin(
    params: any,
    gameMode: Slot.GameMode,
    tickupDuration?: number,
    winShowDelay?: number
  ) {
    // Delay for syncing the win counting animation with the Tumble win animation
    if (!this.footer.infoTextArea.isWinMessageVisible) {
      await Engine.Utils.WaitFor(winShowDelay);
    }
    this.footer.infoTextArea.onSetTotalWin(
      params.amount,
      { add: true, reset: false },
      tickupDuration
    );
    this.footer.infoTextArea.processWinDetails(
      params,
      this.currentSpeedMode,
      gameMode
    );
  }

  /**
   * increment the freespin count
   */
  public async incrementFreespinCount(count: number = 1) {
    this.footer.infoTextArea.onSetFreeSpinCount(count, true);
  }

  /**
   * Show the freespin count with starting count
   */
  public showFreespinCountStart(count: number = 1) {
    this.footer.infoTextArea.onSetFreeSpinCount(count );
  }

  /**
   * Bind buy feature menu events
   */
  private bindBuyFeatureMenu() {
    if (this.buyFeatureMenu) {
      this.buyFeatureMenu.onOptionSelected = (
        featureId: string,
        price: number
      ) => {
        this.hideBuyFeatureMenu();
        this.showBuyFeatureConfirmation(featureId, price);
      };
    }
  }

  /**
   * Bind buy feature confirmation events
   */
  private bindBuyFeatureConfirmation() {
    if (this.buyFeatureConfirmation) {
      this.buyFeatureConfirmation.onConfirmed = (featureId: string) => {
        this.hideBuyFeatureConfirmation();
        this.buyFeatureButton.setActiveText?.(true);
        this.actor.send({
          type: "UI_BUY_FEATURE_CONFIRMED",
          featureId,
        });
        this.setVisibility("infoTextArea", true);
      };

      this.buyFeatureConfirmation.onCancelled = () => {
        this.hideBuyFeatureConfirmation();
        this.actor.send({
          type: "UI_BUY_FEATURE_CANCELLED",
        });
        if (isMobile.any) {
          this.setVisibility("spinArea", true);
          this.setVisibility("infoTextArea", true);
        }
      };
    }
  }

  /**
   * Show buy feature menu
   */
  private showBuyFeatureMenu() {
    if (this.buyFeatureMenu) {
      this.buyFeatureMenu.setVisible(true);
      this.buyFeatureMenu.updateOptions(this.availableBuyFeatures);
      this.buyFeatureMenu.updatePrices(this.betAmount);
    }
  }

  /**
   * Hide buy feature menu
   */
  private hideBuyFeatureMenu() {
    if (this.buyFeatureMenu) {
      this.buyFeatureMenu.setVisible(false);
    }
  }

  /**
   * Show buy feature confirmation
   */
  private showBuyFeatureConfirmation(featureId: string, price: number) {
    if (this.buyFeatureConfirmation) {
      this.actor.send({
        type: "UI_BUY_FEATURE_OPTION_SELECTED",
        featureId,
        price,
      });
      this.buyFeatureConfirmation.setVisible(true);
      this.buyFeatureConfirmation.showConfirmation(featureId, this.betAmount);
      if (isMobile.any) {
        this.setVisibility("spinArea", false);
        this.setVisibility("infoTextArea", !isPortrait());
      }
    }
  }

  /**
   * Hide buy feature confirmation
   */
  private hideBuyFeatureConfirmation() {
    if (this.buyFeatureConfirmation) {
      this.buyFeatureConfirmation.setVisible(false);
    }
  }

  /**
   * Update buy feature options from server data
   */
  private updateBuyFeatureOptions(options: Slot.BuyFeatureOption[], state: any) {
    this.availableBuyFeatures = options;

    // Update button visibility and state
    if (this.buyFeatureButton) {
      /*const hasAvailableFeatures = options.some((opt) => opt.isAvailable);
      this.buyFeatureButton.setVisible(hasAvailableFeatures);
      this.buyFeatureButton.setEnabled(hasAvailableFeatures);*/

      // If single option, update button with option details
      if (options.length === 1) {
        const feature = options[0];
        this.buyFeatureButton.updateFeatureId(feature.id);
        // Replay mode server not giving betLevels, betLine & coinValues. So betAmount is used directly
        if (state.context.gameplayMode === "replay") {
          this.betAmount = state.context.betAmount;
        }
        this.buyFeatureButton.updatePrice(
          this.game.slot.currency.format(feature.basePrice * this.betAmount)
        );
        if (this.buyFeatureConfirmation) {
          this.buyFeatureConfirmation.updatePrice(
            this.game.slot.currency.format(feature.basePrice * this.betAmount)
          );
        }
      }
    }

    // Update menu if available
    if (this.buyFeatureMenu) {
      this.buyFeatureMenu.updateOptions(options);
    }
  }

  /**
   * Update buy feature prices when bet amount changes
   */
  private updateBuyFeaturePrices() {
    // Update button price if single option
    if (this.buyFeatureButton && this.availableBuyFeatures.length === 1) {
      const feature = this.availableBuyFeatures[0];
      this.buyFeatureButton.updatePrice(
        this.game.slot.currency.format(feature.basePrice * this.betAmount)
      );

      if (
        this.availableBuyFeatures.length === 1 &&
        this.buyFeatureConfirmation
      ) {
        this.buyFeatureConfirmation.updatePrice(
          this.game.slot.currency.format(feature.basePrice * this.betAmount)
        );
      }
    }

    // Update menu prices
    if (this.buyFeatureMenu) {
      this.buyFeatureMenu.updatePrices(this.betAmount);
    }
  }

  /**
   * Show free round intro popup
   */
  private showFreeRoundIntroPopup(data: any) {
    if (this.freePlaysPopup) {
      // Eğer packages array'i varsa, bu intro popup
      if (data.packages && data.packages.length > 0) {
        // İlk available package'ı kullanıyoruz şimdilik
        const firstPackage = data.packages[0];
        this.freePlaysPopup
          .show({
            bet: firstPackage.betValue,
            expiryDate: firstPackage.endDate,
            laterButton: !firstPackage.isBonus,
          })
          .then((result) => {
            console.log("Free Round Intro Result:", result);
            if (result.action === "start") {
              this.game.audio.soundBus.PlaySFX("sounds/fx/AnubisDream_Click.wav", 'sfx', {});
              this.buyFeatureButton.setActiveText?.(true);
              this.actor.send({
                type: "UI_START_FREE_ROUNDS_PACKAGE",
                packageId: firstPackage.id,
              });
            } else if (result.action === "later") {
              this.game.audio.soundBus.PlaySFX("sounds/fx/AnubisDream_Click.wav", 'sfx', {});
              this.actor.send({
                type: "UI_DEFER_FREE_ROUNDS_PACKAGE",
              });
            }
          });
      }
      // Eğer single package varsa, bu state transition popup
      else if (data.package) {
        console.log("Showing single package free round intro popup");
        this.betAmount = data.package.betValue || this.betAmount;
        this.syncBetPanel();
        this.actor.send({
          type: "UI_SET_BET_VALUES",
          betAmount: this.betAmount,
          betLine: this.betLine,
          betLevel: this.betLevels[this.betLevelIndex],
          coinValue: this.coinValues[this.coinValueIndex],
        });
        this.actor.send({
          type: "FREE_ROUNDS_INTRO_CLOSED",
        });
        this.game.audio.soundBus.PlaySFX("sounds/fx/AnubisDream_Click.wav", 'sfx', {});
      }
    }
  }

  /**
   * Hide free round intro popup
   */
  private hideFreeRoundIntroPopup() {
    if (this.freePlaysPopup) {
      this.freePlaysPopup.hide();
    }
  }

  /**
   * Show free round outro popup
   */
  private showFreeRoundOutroPopup(data: any) {
    if (this.freePlaysOutroPopup) {
      this.freePlaysOutroPopup
        .show({
          winAmount: data.package?.totalWin || 0,
          usedCount: data.package?.usedCount || 0,
        })
        .then(() => {
          this.game.audio.soundBus.PlaySFX("sounds/fx/AnubisDream_Click.wav", 'sfx', {});
          this.actor.send({
            type: "FREE_ROUNDS_OUTRO_CLOSED",
          });
        });
    }
  }

  /**
   * Hide free round outro popup
   */
  private hideFreeRoundOutroPopup() {
    if (this.freePlaysOutroPopup) {
      this.freePlaysOutroPopup.hide();
    }
  }

  /**
   * Update active free round display
   */
  public updateActiveFreeRound(
    freeRoundPackage: Slot.FreeRoundsPackage | null
  ) {
    if (freeRoundPackage && this.freeRoundTopBar) {
      this.freeRoundTopBar.show({
        remainingFreeRound: freeRoundPackage.roundCount,
        totalWin: freeRoundPackage.totalWin || 0,
      });
    } else if (this.freeRoundTopBar) {
      this.freeRoundTopBar.hide();
    }
  }
  isAutoplayActive = false;

  initialize(
    actor: ActorRef<Slot.GameMachineType, any, Slot.GameEvent>,
    options: Slot.InitialUIOptions
  ): void {
    // set actor
    this.actor = actor;

    // set currency converter
    const { language, currencyCode, credits } = options;
    this.setCurrencyFormatter(language, currencyCode);

    // generate bet amounts
    if (options.bets) {
      this.generateBetAmounts(options.bets);
    }
    this.credits = credits || 0;

    // initialize visuals
    this.initVisuals(language);

    // Apply cached min/max bet values to Info panel once footer is ready
    if (this.minBetCents > 0) {
      this.footer.infoButton.updateMinBet(this.minBetCents);
    }
    if (this.maxBetCents > 0) {
      this.footer.infoButton.updateMaxBet(this.maxBetCents);
    }

    // sync bet panel
    this.syncBetPanel();

    // set credits and bet amount
    this.setBetAndBalance(this.betAmount, this.credits);

    // Ensure Info panel multipliers reflect the initial bet on first open
    this.footer.infoButton.updateMultipliers(Math.round(this.betAmount * 100));

    // bind actor to UI
    this.subscribeToActorEvents();
    /*this.actor.on("*", (event) => {
      console.log("UI event received:", event);
    });*/

    // bind buttons
    this.bindUIButtons();
    this.bindDocumentEvents();

    this.availableBuyFeatures = options.availableBuyFeatures || [];
    this.initializeBuyFeature();

    this.renderLayer = new RenderLayer();
    this.addChild(this.renderLayer, this.uiPopup);
    if (this.buyFeatureConfirmation) {
      this.renderLayer.attach(this.buyFeatureConfirmation.container);
    }
    if (this.buyFeatureMenu) {
      this.renderLayer.attach(this.buyFeatureMenu.container);
    }
    this.renderLayer.attach(this.footer.spinArea.betControl);
    this.renderLayer.attach(this.footer.betArea);
    this.renderLayer.attach(this.footer.betPanel);
    this.renderLayer.attach(this.topBar);

    if (!isPortrait()) {
      this.renderLayer.attach(this.footer.infoTextArea);
    }

    // Ensure button states are properly set on initialization
    this.updateBetButtonStates();

    window.addEventListener("offline", () => {
      this.hasPopup = true;
      this.uiPopup.offlinePopupFlag = true;
      const code = "connection-offline";
      const title = this.game.locale.t(
        `ui.errors.${code.toLowerCase()}title`
      );
      const message = this.game.locale.t(`ui.errors.${code.toLowerCase()}`);
      this.uiPopup
        .show({
          title,
          message,
          button: false,
          buttonText: this.game.locale.t("ui.btns.ok"),
        });
    });
    window.addEventListener("online", () => {
      // It will only close the popup if the active popup is the offline popup message
      if(this.uiPopup.offlinePopupFlag){
        this.uiPopup.offlinePopupFlag = false;
        this.hasPopup = false;
        this.uiPopup.hide();
      }
    });
  }

  public onResize(footer: DesktopFooter | MobileFooter) {
    footer.resize(this.game.renderer.width, this.game.renderer.height);
    if (isPortrait()) {
      this.renderLayer.detach(this.footer.infoTextArea);
    } else {
      this.renderLayer.attach(this.footer.infoTextArea);
    }
  }

  bindDocumentEvents() {
    // Space bar to trigger spin
    // Basılı tutulmaya devam ederse Turbo moda geçer bıraktığında başladığı hıza geri döner
    document.addEventListener("keydown", (event) => {
      if (event.code === "Space" && !this.hasPopup) {
        event.preventDefault(); // Prevent default space bar behavior
        const forceStopButton = this.footer?.spinArea?.forceStopButton;
        if (forceStopButton.visible && forceStopButton.enabled) {
          forceStopButton.onPress.emit();
        } else {
          this.footer.spinArea.spinButton.onPress.emit();
        }

        // Basılı tutulursa turbo moda geç (sadece bir kez)
        if (
          !this.holdingPressTimeout &&
          !this.isHoldingPress &&
          !this.isAutoplayActive
        ) {
          this.previousSpeedMode = this.currentSpeedMode;
          this.isHoldingPress = true;
          this.holdingPressTimeout = setTimeout(() => {
            clearTimeout(this.holdingPressTimeout!);
            this.holdingPressTimeout = null;
            this.setSpeedMode("turbo");
          }, 350);
        }
      }
    });

    document.addEventListener("keyup", (event) => {
      if (event.code === "Space") {
        clearTimeout(this.holdingPressTimeout!);
        this.holdingPressTimeout = null;
        // Space bırakıldığında önceki hıza geri dön
        if (this.currentSpeedMode === "turbo") {
          this.setSpeedMode(this.previousSpeedMode);
        }
        this.isHoldingPress = false;
      }
    });
    document.addEventListener("pointerup", () => {
      this.makeFullScreen();
    });
  }

  subscribeToActorEvents() {
    this.actor.subscribe((state) => {
      //if (this._state !== state.value) {
      this._state = state.value as string;
      // console.log("UI state updated:", state);
      // UI durumunu güncelleme işlemleri burada yapılabiir

      const tags = new Set(state.tags);
      this.footer.spinArea.mobileMoneyIcon.enabled =
        tags.has("spinEnabled") &&
        !state.context.isSpinBlocked &&
        !tags.has("autoplayActive");
      // enable/disable buttons based on tags
      this.footer.spinArea.spinButton.enabled =
        tags.has("spinEnabled") &&
        !state.context.isSpinBlocked &&
        !tags.has("autoplayActive");
      this.footer.spinArea.forceStopButton.enabled =
        (tags.has("forceStopEnabled") && !state.context.isForceStopped) ||
        tags.has("autoplayActive");
      this.isAutoplayActive =
        tags.has("autoplayActive") || state.context.isAutoplayActive;
      // console.log("Autoplay active:", this.isAutoplayActive);
      // Update autoplay button state
      if (
        (this.footer.spinArea.autoPlayButton as AutoPlayButton).btnState ===
        "play"
      ) {
        this.footer.spinArea.autoPlayButton.enabled =
          tags.has("autoplayEnabled") && !this.isAutoplayActive;
      } else {
        this.footer.spinArea.autoPlayButton.enabled =
          this.isAutoplayActive && !state.context.isAutoplayStopped;
      }

      this.syncBuyFeatureButtonState(
        tags.has("buyFeatureEnabled") && !this.isAutoplayActive && state.context.gameplayMode !== "replay"
      );

      // Update active free round display
      this.updateActiveFreeRound(state.context.activeFreeRoundPackage);

      const canBetChange =
        tags.has("betChangeEnabled") && !state.context.activeFreeRoundPackage && state.context.gameplayMode !== "replay";
      this.canBetChange = canBetChange;
      // Standalone bet area increment follows the gate directly
      this.footer.betArea.incButton.enabled = canBetChange;
      // Delegate panel/control buttons to centralized updater (applies gate + index bounds)
      this.updateBetButtonStates();

      if (typeof state.value === "string") {
        switch (state.value) {
          case "idle":
            this.footer.spinArea.spinButton.visible =
              !state.context.isAutoplayActive;
            this.footer.spinArea.spinButton.enabled =
              !state.context.isAutoplayActive; // Enable spin button in idle state
            this.footer.spinArea.forceStopButton.visible =
              state.context.isAutoplayActive;
            this.footer.spinArea.forceStopButton.enabled =
              state.context.isAutoplayActive; // Disable force stop button in idle state
            this.footer.infoTextArea.setMainText({
              context: state.context,
              state: state.value,
            });
            if (this.buyFeatureButton) {
              this.buyFeatureButton.setVisible(true);
              // Handle buy feature state updates
              this.updateBuyFeatureState(state);
            }
            (
              this.footer.spinArea.autoPlayButton as AutoPlayButton
            ).updateTexture(false);
            this.footer.spinArea.autoPlayButton.enabled = true;
            break;
          case "autoplay":
            this.footer.spinArea.spinButton.visible = false;
            this.footer.spinArea.spinButton.enabled = false; // Disable spin button in idle state
            this.footer.spinArea.forceStopButton.visible = true;
            this.footer.spinArea.forceStopButton.enabled = true; // Enable force stop button in idle state
            break;
          case "evaluatingSpin":
            this.footer.spinArea.spinButton.visible = false;
            this.footer.spinArea.spinButton.enabled = false; // Disable spin button during evaluation
            this.footer.spinArea.forceStopButton.enabled =
              this.isAutoplayActive; // Disable force stop button during evaluation
            this.credits = state.context.prevCredits ?? 0;
            this.footer.betArea.updateBalance(
              this.currency.format(this.credits)
            );
            break;
          case "postWinEvaluation":
            this.credits = state.context.credits ?? 0;
            this.footer.betArea.updateBalance(
              this.currency.format(this.credits)
            );
            break;
          case "spinning":
            if (state.context.gameMode !== "freespin") {
              this.footer.infoTextArea.resetAll();
            }
            this.footer.spinArea.spinButton.visible = false;
            this.footer.spinArea.forceStopButton.visible = true;
            this.footer.closeAllPanelsExcept(this.footer.hamburgerPanel);
            this.credits = state.context.credits ?? 0;
            this.footer.betArea.updateBalance(
              this.currency.format(this.credits)
            );
            this.footer.infoTextArea.setMainText({
              context: state.context,
              state: state.value,
            });
            break;
          default:
            break;
        }
      } else if (typeof state.value === "object" && state.value !== null) {
        const [parentState, childState] = Object.entries(state.value)[0];

        if (parentState === "freeSpins") {
          switch (childState) {
            // This will be called only once when game is transitiong from normalspins to freespins
            case "introComplete": {
              if (!this.tempSpeedMode) {
                const tempSpeedMode = this.currentSpeedMode;
                this.setSpeedMode("normal");
                this.tempSpeedMode = tempSpeedMode;
              }
              break;
            }
            case "showingOutro":
              this.footer.infoTextArea.resetWinDetails();
              if (this.tempSpeedMode) {
                this.isInFreeSpin = false;
                this.setSpeedMode(this.tempSpeedMode);
                this.tempSpeedMode = null;
              }
              break;
            default:
              break;
          }
        }
      }
      if (this.betAmount !== state.context.betAmount) {
        this.betAmount = state.context.betAmount || this.betAmount;
        this.syncBetPanel();
        /*this.actor.send({
          type: "UI_SET_BET_VALUES",
          betAmount: this.betAmount,
          betLine: this.betLine,
          betLevel: this.betLevels[this.betLevelIndex],
          coinValue: this.coinValues[this.coinValueIndex],
        });*/
      }
      //}
      this.checkForPopups(state);
      this.footer.hamburgerButton.enabled = !this.hasPopup;
      this.footer.infoButton.enabled = !this.hasPopup;
      this.footer.spinArea.gameSpeed.enabled = !this.hasPopup;
      this.footer.spinArea.spinButton.enabled =
        this.footer.spinArea.spinButton.enabled && !this.hasPopup;
      this.footer.spinArea.autoPlayButton.enabled =
        this.footer.spinArea.autoPlayButton.enabled && !this.hasPopup;
      this.isInFreeSpin = state.context.gameMode === "freespin";

      // Disable all interactive elements during replay mode
      if (state.context.gameplayMode === "replay") {
        this.footer.infoButton.enabled = false;
        this.footer.infoButtonWrapper.visible = false;
        this.footer.spinArea.spinButton.enabled = false;
        this.footer.spinArea.gameSpeed.enabled = false;
        this.footer.spinArea.autoPlayButton.enabled = false;
        this.footer.betPanel.betLevelDecButton.enabled = false;
        this.footer.betPanel.betLevelIncButton.enabled = false;
        this.footer.hamburgerButton.enabled = false;
        this.footer.hamburgerButton.view.visible = false;
        this.footer.betArea.incButton.enabled = false;
        this.footer.betArea.incButton.view.visible = false;
        this.footer.betArea.balanceLabel.visible = false;
        this.footer.betArea.balanceValue.visible = false;
        this.footer.betArea.interactive = false;
        this.footer.betArea.cursor = "default";
        this.footer.spinArea.isReplayMode = true;
        const mobileSoundBtn = this.footer.spinArea.getMobileSoundButton?.();
        mobileSoundBtn.view.visible = true;
        // Replay mode server not giving betLevels, betLine & coinValues and make this.betAmount infinite.
        // So betAmount is used directly
        this.setBetAndBalance(state.context.betAmount || this.betAmount, this.credits);
      }
    });
  }

  private checkForPopups(state: any) {
    if (state.context.popup) {
      const popup = state.context.popup;
      this.hasPopup = popup !== null && popup !== undefined;
      this.uiPopup.offlinePopupFlag = false;
      switch (popup.type) {
        case "freeRoundIntro":
          if (this.buyFeatureButton) {
            this.buyFeatureButton.setVisible(true);
            // Handle buy feature state updates
            this.updateBuyFeatureState(state);
          }
          this.showFreeRoundIntroPopup(popup.data);
          break;
        case "freeRoundOutro":
          this.showFreeRoundOutroPopup(popup.data);
          break;
        case "freeRoundsPackageComplete":
          break;
        case "error": {
          const code = popup.data.error.code;
          let title: string, message: string, buttonText: string;
          if(code === "server"){
            title = this.game.locale.t(`ui.errors.server`);
            message = this.game.locale.t(`ui.errors.api_error`);
            buttonText = this.game.locale.t("ui.btns.reload");
          } else {
            title = this.game.locale.t(`ui.errors.${code.toLowerCase()}title`);
            message = this.game.locale.t(`ui.errors.${code.toLowerCase()}`);
            buttonText = this.game.locale.t("ui.btns.ok");
          }

          this.uiPopup
            .show({
              title,
              message,
              button: true,
              buttonText: buttonText,
            })
            .then(() => {
              if(code === "server"){
                window.location.reload();
              }
              this.actor.send({ type: "RESOLVE_ERROR" });      
            });
          break;
        }
        case "replayPopup": {
          this.hasPopup = true;
          this.footer.spinArea.spinButton.visible = true;
          this.footer.spinArea.forceStopButton.visible = false;
          const title = this.game.locale.t(
            `ui.replay.title`
          );
          const message = this.game.locale.t(`ui.replay.message`);
          this.uiPopup
            .show({
              title,
              message,
              button: true,
              buttonText: this.game.locale.t("ui.replay.play"),
            })
            .then(() => {
              console.log("RESTARTING REPLAY ROUND");
              this.hasPopup = false;
              this.actor.send({ type: "RESTART_REPLAY_ROUND" });
            });
          break;
        }
      }
    } else {
      this.hasPopup = false;
      this.hideFreeRoundIntroPopup();
      this.hideFreeRoundOutroPopup();
    }
  }

  public displayErrorPopup(error: any): void {
    this.hasPopup = true;
    this.uiPopup.offlinePopupFlag = false;
    const code = error.code || "sessionexpired";
    const title = this.game.locale.t(
      `ui.errors.${code.toLowerCase()}title`
    );
    const message = this.game.locale.t(`ui.errors.${code.toLowerCase()}`);
    this.uiPopup
      .show({
        title,
        message,
        button: true,
        buttonText: this.game.locale.t("ui.btns.ok"),
      })
      .then(() => {
        console.log("Popup closed");
        this.hasPopup = false;
      });
  }

  /**
   * Update buy feature UI state based on machine state
   */
  private updateBuyFeatureState(state: any) {
    // Update buy feature options if available
    if (state.context.ui.availableBuyFeatures) {
      this.updateBuyFeatureOptions(state.context.ui.availableBuyFeatures, state);
    }

    // Update buy feature button enabled state based on tags
    const tags = new Set(state.tags);
    const buyFeatureEnabled = tags.has("buyFeatureEnabled");
    this.syncBuyFeatureButtonState(
      state.context.gameplayMode !== "replay" && buyFeatureEnabled && this.availableBuyFeatures.length > 0
    );

    // Handle popup states
    if (state.context.popup) {
      const popup = state.context.popup;
      this.hasPopup = popup !== null && popup !== undefined;

      switch (popup.type) {
        case "buyFeatureMenu":
          this.hasPopup = true;
          this.showBuyFeatureMenu();
          break;
        case "buyFeatureConfirmation":
          this.hasPopup = true;
          if (popup.data?.featureId && popup.data?.price) {
            this.showBuyFeatureConfirmation(
              popup.data.featureId,
              popup.data.price
            );
          }
          break;
        default:
          this.hasPopup = false;
          // Close buy feature popups when other popups are shown
          this.hideBuyFeatureMenu();
          this.hideBuyFeatureConfirmation();
          break;
      }
    } else {
      // Close all buy feature popups when no popup is active
      this.hideBuyFeatureMenu();
      this.hideBuyFeatureConfirmation();
    }
  }

  setCurrencyFormatter(language: string = "en", currencyCode: string = "USD") {
    this.currency = new Intl.NumberFormat(language || "en", {
      style: "currency" /*, notation: "compact"*/,
      currency: currencyCode || "EUR",
      currencyDisplay: "narrowSymbol",
    });
  }

  initVisuals(language: string) {
    // Constructor artık sadece component'ları oluşturuyor
    this.topBar = new TopHeader(
      this.game.renderer.screen.width,
      this.game.renderer.screen.height,
      language
    );

    if (!isMobile.any) {
      this.footer = new DesktopFooter(
        this.game.renderer.screen.width,
        this.game.renderer.screen.height,
        this.actor
      );
    } else {
      this.footer = new MobileFooter(
        this.game.renderer.screen.width,
        this.game.renderer.screen.height,
        this.actor
      );
    }

    this.addChild(this.topBar, this.footer);

    this.uiPopup = new UIPopup();
    this.freeRoundTopBar = new FreeRoundTopBar();
    this.freePlaysPopup = new FreeRoundIntroPopup();
    this.freePlaysOutroPopup = new FreeRoundOutroPopup();
    this.addChild(
      this.freeRoundTopBar,
      this.freePlaysPopup,
      this.freePlaysOutroPopup
    );
    this.game.renderer.on("resize", this.onResize.bind(this, this.footer));
  }


  public handleGameCanvasClick() {
    // mobile ise tam ekran yapacağız
    this.footer.closeAllPanelsExcept(null);
    this.closeInfoPanel();
    const forceStopButton = this.footer?.spinArea?.forceStopButton;
    if (forceStopButton && forceStopButton.visible) this.spinForceStop();
  }

  public closeInfoPanel() {
    const infoPanel = document.getElementById("info-panel");
    if (infoPanel && infoPanel.style.display !== "none") {
      infoPanel.style.display = "none";
    }
  }

  private makeFullScreen() {
    if (isMobile.any) {
      const docElm = document.documentElement;
      if (docElm.requestFullscreen) {
        docElm.requestFullscreen();
        this.onResize(this.footer);
      }
    }
  }

  setBetAndBalance(bet: number, balance: number): void {
    this.footer.betArea.updateBetValue(this.currency.format(bet));
    this.footer.betArea.updateBalance(this.currency.format(balance));
    this.footer.spinArea.updateBetText(this.currency.format(bet));
  }

  // Speed Mode Management Methods
  public setSpeedMode(mode?: GameSpeedMode): void {
    const currentMode = this.currentSpeedMode;
    let nextMode: GameSpeedMode;

    if (mode) {
      mode = this.isInFreeSpin && mode === "turbo" ? "normal" : mode;
      // Belirli bir mode isteniyorsa
      nextMode = currentMode === mode && !this.isHoldingPress ? "normal" : mode;
    } else {
      // Döngüsel geçiş: normal → quick → turbo → normal
      switch (currentMode) {
        case "normal":
          nextMode = "quick";
          break;
        case "quick":
          nextMode = !this.isInFreeSpin ? "turbo" : "normal";
          break;
        case "turbo":
          nextMode = "normal";
          break;
        default:
          nextMode = "normal";
      }
    }

    // Aynı mode'a geçmeye çalışıyorsa işlem yapma
    if (nextMode === currentMode) return;

    this.currentSpeedMode = nextMode;
    this.tempSpeedMode = null;
    this.actor.send({
      type: "UI_SPEED_MODE_CHANGED",
      mode: nextMode,
    });
    this.updateSpeedModeUI(nextMode);
  }

  private setSkipSwitch() {
    this.skipSwitch = !this.skipSwitch;
    this.footer.autoPlayPanel.updateSkipSwitch(this.skipSwitch);
    this.actor.send({
      type: "UI_SKIP_SWITCH_CHANGED",
      enabled: this.skipSwitch,
    });
  }

  private updateSpeedModeUI(mode: GameSpeedMode): void {
    // GameSpeed butonunu güncelle
    this.footer.spinArea.gameSpeed.updateSpeedTexture(mode);

    // AutoPlay panel'deki switch'leri güncelle
    this.footer.autoPlayPanel.updateSpeedSwitches(mode);

    // Hamburger panel'deki switch'leri güncelle
    this.footer.hamburgerPanel.updateSwitchStates(mode);
  }

  public getCurrentSpeedMode(): GameSpeedMode {
    return this.currentSpeedMode;
  }

  syncBetPanel(): void {
    const betValue = this.betValues.get(this.betAmount);
    Logger.log(
      `Syncing bet panel with bet amount: ${this.betAmount}`,
      betValue
    );
    if (!betValue) {
      Logger.error(`Bet amount ${this.betAmount} not found in bet values`);
      return;
    }
    this.betLevelIndex = this.betLevels.indexOf(betValue.betLevel);
    this.coinValueIndex = this.coinValues.indexOf(betValue.coinValue);
    this.footer.betPanel.updateBetPanelTextValues(
      betValue.betLevel.toString(),
      this.currency.format(betValue.coinValue / 100),
      this.currency.format(this.betAmount)
    );
    this.footer.spinArea.updateBetText(this.currency.format(this.betAmount));
    this.footer.betArea.updateBetValue(this.currency.format(this.betAmount));
    this.footer.betArea.updateBalance(this.currency.format(this.credits));
    this.syncBuyFeatureButtonState();

    // Update button states based on current indices
    this.updateBetButtonStates();
  }
  generateBetAmounts(bets: Slot.UIBetOptions) {
    let { betLevels, coinValues, betWayValues } = bets;
    const { betLine, betAmount, betAmounts } = bets;
    // if bet amounts are provided, generate bet values
    if (betAmounts && betAmounts?.length > 0) {
      betLevels = [1];
      betWayValues = [betLine];
      coinValues = betAmounts.map((amount: number) => (amount / betLine) * 100);
    }
    if (betLevels && coinValues && betWayValues) {
      for (const betLevel of betLevels) {
        for (const coinValue of coinValues) {
          for (const betLine of betWayValues) {
            const amount = parseFloat(
              ((coinValue * betLevel * betLine) / 100).toFixed(2)
            );
            this.betValues.set(amount, { coinValue, betLevel, betLine });
          }
        }
      }
    }
    // Sort bet amounts
    this.betAmounts = Array.from(this.betValues.keys()).sort((a, b) => a - b);
    this.betAmount = this.betValues.get(betAmount)
      ? betAmount
      : Math.min(...this.betAmounts);
    this.betLine = betLine || 1;

    // Compute and push min/max into InfoButton (values in cents expected by InfoButton)
    if (this.betAmounts.length > 0) {
      const minBet = this.betAmounts[0];
      const maxBet = this.betAmounts[this.betAmounts.length - 1];
      this.minBetCents = Math.round(minBet * 100);
      this.maxBetCents = Math.round(maxBet * 100);
      // If footer is already initialized, update immediately
      if (this.footer && (this.footer as any).infoButton) {
        this.footer.infoButton.updateMinBet(this.minBetCents);
        this.footer.infoButton.updateMaxBet(this.maxBetCents);
      }
    }
    // Bet levels are unique bet levels
    this.betLevels = Array.from(this.betValues.values())
      .map((value) => value.betLevel)
      .filter((value, index, self) => self.indexOf(value) === index)
      .sort((a, b) => a - b);
    // Coin values are unique coin values
    this.coinValues = Array.from(this.betValues.values())
      .map((value) => value.coinValue)
      .filter((value, index, self) => self.indexOf(value) === index)
      .sort((a, b) => a - b);

    // Bet line values are unique bet lines
    this.betWayValues = Array.from(this.betValues.values())
      .map((value) => value.betLine)
      .filter((value, index, self) => self.indexOf(value) === index)
      .sort((a, b) => a - b);

    if (this.betAmounts.length > 0) {
      this.betAmountIndex = this.betAmounts.indexOf(this.betAmount);
      if (this.betAmountIndex === -1) {
        this.betAmountIndex = 0; // Default to first index if not found
      }
      const betValue = this.betValues.get(this.betAmounts[this.betAmountIndex]);
      if (betValue) {
        this.betLevelIndex = this.betLevels.indexOf(betValue.betLevel);
        this.coinValueIndex = this.coinValues.indexOf(betValue.coinValue);

        this.actor.send({
          type: "UI_BET_CHANGED",
          betAmount: this.betAmount,
          betLevel: this.betLevels[this.betLevelIndex],
          coinValue: this.coinValues[this.coinValueIndex],
          betLine: this.betLine,
        });
      }
    }
  }
  onBetInteraction(
    type: "betLevel" | "coinValue" | "betAmount",
    action: "inc" | "dec"
  ) {
    const incValue = action === "inc" ? 1 : -1;
    let newIndex: number;

    switch (type) {
      case "betLevel":
        newIndex = this.betLevelIndex + incValue;
        // İlk ve son index kontrolü
        if (newIndex < 0 || newIndex >= this.betLevels.length) {
          return; // İşlem yapma
        }
        this.betLevelIndex = newIndex;
        break;
      case "coinValue":
        newIndex = this.coinValueIndex + incValue;
        // İlk ve son index kontrolü
        if (newIndex < 0 || newIndex >= this.coinValues.length) {
          return; // İşlem yapma
        }
        this.coinValueIndex = newIndex;
        break;
      case "betAmount":
        newIndex = this.betAmountIndex + incValue;
        // İlk ve son index kontrolü
        if (newIndex < 0 || newIndex >= this.betAmounts.length) {
          return; // İşlem yapma
        }
        this.betAmountIndex = newIndex;
        break;
    }

    const betLevel = this.betLevels[this.betLevelIndex];
    const coinValue = this.coinValues[this.coinValueIndex];
    const totalBet = this.betAmounts[this.betAmountIndex];

    if (type === "betAmount") {
      this.betAmount = totalBet;
    } else {
      this.betAmount = parseFloat(
        ((coinValue * betLevel * this.betLine) / 100).toFixed(2)
      );
      this.betAmountIndex = this.betAmounts.indexOf(this.betAmount);
    }

    // Update Info panel multipliers based on the new bet
    if (this.footer && (this.footer as any).infoButton) {
      const betCents = Math.round(this.betAmount * 100);
      this.footer.infoButton.updateMultipliers(betCents);
    }

    this.syncBetPanel();
    this.footer.infoTextArea.resetAll();
    this.actor.send({
      type: "UI_BET_CHANGED",
      betAmount: this.betAmount,
      betLevel: this.betLevels[this.betLevelIndex],
      coinValue: this.coinValues[this.coinValueIndex],
      betLine: this.betLine,
    });

    // Update buy feature prices when bet amount changes
    this.updateBuyFeaturePrices();
    this.footer.infoTextArea.resetAll();
    // Update button states after interaction
    this.updateBetButtonStates();
  }

  /**
   * Update bet button states based on current indices
   */
  private updateBetButtonStates() {
    const gate = this.canBetChange;

    // BetLevel buttons
    this.footer.betPanel.betLevelDecButton.enabled =
      gate && this.betLevelIndex > 0;
    this.footer.betPanel.betLevelIncButton.enabled =
      gate && this.betLevelIndex < this.betLevels.length - 1;

    // CoinValue buttons
    this.footer.betPanel.coinDecButton.enabled =
      gate && this.coinValueIndex > 0;
    this.footer.betPanel.coinIncButton.enabled =
      gate && this.coinValueIndex < this.coinValues.length - 1;

    // TotalBet buttons
    this.footer.betPanel.totalDecButton.enabled =
      gate && this.betAmountIndex > 0;
    this.footer.betPanel.totalIncButton.enabled =
      gate && this.betAmountIndex < this.betAmounts.length - 1;

    // SpinArea bet control buttons
    this.footer.spinArea.betControl.downButton.enabled =
      gate && this.betAmountIndex > 0;
    this.footer.spinArea.betControl.upButton.enabled =
      gate && this.betAmountIndex < this.betAmounts.length - 1;
  }

  /**
   * Start press and hold functionality for bet interaction
   */
  private startPressHold(
    type: "betLevel" | "coinValue" | "betAmount",
    action: "inc" | "dec"
  ) {
    // Stop any existing press hold
    this.stopPressHold();

    // Set press hold active flag
    this.isPressHoldActive = true;

    // Start initial delay timer - only start repeating if still pressed after delay
    this.pressHoldStartTimeout = window.setTimeout(() => {
      // Check if still pressed (flag is still active)
      if (this.isPressHoldActive) {
        // Start repeating interval
        this.pressHoldInterval = window.setInterval(() => {
          // Double check if still pressed
          if (this.isPressHoldActive) {
            this.onBetInteraction(type, action);
          } else {
            this.stopPressHold();
          }
        }, this.pressHoldRepeatInterval);
      }
    }, this.pressHoldDelay);
  }

  /**
   * Stop press and hold functionality
   */
  private stopPressHold() {
    // Clear the active flag first
    this.isPressHoldActive = false;

    // Clear start timeout
    if (this.pressHoldStartTimeout) {
      window.clearTimeout(this.pressHoldStartTimeout);
      this.pressHoldStartTimeout = null;
    }

    // Clear repeating interval
    if (this.pressHoldInterval) {
      window.clearInterval(this.pressHoldInterval);
      this.pressHoldInterval = null;
    }
  }

  bindUIButtons() {
    const mobileSoundBtn = this.footer.spinArea.getMobileSoundButton?.();

    const syncAggregateToMobile = () => {
      if (!mobileSoundBtn || !this.footer.hamburgerPanel.switchStates) return;
      const { music, sfx } = this.footer.hamburgerPanel.switchStates;
      const aggregateOn = !!(music || sfx);
      // Silent: panel değişimi mobile master callback tetiklememeli
      mobileSoundBtn.setState(aggregateOn, true);
    };

    this.footer.hamburgerPanel.onMusicSwitchChanged = () => {
      const { music } = this.footer.hamburgerPanel.switchStates;
       music ? this.game.audio.soundBus.unmuteBgm() : this.game.audio.soundBus.muteBgm();
      syncAggregateToMobile();
      this.footer.hamburgerPanel.emit("playButtonSound");
    };
    this.footer.hamburgerPanel.onSfxSwitchChanged = () => {
      const { sfx } = this.footer.hamburgerPanel.switchStates;
      sfx ? this.game.audio.soundBus.unmuteSfx() : this.game.audio.soundBus.muteSfx();
      syncAggregateToMobile();
      this.footer.hamburgerPanel.emit("playButtonSound");
    };

    if (mobileSoundBtn) {
      mobileSoundBtn.onToggle = (on: boolean) => {
        on ? this.game.audio.soundBus.unmuteBgm() : this.game.audio.soundBus.muteBgm();
        on ? this.game.audio.soundBus.unmuteSfx() : this.game.audio.soundBus.muteSfx();
        if (this.footer.hamburgerPanel.switchStates) {
          this.footer.hamburgerPanel.switchStates.music = on;
          this.footer.hamburgerPanel.switchStates.sfx = on;
          this.footer.hamburgerPanel.updateSwitchStates?.(this.getCurrentSpeedMode?.());
        }
        syncAggregateToMobile();
        this.footer.hamburgerPanel.emit("playButtonSound");
      };
      syncAggregateToMobile();
    }

    // Speed mode bindings
    this.footer.spinArea.gameSpeed.onPress.connect(() => {
      this.setSpeedMode(); // Döngüsel geçiş
    });

    this.footer.autoPlayPanel.quickSwitch.onPress.connect(() => {
      this.setSpeedMode("quick");
    });

    this.footer.autoPlayPanel.turboSwitch.onPress.connect(() => {
      this.setSpeedMode("turbo");
    });

    this.footer.autoPlayPanel.skipSwitch.onPress.connect(() => {
      this.setSkipSwitch();
    });

    this.footer.hamburgerPanel.quickSwitch.on("pointertap", () => {
      this.setSpeedMode("quick");
      this.footer.hamburgerPanel.emit("playButtonSound");
    });

    this.footer.hamburgerPanel.turboSwitch.on("pointertap", () => {
      this.setSpeedMode("turbo");
      this.footer.hamburgerPanel.emit("playButtonSound");
    });

    this.footer.hamburgerPanel.cheatsButton.onPress.connect(() => {
      this.footer.hamburgerPanel.emit("close");
      // game.slot type isn't declared on BaseGame typings; guard + cast
      (this.game as any)?.slot?.openCheatTool?.();
    });

    this.footer.hamburgerPanel.historyButton.onPress.connect(() => {
      this.footer.hamburgerPanel.emit("close");
      setTimeout(() => {
        BetHistory.showHideBetHistory();
      }, 0);
    });

    this.footer.hamburgerPanel.homeButton.onPress.connect(() => {
      this.footer.hamburgerPanel.emit("close");
      console.log("HOME BUTTON PRESSED");
    });

    // spin button
    this.footer.spinArea.spinButton.onPress.connect(() => {
      this.actor.send({ type: "UI_SPIN_TRIGGERED" });
      this.footer.spinArea.spinButton.visible = false; // Hide spin button after press
      this.footer.spinArea.forceStopButton.visible = true; // Show force stop button
    });

    // force stop button
    this.footer.spinArea.forceStopButton.onPress.connect(() => {
      if (
        this.isAutoplayActive &&
        this.footer.spinArea.forceStopButton.enabled
      ) {
        this.triggerStopAutoplay();
      } else {
        this.spinForceStop();
      }
    });

    // bind bet panel buttons with press and hold
    this.footer.betPanel.betLevelIncButton.onPress.connect(() => {
      this.onBetInteraction("betLevel", "inc");
    });
    this.footer.betPanel.betLevelIncButton.view.on("pointerdown", () => {
      this.startPressHold("betLevel", "inc");
    });
    this.footer.betPanel.betLevelIncButton.view.on("pointerup", () => {
      this.stopPressHold();
    });
    this.footer.betPanel.betLevelIncButton.view.on("pointerupoutside", () => {
      this.stopPressHold();
    });

    this.footer.betPanel.betLevelDecButton.onPress.connect(() => {
      this.onBetInteraction("betLevel", "dec");
    });
    this.footer.betPanel.betLevelDecButton.view.on("pointerdown", () => {
      this.startPressHold("betLevel", "dec");
    });
    this.footer.betPanel.betLevelDecButton.view.on("pointerup", () => {
      this.stopPressHold();
    });
    this.footer.betPanel.betLevelDecButton.view.on("pointerupoutside", () => {
      this.stopPressHold();
    });

    this.footer.betPanel.coinIncButton.onPress.connect(() => {
      this.onBetInteraction("coinValue", "inc");
    });
    this.footer.betPanel.coinIncButton.view.on("pointerdown", () => {
      this.startPressHold("coinValue", "inc");
    });
    this.footer.betPanel.coinIncButton.view.on("pointerup", () => {
      this.stopPressHold();
    });
    this.footer.betPanel.coinIncButton.view.on("pointerupoutside", () => {
      this.stopPressHold();
    });

    this.footer.betPanel.coinDecButton.onPress.connect(() => {
      this.onBetInteraction("coinValue", "dec");
    });
    this.footer.betPanel.coinDecButton.view.on("pointerdown", () => {
      this.startPressHold("coinValue", "dec");
    });
    this.footer.betPanel.coinDecButton.view.on("pointerup", () => {
      this.stopPressHold();
    });
    this.footer.betPanel.coinDecButton.view.on("pointerupoutside", () => {
      this.stopPressHold();
    });

    this.footer.betPanel.totalIncButton.onPress.connect(() => {
      this.onBetInteraction("betAmount", "inc");
    });
    this.footer.betPanel.totalIncButton.view.on("pointerdown", () => {
      this.startPressHold("betAmount", "inc");
    });
    this.footer.betPanel.totalIncButton.view.on("pointerup", () => {
      this.stopPressHold();
    });
    this.footer.betPanel.totalIncButton.view.on("pointerupoutside", () => {
      this.stopPressHold();
    });

    this.footer.betPanel.totalDecButton.onPress.connect(() => {
      this.onBetInteraction("betAmount", "dec");
    });
    this.footer.betPanel.totalDecButton.view.on("pointerdown", () => {
      this.startPressHold("betAmount", "dec");
    });
    this.footer.betPanel.totalDecButton.view.on("pointerup", () => {
      this.stopPressHold();
    });
    this.footer.betPanel.totalDecButton.view.on("pointerupoutside", () => {
      this.stopPressHold();
    });

    this.footer.spinArea.betControl.upButton.onPress.connect(() => {
      this.onBetInteraction("betAmount", "inc");
    });
    this.footer.spinArea.betControl.upButton.view.on("pointerdown", () => {
      this.startPressHold("betAmount", "inc");
    });
    this.footer.spinArea.betControl.upButton.view.on("pointerup", () => {
      this.stopPressHold();
    });
    this.footer.spinArea.betControl.upButton.view.on("pointerupoutside", () => {
      this.stopPressHold();
    });

    this.footer.spinArea.betControl.downButton.onPress.connect(() => {
      this.onBetInteraction("betAmount", "dec");
    });
    this.footer.spinArea.betControl.downButton.view.on("pointerdown", () => {
      this.startPressHold("betAmount", "dec");
    });
    this.footer.spinArea.betControl.downButton.view.on("pointerup", () => {
      this.stopPressHold();
    });
    this.footer.spinArea.betControl.downButton.view.on(
      "pointerupoutside",
      () => {
        this.stopPressHold();
      }
    );

    this.footer.autoPlayPanel.slider.onUpdate.connect((spinValue: number) => {
      const spinCount = Math.round(spinValue);
      this.footer.autoPlayPanel.updateSpinCountText(spinCount);
    });

    const autoPlayButton =
      this.footer.spinArea.getAutoPlayButton() as AutoPlayButton;
    autoPlayButton.onPress.connect(() => {
      this.footer.closeAllPanelsExcept(this.footer.autoPlayPanel);
      if (this.isAutoplayActive) {
        this.triggerStopAutoplay();
      } else {
        this.footer.autoPlayPanel.visible = !this.footer.autoPlayPanel.visible;
        this.footer.autoPlayPanel.reset();
        if(isMobile.any && isPortrait()) {
          this.setSpinAreaVisible(!this.footer.autoPlayPanel.visible);
        }
      }
    });

    // bind autoplay button
    this.footer.autoPlayPanel.startButton.onPress.connect(() => {
      const settings: Slot.AutoplaySettings = {
        count: this.footer.autoPlayPanel.count,
        winLimit: null,
        lossLimit: null,
        stopOnFeature: false,
      };

      this.actor.send({ type: "UI_START_AUTOPLAY_TRIGGERED", settings });
      autoPlayButton.updateTexture(true);
      this.footer.closeAllPanelsExcept(null);
      this.setSpinAreaVisible(true);
    });
  }

  spinForceStop() {
    // console.log("Force stop button pressed", this.isAutoplayActive);
    if (this.footer.spinArea.forceStopButton.enabled) {
      this.actor.send({ type: "UI_FORCE_STOP_TRIGGERED" });
      this.footer.spinArea.forceStopButton.enabled = false; // Disable force stop button after press
    }
  }

  syncBuyFeatureButtonState(extraConditions: boolean = true) {
    if (this.buyFeatureButton) {
      let enabled = false;
      if (this.availableBuyFeatures.length === 1) {
        // Only one buy feature: check its price
        const price = this.availableBuyFeatures[0].basePrice * this.betAmount;

        enabled = price <= this.credits && extraConditions;
      } else if (this.availableBuyFeatures.length > 1) {
        // At least one buy feature is affordable?
        const hasAffordable = this.availableBuyFeatures.some(
          (f) => f.basePrice * this.betAmount <= this.credits
        );
        enabled = hasAffordable && extraConditions;
      } else {
        // No available features means button should be disabled
        enabled = false;
      }

      this.buyFeatureButton.setEnabled(enabled);
      this.buyFeatureConfirmation.setEnabled({ confirm: enabled });
    }
  }

  // Font yükleme durumunu kontrol eden yardımcı fonksiyon
  static checkFontsLoaded() {
    const fontFamilies = [
      "DIN Offc Pro",
      "HeadingNowNarrow",
      "HeadingNowText",
      "HeadingNowWide",
    ];

    fontFamilies.forEach((fontFamily) => {
      const testElement = document.createElement("div");
      testElement.style.fontFamily = fontFamily;
      testElement.style.fontWeight = "700";
      testElement.style.position = "absolute";
      testElement.style.left = "-9999px";
      testElement.textContent = `Test ${fontFamily}`;
      document.body.appendChild(testElement);

      const computedStyle = window.getComputedStyle(testElement);
      console.log(`${fontFamily} font kontrol:`, {
        fontFamily: computedStyle.fontFamily,
        fontWeight: computedStyle.fontWeight,
      });

      document.body.removeChild(testElement);
    });

    console.log(
      "Yüklenen fontlar:",
      Array.from(document.fonts).map((f) => `${f.family} ${f.weight}`)
    );
  }

  static async loadFonts() {
    try {
      const baseUrl = "https://cdn.aperion.dev/stage-ui/assets/fonts/";

      // DIN Offc Pro fontları
      const dinRegular = new FontFace(
        "DIN Offc Pro",
        `url('${baseUrl}DINOffcPro.woff2')`,
        {
          weight: "400",
          style: "normal",
        }
      );

      const dinBold = new FontFace(
        "DIN Offc Pro",
        `url('${baseUrl}DINOffcPro-Bold.woff2')`,
        {
          weight: "700",
          style: "normal",
        }
      );

      const dinBlack = new FontFace(
        "DIN Offc Pro",
        `url('${baseUrl}DINOffcPro-Black.woff2')`,
        {
          weight: "900",
          style: "normal",
        }
      );

      // HeadingNow fontları (resimdeki dosyalara göre)
      const headingNowRegular = new FontFace(
        "HeadingNowNarrow",
        `url('${baseUrl}HeadingNowNarrow-54NarrRegular.woff2')`,
        {
          weight: "400",
          style: "normal",
        }
      );

      const headingNowBold = new FontFace(
        "HeadingNowNarrow",
        `url('${baseUrl}HeadingNowNarrow-56NarrBold.woff2')`,
        {
          weight: "700",
          style: "normal",
        }
      );

      const headingNowBlack = new FontFace(
        "HeadingNowNarrow",
        `url('${baseUrl}HeadingNowNarrow-57NarrBlack.woff2')`,
        {
          weight: "900",
          style: "normal",
        }
      );

      const headingNowHeavy = new FontFace(
        "HeadingNowNarrow",
        `url('${baseUrl}HeadingNowNarrow-58NarrHeavy.woff2')`,
        {
          weight: "950",
          style: "normal",
        }
      );

      // HeadingNowText fontları
      const headingNowTextBold = new FontFace(
        "HeadingNowText",
        `url('${baseUrl}HeadingNowText-Bold.woff2')`,
        {
          weight: "700",
          style: "normal",
        }
      );

      const headingNowTextRegular = new FontFace(
        "HeadingNowText",
        `url('${baseUrl}HeadingNowText-Regular.woff2')`,
        {
          weight: "400",
          style: "normal",
        }
      );

      // HeadingNowWide fontları
      const headingNowWideBold = new FontFace(
        "HeadingNowWide",
        `url('${baseUrl}HeadingNowWide-Bold.woff2')`,
        {
          weight: "900",
          style: "normal",
        }
      );

      // Font'ları yükle
      await Promise.all([
        dinRegular.load(),
        dinBold.load(),
        dinBlack.load(),
        headingNowRegular.load(),
        headingNowBold.load(),
        headingNowBlack.load(),
        headingNowHeavy.load(),
        headingNowTextBold.load(),
        headingNowTextRegular.load(),
        headingNowWideBold.load(),
      ]);

      // Document'e ekle
      document.fonts.add(dinRegular);
      document.fonts.add(dinBold);
      document.fonts.add(dinBlack);
      document.fonts.add(headingNowRegular);
      document.fonts.add(headingNowBold);
      document.fonts.add(headingNowBlack);
      document.fonts.add(headingNowHeavy);
      document.fonts.add(headingNowTextBold);
      document.fonts.add(headingNowTextRegular);
      document.fonts.add(headingNowWideBold);

      console.log(
        "Tüm fontlar başarıyla yüklendi (DIN Offc Pro + HeadingNow serisi)"
      );
    } catch (error) {
      console.warn("Font yükleme hatası:", error);

      // Fallback: Assets API ile yükleme
      const baseUrl = "https://cdn.aperion.dev/stage-ui/assets/fonts/";
      try {
        await Promise.all([
          Assets.load({
            src: `${baseUrl}DINOffcPro.woff2`,
            alias: "DIN Offc Pro",
          }),
          Assets.load({
            src: `${baseUrl}DINOffcPro-Bold.woff2`,
            alias: "DIN Offc Pro Bold",
          }),
          Assets.load({
            src: `${baseUrl}DINOffcPro-Black.woff2`,
            alias: "DIN Offc Pro Black",
          }),
          Assets.load({
            src: `${baseUrl}HeadingNowNarrow-54NarrRegular.woff2`,
            alias: "HeadingNowNarrow Regular",
          }),
          Assets.load({
            src: `${baseUrl}HeadingNowNarrow-56NarrBold.woff2`,
            alias: "HeadingNowNarrow Bold",
          }),
          Assets.load({
            src: `${baseUrl}HeadingNowNarrow-57NarrBlack.woff2`,
            alias: "HeadingNowNarrow Black",
          }),
          Assets.load({
            src: `${baseUrl}HeadingNowNarrow-58NarrHeavy.woff2`,
            alias: "HeadingNowNarrow Heavy",
          }),
          Assets.load({
            src: `${baseUrl}HeadingNowText-Bold.woff2`,
            alias: "HeadingNowText Bold",
          }),
          Assets.load({
            src: `${baseUrl}HeadingNowText-Regular.woff2`,
            alias: "HeadingNowText Regular",
          }),
          Assets.load({
            src: `${baseUrl}HeadingNowWide-Bold.woff2`,
            alias: "HeadingNowWide Bold",
          }),
        ]);
        console.log("Fontlar Assets API ile yüklendi");
      } catch (fallbackError) {
        console.error("Font yükleme tamamen başarısız:", fallbackError);
      }
    }
  }

  /**
   * Cleanup method to clear any running timers
   */
  public destroy() {
    this.stopPressHold();
    super.destroy();
  }

  triggerStopAutoplay() {
    const autoPlayButton =
      this.footer.spinArea.getAutoPlayButton() as AutoPlayButton;
    this.actor.send({ type: "UI_STOP_AUTOPLAY_TRIGGERED" });
    autoPlayButton.enabled = false;
    //autoPlayButton.updateTexture(false);
  }

  /**
   * Generic visibility controller.
   * target:
   *  - "all": entire UI root container
   *  - "spinArea": only footer.spinArea (spin, speed, autoplay, bet control cluster)
   *  - "infoTextArea": only footer.infoTextArea (win/balance info messages)
   */
  public setVisibility(
    target: "all" | "spinArea" | "infoTextArea",
    visible: boolean
  ) {
    switch (target) {
      case "all":
        this.visible = visible;
        break;
      case "spinArea":
        (this.footer as any)?.spinArea && ((this.footer as any).spinArea.visible = visible);
        break;
      case "infoTextArea":
        (this.footer as any)?.infoTextArea && ((this.footer as any).infoTextArea.visible = visible);
        break;
    }
  }

  public setUIVisible(visible: boolean) { this.setVisibility("all", visible); }
  public setSpinAreaVisible(visible: boolean) { this.setVisibility("spinArea", visible); }
  public setInfoTextVisible(visible: boolean) { this.setVisibility("infoTextArea", visible); }
  public setTurboSwitchVisible(visible: boolean) {
    if (visible) {
      this.footer.hamburgerPanel.showTurboCompact();
    } else {
      this.footer.hamburgerPanel.hideTurboCompact();
    }
  }
}
