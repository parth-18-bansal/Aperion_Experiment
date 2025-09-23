import { Spine } from "@esotericsoftware/spine-pixi-v8";
import { BitmapFont, Container, Graphics, isMobile, TextStyle } from "pixi.js";
import { Engine } from "game-engine";
import { Slot } from "slot-game-engine";
import { gsap } from "gsap";
import { isPortrait } from "game-engine/src/utils";

export class FreeSpinIntroScreen
  extends Container
  implements
  Engine.IRunnerVisual<
    Slot.FreeSpinIntroRunnerData,
    Slot.FreeSpinIntroRunnerOptions
  > {
  private bgOverlay!: Graphics;
  private fsIntroSpine!: Spine;
  private gameClickLayer: Graphics;
  stormSpine!: Spine;
  private totalFreeSpinCount!: Engine.LocalizedBitmapText;
  private pressAnywhereLabel!: InstanceType<typeof Engine.LocalizedText>;
  private onInteraction: (type: string, data: any) => void = () => { };

  constructor(gameClickLayer: Graphics) {
    super(); // Centered position
    this.gameClickLayer = gameClickLayer;
    Engine.Utils.ApplyCommonProperties(this, {
      visible: false,
      components: [
        {
          type: Engine.Components.ResizeComponent,
          params: [
            {
              desktop: {
                landscape: { scale: 0.9, x: 960, y: 510 },
              },
              mobile: {
                landscape: { scale: 1, x: 970, y: 540 },
                portrait: { scale: 0.62, x: 540, y: 1170 },
              },
              tablet: {
                landscape: { scale: 1, x: 970, y: 540 },
                portrait: { scale: 1, x: 540, y: 1170 },
              },
            },
          ],
        },
        {
          type: Engine.Components.GridPositionComponent,
          params: [
            {
              portrait: { columns: 2, rows: 2, position: { x: 0, y: 0 } },
            },
          ],
        },
      ],
    });
    // Install a font for global use
    BitmapFont.install({
      name: "congFont",
      style: {
        fontFamily: "cong-font",
        fontSize: 72,
      },
      resolution: 2, // Resolution is set here
    });
    this.create();
  }

  private async create() {
    this.bgOverlay = new Graphics();
    this.bgOverlay
      .roundRect(
        0,
        0,
        this.game.renderer.screen.width + 2000,
        this.game.renderer.screen.height + 2000,
        0
      )
      .fill({ color: 0x000000, alpha: 0.7 }); // #000c = rgba(0,0,0,0.8);
    this.bgOverlay.pivot.set(
      this.bgOverlay.width / 2,
      this.bgOverlay.height / 2
    );

    this.fsIntroSpine = this.game.make.spine({
      atlas: "main/free_spin_intro/eng/congratulation.atlas",
      skeleton: "main/free_spin_intro/eng/congratulation.json",
      x: 0,
      y: 0,
    });

    this.stormSpine = this.game.make.spine({
      atlas: "transition.atlas",
      skeleton: "transition.json",
      components: [
        {
          type: Engine.Components.ResizeComponent,
          params: [
            {
              desktop: {
                landscape: { scale: 1.5 },
              },
              mobile: {
                landscape: { scale: 1.5 },
                portrait: { scale: 4 },
              },
              tablet: {
                landscape: { scale: 1.5 },
                portrait: { scale: 4 },
              },
            },
          ],
        },
        {
          type: Engine.Components.GridPositionComponent,
          params: [
            {
              landscape: { columns: 2, rows: 2, position: { x: -1, y: -1 } },
              portrait: { columns: 2, rows: 2, position: { x: -1, y: -0.9 } },
            },
          ],
        },
      ],
    });

    this.totalFreeSpinCount = new Engine.LocalizedBitmapText(
      "0",
      {},
      new TextStyle({
        fontFamily: "cong-font",
        fontSize: 72,
        fill: "#ffffff",
        letterSpacing: -30,
      })
    );
    this.totalFreeSpinCount.anchor.set(0.5, 0.5);
    this.totalFreeSpinCount.position.set(-15, 40);
    this.totalFreeSpinCount.visible = false;

    this.pressAnywhereLabel = new Engine.LocalizedText(
      "game.press_anywhere_to_continue",
      {},
      new TextStyle({
        fontFamily: "DIN Offc Pro",
        fontWeight: "900",
        fill: "#fff",
        fontSize: 26,
        align: "center",
      })
    );
    this.pressAnywhereLabel.anchor.set(0.5, 0.5);
    this.pressAnywhereLabel.visible = false;
    this.pressAnywhereLabel.position.set(0, 300);
    if (isMobile.any) {
      Engine.Utils.ApplyCommonProperties(this.pressAnywhereLabel, {
        components: [
          {
            type: Engine.Components.GridPositionComponent,
            params: [
              {
                landscape: {
                  columns: 2,
                  rows: 2,
                  position: { x: -1, y: -0.45 },
                },
                portrait: {
                  columns: 2,
                  rows: 2,
                  position: { x: -1, y: -0.73 },
                },
              },
            ],
          },
        ],
      });

      Engine.Utils.ApplyCommonProperties(this.totalFreeSpinCount, {
        components: [
          {
            type: Engine.Components.GridPositionComponent,
            params: [
              {
                landscape: {
                  columns: 2,
                  rows: 2,
                  position: { x: -1.02, y: -0.92 },
                },
                portrait: {
                  columns: 2,
                  rows: 2,
                  position: { x: -1.02, y: -0.97 },
                },
              },
            ],
          },
        ],
      });
    }

    this.addChild(
      this.bgOverlay,
      this.fsIntroSpine,
      this.totalFreeSpinCount,
      this.pressAnywhereLabel,
      this.stormSpine
    );
  }

  initialize(
    config?: Slot.FreeSpinIntroRunnerOptions | undefined,
    onInteraction?: (type: string, data: any) => void
  ) {
    console.log("Free Spin Intro Popup initialized with config:", config);
    this.onInteraction = onInteraction || (() => { });
  }

  /** To show Free Spin Intro popup */
  async show(data: Slot.FreeSpinIntroRunnerData): Promise<void> {
    await this.playScatterAnimation();
    await Engine.Utils.WaitFor(0.5);
    return await new Promise<void>((resolve) => {
      if (isMobile.any) {
        this.game.slot.ui.setVisibility("infoTextArea", !isPortrait());
        this.game.slot.ui.setVisibility("spinArea", false);
      }
      gsap.to(this.bgOverlay, {
        alpha: 0.7,
        duration: 0.35,
        ease: "linear.none",
        onStart: () => {
          this.bgOverlay.alpha = 0;
          this.bgOverlay.visible = true;
        },
      });
      this.totalFreeSpinCount.updateText(`${data.totalFreeSpin}`);
      this.fsIntroSpine.state.clearListeners();
      this.fsIntroSpine.state.setAnimation(0, "start", false);
      this.fsIntroSpine.state.addListener({
        complete: (): void => {
          this.fsIntroSpine.state.setAnimation(0, "loop", true);
        },
      });
      this.fsIntroSpine.visible = true;
      this.bgOverlay.visible = true;
      this.visible = true;
      setTimeout(() => {
        this.playTextAnimation(resolve);
      }, 400);
      this.game.audio.soundBus.StopBGM("sounds/music/GoldenEgypt_BaseSpinMusic.wav", 'bgm');
      this.game.audio.soundBus.PlayBGM("sounds/fx/GoldenEgypt_BonusIntro_Loop.wav", 'bgm', {
        loop: true,
        volume: 1,
      });
      this.game.audio.soundBus.PlaySFX(
        "sounds/fx/AnubisDream_CongratsWindowOpen.wav",
        'sfx',
        {}
      );
    });
  }

  /** To play scatter animation */
  protected async playScatterAnimation(): Promise<void> {
    await new Promise<void>((resolve) => {
      let isScatter: boolean = false;
      let completedCount: number = 0;
      let total: number = 0;
      this.game.slot.machine.reels.forEach((reel: any) => {
        reel.symbolList.forEach((symbol: any) => {
          if (parseInt(symbol.id) === 9) {
            isScatter = true;
            total++;
            symbol.playAnim("win-cascade", false, () => {
              completedCount++;
              if (completedCount === total) {
                // All symbol animations are complete
                resolve();
              }
            });
          }
        });
      });

      if (isScatter) {
        //play bell sound here
        this.game.audio.soundBus.PlaySFX("sounds/fx/FGScatter_BellSound.wav", 'sfx', {});
      }
    });
  }
  /** To hide Free Spin Intro popup */
  hide(): void {
    this.fsIntroSpine.state.clearListeners();
    //this.visible = false;
  }

  protected playTextAnimation(resolve: any): void {
    // play text animation
    this.totalFreeSpinCount.alpha = 0;
    gsap.to(this.totalFreeSpinCount, {
      alpha: 1,
      duration: 0.35,
      ease: "linear.none",
      onStart: () => {
        this.totalFreeSpinCount.visible = true;
      },
      onComplete: () => {
        this.playAnywhereLabelAnimation(resolve);
      },
    });
  }

  protected playAnywhereLabelAnimation(resolve: any): void {
    // play text animation
    const { context } = this.game.slot.actor.getSnapshot();
    const waitTimeForSkip = 750;
    gsap.to(this.pressAnywhereLabel, {
      scale: 1.2,
      duration: 0.25,
      delay: 0.25,
      ease: "linear.none",
      onStart: () => {
        this.pressAnywhereLabel.visible = true;
        const pointerFunc = (): void => {
          document.removeEventListener("pointerup", pointerFunc);
          resolve();
          this.game.audio.soundBus.PlaySFX(
            "sounds/fx/AnubisDream_BonusWindowClose.wav",
            'sfx',
            {}
          );
        };
        this.gameClickLayer.once("pointerup", pointerFunc);
      },
      onComplete: () => {
        if (context.skipSwitch && context.isAutoplayActive == true) {
          setTimeout(() => {
            resolve();
          }, waitTimeForSkip);
        }
      },
    });
  }
  public resize(): void {
    // Resize logic if needed
    if (this.visible) {
      if (isMobile.any) {
        this.game.slot.ui.setVisibility("infoTextArea", !isPortrait());
      }
    }
  }
  /** To play Storm animation */
  public async playStormAnimaion(): Promise<void> {
    new Promise<void>((resolve) => {
      this.stormSpine.state.setAnimation(0, "transition", false);
      this.stormSpine.state.addListener({
        complete: (): void => {
          this.stormSpine.state.clearListeners();
          this.visible = false;
          resolve();
        },
      });
      this.stormSpine.state.addListener({
        event: (track, event): void => {
          if (event.data.name === "full_screen") {
            this.emit("START_ASSET_TRANSITIONS");
            this.bgOverlay.visible = false;
            this.totalFreeSpinCount.visible = false;
            this.pressAnywhereLabel.visible = false;
            this.fsIntroSpine.state.clearListeners();
            this.fsIntroSpine.state.setEmptyAnimation(0);
            this.fsIntroSpine.visible = false;
            setTimeout(() => {
              this.game.slot.ui.setVisibility("infoTextArea", true);
            }, 100);
          }
        },
      });
    });
  }
}
